/* ==========================================================================
   AI — 小芽AI service layer.
   Two modes:
   1. LLM mode  — user connects their own OpenAI-compatible /chat/completions
                  endpoint (URL + key + model stored only on this device).
                  Powers free-form Q&A (incl. voice→text) and photo analysis
                  (any vision-capable model).
   2. Offline   — built-in pregnancy knowledge base compiled from ACOG / NHS /
                  WHO / Chinese DRIs public guidance. No network needed.
   Nothing is sent anywhere unless the user explicitly configures a service.
   ========================================================================== */
(function (global) {
  'use strict';

  // --- Config -----------------------------------------------------------------
  const cfg = () => (Store.state.settings.ai = Store.state.settings.ai || { endpoint: '', key: '', model: '' });
  const configured = () => !!(cfg().endpoint && cfg().key && cfg().model);

  async function chat(messages, { temperature = 0.4 } = {}) {
    const c = cfg();
    if (!configured()) throw new Error('not configured');
    let res;
    try {
      res = await fetch(c.endpoint.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key },
        body: JSON.stringify({ model: c.model, messages, temperature }),
      });
    } catch (e) { throw new Error('network: ' + (e && e.message ? e.message : e)); }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + (body ? ' · ' + body.replace(/\s+/g, ' ').slice(0, 120) : ''));
    }
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('empty response');
    return String(text).trim();
  }

  // --- Prompting ----------------------------------------------------------------
  function systemPrompt() {
    const st = Store.state;
    const g = Engine.gestAge(st.profile);
    const lines = [
      '你是「小芽AI」，一款科学、温和的孕期助手。',
      '用户情况：' + (g ? `孕 ${g.weeks} 周⁺${g.rem} 天（孕${ ['', '早', '中', '晚'][g.trimester] }期，采用${t('region.' + st.settings.region)}）` : '孕周未设置'),
      st.settings.gdmMode ? '用户开启了妊娠期糖尿病（GDM）模式。' : '',
      statusContext(),
      '回答规则：',
      '1. 依据循证医学（ACOG、NHS、NICE、WHO、中国 DRIs/WS/T 801 等）给出直接、具体、可执行的建议，并简要解释科学原因。',
      '2. 涉及出血、破水、剧烈腹痛、胎动明显减少、剧烈头痛/视物模糊、抽搐、高热等情况时，第一句就明确建议立即就医。',
      '3. 不做诊断，不开处方；用药问题建议咨询医生或药师；不确定时如实说明。',
      '4. 用用户使用的语言回答（中文问中文答，英文问英文答）；简洁分点，控制在 250 字以内；结尾不用寒暄。',
    ].filter(Boolean);
    return lines.join('\n');
  }
  function statusContext() {
    try {
      const st = Store.state, today = Store.todayStr();
      const intake = Engine.dayIntake(st, today), tg = Engine.nutrientTargets(st);
      const min = Engine.weekMinutes(st);
      return `当前记录：今日已摄入约 ${Math.round(intake.kcal)}/${tg.kcal} kcal、蛋白质 ${Math.round(intake.protein)}/${tg.protein} g；本周运动 ${min}/${Standards.THRESHOLDS.activityMinPerWeek} 分钟。`;
    } catch (e) { return ''; }
  }

  // Free-form Q&A with photo (vision-capable models). history: prior turns [{role, text}].
  async function chatWithHistory(text, photoDataUrl, history = []) {
    const msgs = [{ role: 'system', content: systemPrompt() }];
    for (const m of history.slice(-8)) {
      if (m.text) msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text).slice(0, 900) });
    }
    msgs.push({ role: 'user', content: photoDataUrl ? [
      { type: 'text', text: text || t('ai.photo') },
      { type: 'image_url', image_url: { url: photoDataUrl, detail: 'auto' } },
    ] : text });
    return await chat(msgs, { temperature: 0.4 });
  }

  // Small connectivity test for the settings page.
  async function test() { return await chat([{ role: 'user', content: 'Reply with exactly: OK' }], { temperature: 0 }); }

  // --- Food photo analysis --------------------------------------------------------
  function parseJSONLoose(raw) {
    let s = String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  }
  async function analyzeFood(dataUrl) {
    const prompt = [
      'You are a nutrition vision assistant for a pregnancy tracking app.',
      'Identify every distinct food or dish visible in the photo. Ignore packaging text claims; estimate from visual portion size.',
      'For each item output: name (common name, 中文优先，otherwise English), grams (estimated edible portion), and kcal / protein / carb / fat / fiber for THAT portion, using standard tables (USDA / 中国食物成分表).',
      'Be conservative with cooking oil and sauces; include drinks; split mixed dishes into components when possible.',
      'Respond with ONLY minified JSON, no markdown, no commentary: {"items":[{"name":"米饭","grams":150,"kcal":174,"protein":3.9,"carb":38.9,"fat":0.5,"fiber":0.5}]}',
    ].join('\n');
    const raw = await chat([
      { role: 'system', content: prompt },
      { role: 'user', content: [{ type: 'text', text: '分析这张餐食照片' }, { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } }] },
    ], { temperature: 0.2 });
    const data = parseJSONLoose(raw);
    const items = (data && (data.items || data.foods || data.result)) || [];
    return (Array.isArray(items) ? items : [])
      .filter(it => it && typeof it === 'object' && it.name)
      .slice(0, 12)
      .map(it => ({
        name: String(it.name).slice(0, 40),
        grams: clamp(+it.grams || 0, 1, 2000),
        kcal: clamp(+it.kcal || 0, 0, 3500),
        protein: clamp(+it.protein || 0, 0, 400),
        carb: clamp(+it.carb || 0, 0, 700),
        fat: clamp(+it.fat || 0, 0, 350),
        fiber: clamp(+it.fiber || 0, 0, 150),
      }))
      .filter(it => it.grams > 0);
  }
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // --- Offline pregnancy knowledge base ---------------------------------------------
  // Compiled from public guidance (ACOG / NHS / WHO / 中国 DRIs). Keyword-scored.
  const KB = [
    {
      keys: ['化妆', '护肤', '面膜', '精华', '防晒', 'skincare', 'cosmetic', 'makeup', 'sunscreen', 'retinol', '视黄醇', '维a酸', 'a酸', 'tretinoin', 'adapalene', '水杨酸', 'salicylic', '氢醌', '对苯二酚', 'hydroquinone', '染发', '烫发', 'hair', '美甲', 'nail', '精油', 'essential oil', '美白', 'whitening', '气垫', '口红'],
      src: 'ACOG · NHS',
      zh: '孕期护肤化妆总原则：**基础清洁、保湿、防晒可以照常**。需要避开或暂停的：\n• 维A酸类（视黄醇 retinol、A醇/A酸、adapalene）——口服维A酸明确致畸，外用吸收虽少，稳妥起见整个孕期停用，换成维C、烟酰胺等成分；\n• 高浓度水杨酸（大面积刷酸/化学换肤）避免；洗护产品里低浓度残留偶用问题不大；\n• 氢醌（美白祛斑）、含甲醛或邻苯类的三无产品避免；\n• 大面积涂抹不明成分精油（部分精油高剂量可能刺激子宫）不建议；香薰少量闻味可以。\n染发烫发：正规产品经头皮吸收很少，但一般建议孕 12 周后再做，或选挑染（少接触头皮）并保持通风。美甲偶尔做可以，选通风环境、避开含甲醛树脂的产品。\n妊娠期长斑、湿疹等问题请先问皮肤科再用药。把产品成分表拍给小芽AI（连接大模型后可识别图片）可以帮你逐个成分看。',
      en: 'General rule: **cleansing, moisturiser and sunscreen are fine to continue**. Pause or avoid:\n• Vitamin A derivatives (retinol, tretinoin, adapalene) — oral isotretinoin is clearly teratogenic; topical absorption is minimal but the cautious standard advice is to stop for the whole pregnancy; use vitamin C or niacinamide instead;\n• High-strength salicylic acid peels; low concentrations in rinse-off products used occasionally are not a concern;\n• Hydroquinone and unregulated products with formaldehyde or phthalates;\n• Applying unknown essential oils over large body areas.\nHair dye: systemic absorption from regulated dyes is tiny, but many services suggest waiting until after week 12 or using highlights (little scalp contact) in a ventilated space. Manicures are fine occasionally in a well-ventilated salon.\nFor melasma or pregnancy eczema, see a dermatologist before starting any prescription. Photograph the ingredient list and send it to Sprout AI (with an LLM connected) for a per-ingredient review.',
    },
    {
      keys: ['咖啡', 'coffee', '奶茶', '茶', 'tea', '可乐', 'cola', '能量饮料', 'energy drink', '咖啡因', 'caffeine', '拿铁', '美式'],
      src: 'ACOG · NHS',
      zh: '咖啡因可以喝，**每天 ≤200 mg**：约一杯 350 ml 滴滤咖啡，或 2 小杯茶。奶茶咖啡因不低、糖更高，算进总量；能量饮料常超量且含其他刺激物，建议整个孕期避免。孕期代谢咖啡因变慢，过量与低出生体重、流产风险相关。本 App「饮食」页会自动累计你记录饮品的咖啡因并给上限提醒。',
      en: 'Yes, with **≤200 mg caffeine a day**: about one 350 ml (12 oz) drip coffee or two small cups of tea. Count milk tea (caffeine and sugar) in your total; energy drinks are usually over the limit and contain other stimulants — avoid them entirely. Caffeine is cleared more slowly in pregnancy, and high intake is associated with low birth weight.',
    },
    {
      keys: ['酒', '酒精', 'alcohol', 'wine', 'beer', '啤酒', '红酒', '米酒', '醪糟', '料酒', '鸡尾酒'],
      src: 'ACOG · WHO · NHS',
      zh: '孕期**没有已知的安全饮酒剂量**。酒精能直接通过胎盘，与胎儿酒精谱系障碍（生长受限、面部异常、神经发育障碍）相关，孕早期影响最大。建议整个孕期完全避免：含料酒的菜尽量久煮让酒精挥发或改用无料酒；醪糟、酒心巧克力也算。备孕期间也建议戒。',
      en: 'There is **no known safe amount of alcohol** in pregnancy. Alcohol crosses the placenta and causes fetal alcohol spectrum disorders; risk is highest early on. Avoid completely, including dishes cooked with rice wine (or simmer long enough to evaporate), drunk-fruit desserts and liqueur chocolates. Also advisable while trying to conceive.',
    },
    {
      keys: ['生鱼片', '刺身', '寿司', 'sushi', 'sashimi', '生腌', '醉蟹', '醉虾', '溏心', '半熟', '生蛋', 'raw', '生蚝', 'oyster', '冷切', 'deli', '火腿', '培根', 'cheese', '奶酪', 'brie', 'camembert', '蓝纹', '未消毒', 'unpasteurised', '生牛乳', '生豆芽', 'sprout'],
      src: 'NHS · FDA',
      zh: '孕期免疫有变化，李斯特菌/沙门氏菌/弓形虫感染后果更重，所以对「生的」要更严格。**避免**：生鱼寿司与刺身、生腌醉蟹醉虾、溏心蛋与未全熟的肉（涮肉要全熟）、冷藏即食冷切肉和热狗（除非重新加热到冒热气）、未消毒鲜奶及用其做的软奶酪（brie/camembert/蓝纹——看标签“巴氏杀菌/pasteurised”）、生豆芽。\n**可以**：全熟海鲜和蛋、巴氏杀菌奶与酸奶、硬质奶酪、室温可达标的熟食。想吃寿司就点熟料卷（鳗鱼、熟虾、蔬菜卷、玉子烧）。',
      en: 'Pregnancy shifts your immunity, so Listeria/Salmonella/Toxoplasma hit harder. **Avoid**: raw-fish sushi and sashimi, raw-marinated crab/shrimp, runny eggs and undercooked meat, cold deli meats and hot dogs unless reheated until steaming, unpasteurised milk and soft cheeses made from it (brie, camembert, blue — check for “pasteurised”), raw sprouts.\n**Fine**: fully cooked seafood and eggs, pasteurised dairy and yogurt, hard cheeses, hot freshly-cooked food. For sushi, choose cooked rolls (eel, cooked shrimp, veg, tamago).',
    },
    {
      keys: ['鱼', 'fish', '三文鱼', 'salmon', '金枪鱼', 'tuna', '汞', 'mercury', 'dha', '海鲜', 'seafood', '虾', '蟹', 'crab', '鳕鱼', '带鱼'],
      src: 'FDA/EPA · ACOG',
      zh: '鱼类是 DHA 与优质蛋白的关键来源，**每周 2–3 次低汞鱼**（三文鱼、沙丁鱼、鳕鱼、带鱼）是被推荐的主角。**避免高汞鱼**：鲨鱼、剑鱼、大眼金枪鱼、方头鱼（鲭鱼王）；淡金枪鱼罐头每周 ≤2–3 份，长鳍金枪鱼 ≤1 份。蟹和虾必须彻底熟透——熟透可以适量吃，生腌醉蟹绝对不行；贝类（生蚝等）务必全熟。',
      en: 'Fish is the key DHA source: **2–3 servings of low-mercury fish weekly** (salmon, sardines, cod) is recommended. **Avoid high-mercury fish**: shark, swordfish, bigeye tuna, tilefish, king mackerel; light tuna ≤2–3 servings/week, albacore ≤1. Crab and shrimp are fine fully cooked — never raw-marinated; shellfish must be cooked through.',
    },
    {
      keys: ['肝', 'liver', '维生素a', 'vitamin a', '鱼肝油', '猪肝', '鹅肝'],
      src: '中国 DRIs · NHS',
      zh: '动物肝脏补铁效果好，但**孕期维生素A过量有致畸风险**。建议：每周 1–2 次、每次 ≤30–50 g 猪肝/鸭肝；不要同时叠加鱼肝油或高剂量维生素A补充剂（复合维生素按推荐量吃即可）。植物来源的β-胡萝卜素（橙黄色蔬果）没有过量风险。',
      en: 'Liver is iron-rich, but **excess preformed vitamin A is teratogenic**. Keep to 1–2 servings a week, ≤30–50 g each; do not stack cod-liver oil or high-dose vitamin A supplements on top (a standard prenatal is fine). Beta-carotene from fruit and vegetables carries no such risk.',
    },
    {
      keys: ['运动', 'exercise', '跑步', 'yoga', '瑜伽', '游泳', 'swim', '健身', 'walk', '快走', '深蹲', '锻炼', '普拉提', 'pilates', '骑行', '慢跑'],
      src: 'ACOG · 中国孕期运动专家共识 2019',
      zh: '无禁忌证时**推荐每周 ≥150 分钟中等强度运动**（快走、游泳、固定单车、孕妇瑜伽、轻力量训练），能降低妊娠期糖尿病、子痫前期和过度增重的风险，也不会增加早产。强度用“谈话测试”：能完整说话、不能唱歌。**避免**：孕中晚期仰卧超过 2–3 分钟、有跌倒/撞击风险的项目（滑雪、骑马、对抗球类）、高温瑜伽、潜水。\n出现出血、破水、规律宫缩、头晕、胸痛、小腿痛肿立即停止就医。首次使用请先完成 App「运动」里的安全筛查。',
      en: 'Without contraindications, **≥150 min/week of moderate activity** (brisk walking, swimming, stationary cycling, prenatal yoga, light strength) lowers the risk of GDM, pre-eclampsia and excess gain, and does not raise preterm birth risk. Intensity: talk test — can talk, cannot sing. **Avoid** after mid-pregnancy: >2–3 min flat on your back, fall/contact sports, hot yoga, diving.\nStop and seek care for bleeding, fluid loss, regular contractions, dizziness, chest pain or calf pain/swelling. Complete the in-app exercise safety screen first.',
    },
    {
      keys: ['药', 'medication', '感冒', '发烧', '止痛', '布洛芬', 'ibuprofen', '对乙酰氨基酚', '扑热息痛', 'paracetamol', 'acetaminophen', '抗生素', '吃药', '异维a'],
      src: 'ACOG · NHS · UKTIS',
      zh: '总原则：**不要硬扛，也不要自行乱吃药**——先告诉医生/药师你怀孕及孕周。参考信息：对乙酰氨基酚（扑热息痛）是孕期退热镇痛的首选；布洛芬等 NSAID 孕 28 周后禁用，孕早中期也需医生评估；治疗痘痘的异维A酸明确致畸，备孕起就停；青霉素类、头孢类等常见抗生素在有必要时可以安全使用，但需医生开具。慢性病药（甲功、降压、抗抑郁等）不要自行停，复诊时让医生调整。',
      en: 'Golden rule: **don\'t just push through, and don\'t self-medicate** — tell any prescriber you are pregnant and the gestational week. General information: paracetamol/acetaminophen is the first-choice analgesic; NSAIDs like ibuprofen are avoided after 28 weeks and need clinician input earlier; isotretinoin (acne) is clearly teratogenic — stop before conceiving; common antibiotics (penicillins, cephalosporins) are safe when genuinely needed but must be prescribed. Never stop chronic-disease medication on your own — have your clinician adjust it.',
    },
    {
      keys: ['疫苗', 'vaccine', '流感疫苗', 'flu', '百日咳', 'tdap', '新冠', 'covid', '破伤风'],
      src: 'ACOG · WHO · NHS',
      zh: '孕期**推荐**接种：灭活流感疫苗（任何孕周）；Tdap 百日咳疫苗（孕 27–36 周，把抗体传给宝宝）；新冠疫苗（各主要指南均推荐）。**避免**活疫苗（麻腮风、水痘等）——放到孕前或产后。破伤风、乙肝等灭活疫苗按需可接种。接种前告知孕周即可。',
      en: '**Recommended in pregnancy**: inactivated flu vaccine (any trimester), Tdap at 27–36 weeks (passes antibodies to baby), and COVID-19 vaccines per major guidelines. **Avoid live vaccines** (MMR, varicella) until after birth. Tetanus and hepatitis B (inactivated) may be given when indicated. Just tell the vaccinator your gestational week.',
    },
    {
      keys: ['猫', 'cat', '猫砂', '弓形虫', 'toxoplasma', '宠物', '狗', 'dog'],
      src: 'NHS · CDC',
      zh: '宠物可以继续养。猫的风险来自弓形虫：尽量**不亲手换猫砂**（必须换时戴手套并彻底洗手）；虫卵需要 1–5 天才有传染性，所以每天清理最安全；不让猫外出捕食、不喂生肉；园艺也戴手套。狗没有弓形虫的这一风险。孕前/孕早期可以查弓形虫抗体了解自己的免疫状态。',
      en: 'Keep your pets. For cats the concern is toxoplasmosis: avoid changing litter (wear gloves and wash hands if you must); oocysts need 1–5 days to become infectious, so daily litter changes are safest; keep cats indoors and don\'t feed raw meat; wear gloves for gardening. Dogs carry no such risk. Antibody testing before or in early pregnancy can show if you are already immune.',
    },
    {
      keys: ['温泉', '桑拿', 'sauna', '泡澡', 'hot tub', '热水澡', '汗蒸', '泡脚', '高烧', '发热'],
      src: 'ACOG · NHS',
      zh: '孕早期（尤其 3–12 周）核心体温持续超过 39 ℃ 与神经管缺陷风险升高相关。**避免**：桑拿、蒸汽房、温泉池、39 ℃ 以上热水泡浴久泡。**可以**：温水淋浴；≤38 ℃ 的短时间泡脚一般没问题。发烧本身要积极处理：物理降温 + 对乙酰氨基酚，持续 >38.5 ℃ 及时就医。',
      en: 'Sustained core temperature above 39 °C in the first trimester is linked to higher neural-tube-defect risk. **Avoid**: saunas, steam rooms, hot tubs and long very-hot baths. **Fine**: warm showers; brief foot soaks up to ~38 °C. Treat fever promptly (cooling + paracetamol) and seek care above 38.5 °C.',
    },
    {
      keys: ['孕吐', '恶心', '呕吐', 'morning sickness', 'nausea', '反胃', '干呕', '害喜'],
      src: 'ACOG · 中国孕产期膳食指南',
      zh: '约七八成孕妇有孕吐，多在 12–16 周明显缓解。**缓解方法**：少量多餐不空腹；起床前先吃几口干粮（苏打饼干）；姜（姜茶/姜糖）；避油腻和气味重的食物；冷食常比热食容易接受；维生素 B6 对部分人有效（剂量请医生确认）。\n**警示信号**：完全无法进食进水、尿量明显减少、体重下降超过孕前 5%、呕血或咖啡样物——可能是妊娠剧吐，需要就医补液和药物。',
      en: 'Nausea affects ~70–80% of pregnancies and usually eases by 12–16 weeks. **What helps**: small frequent meals, never empty; dry crackers before getting up; ginger; avoiding greasy/strong-smelling food; cold foods often go down easier; vitamin B6 helps some (dose via your clinician).\n**Red flags**: cannot keep food or fluids down, much less urine, >5% pre-pregnancy weight loss, blood in vomit — that is hyperemesis and needs medical care.',
    },
    {
      keys: ['便秘', 'constipation', '纤维', 'fibre', 'fiber', '排便', '痔疮'],
      src: '中国 DRIs · NHS',
      zh: '孕期便秘很常见（孕激素减慢肠蠕动，铁剂也加重）。**改善**：每天膳食纤维 25–30 g（全谷物、豆类、火龙果、西梅、猕猴桃）、饮水 1.5–2 L、每天快走 30 分钟、固定排便时间；本 App「饮食」页现在会统计你的膳食纤维完成度。仍无效可与医生讨论乳果糖等孕期可用缓泻剂，避免自行用刺激性泻药。痔疮：温水坐浴、别久蹲久站。',
      en: 'Constipation is common (progesterone slows the gut; iron makes it worse). **What helps**: 25–30 g fibre daily (whole grains, legumes, kiwi, prunes, dragon fruit), 1.5–2 L water, 30 min brisk walking, a regular toilet routine — the Diet tab now tracks your fibre. If that fails, ask your clinician about pregnancy-safe laxatives like lactulose; avoid stimulant laxatives self-prescribed. Haemorrhoids: warm sitz baths, avoid straining.',
    },
    {
      keys: ['失眠', '睡不着', 'sleep', 'insomnia', '睡眠', '多梦'],
      src: 'ACOG · NHS',
      zh: '孕中晚期失眠非常常见。**建议**：固定作息与起床时间；睡前 2 小时不大量进食；午睡 ≤30 分钟；左侧卧 + 孕妇枕/抱枕支撑腰腹；白天足量饮水、晚饭后限水；下午停咖啡因；睡前放下手机。长期严重失眠可与医生讨论安全干预，不建议自行服褪黑素类助眠产品。',
      en: 'Insomnia in the 2nd/3rd trimester is very common. **Helps**: fixed sleep/wake times; no big meals within 2 h of bed; naps ≤30 min; left-side lying with pillows supporting bump and back; drink well during the day, taper after dinner; no afternoon caffeine; screens off. For persistent insomnia speak to your clinician; self-prescribed melatonin-type products aren\'t advised.',
    },
    {
      keys: ['胎动', 'kicks', '动得少', 'fetal movement', '胎动少'],
      src: 'ACOG · 中国围产指南',
      zh: '孕 28 周起每天固定时间数胎动（左侧卧或静坐）：**2 小时内 ≥10 次**为 reassuring。**明显减少或 2 小时 <10 次——立即联系产科/急诊，不要等到明天**。孕晚期变化的是幅度和节奏而不是消失；每个宝宝有自己的活跃时段，重点是“和平时比有没有明显不同”。',
      en: 'From 28 weeks, count movements at a fixed daily time (left-side or seated): **≥10 within 2 hours** is reassuring. **Markedly reduced, or <10 in 2 hours — contact your maternity unit or emergency now, do not wait until tomorrow.** Late in pregnancy the *pattern* changes, not the presence; what matters is a clear change from your baby\'s usual.',
    },
    {
      keys: ['出血', '流血', 'bleeding', '破水', '羊水', 'water broke', '剧烈腹痛', '腹痛', '抽搐', 'seizure', '视物模糊', '剧烈头痛', 'severe headache', '宫缩', 'contraction'],
      src: 'ACOG · WHO',
      zh: '以下情况**请立即就医，不要等、不要先问AI**：阴道出血或流液（可能破水）；持续剧烈腹痛；未足月出现规律宫缩；剧烈头痛伴视物模糊、上腹痛或全身水肿加重；抽搐；胎动明显减少；发热 >38 ℃ 伴寒战；摔倒或腹部受撞击后。安全永远排在第一位。',
      en: 'Seek care **immediately — before asking any AI**: vaginal bleeding or fluid loss (possibly waters), persistent severe abdominal pain, regular contractions before term, severe headache with blurred vision or upper abdominal pain, seizures, clearly reduced movements, fever >38 °C with chills, or any fall/impact to the abdomen. Safety comes before anything else.',
    },
    {
      keys: ['甜味剂', '代糖', 'aspartame', '阿斯巴甜', '无糖', '零度', '赤藓糖醇', '木糖醇', '三氯蔗糖', 'sweetener'],
      src: 'FDA · EFSA · NHS',
      zh: '常见许可甜味剂（阿斯巴甜、三氯蔗糖、安赛蜜、甜菊糖苷）在许可用量内孕期是安全的；**阿斯巴甜例外人群：苯丙酮尿症（PKU）**。无糖饮料可以喝，但别替代水；赤藓糖醇大量摄入的长期证据还在累积，适量即可。最推荐的还是白水、淡柠檬水、无糖气泡水。',
      en: 'Permitted sweeteners (aspartame, sucralose, acesulfame-K, stevia) are safe at permitted intakes; **aspartame must be avoided only with PKU**. Diet drinks are fine but shouldn\'t replace water; evidence on large amounts of erythritol is still maturing, so moderation. Best choices remain water, sparkling water, water with lemon.',
    },
    {
      keys: ['中药', '草药', 'herbal', '花茶', '凉茶', '当归', '益母草', '藏红花', '补品', '燕窝', '阿胶', '海参', '人参'],
      src: 'NHS · 中国孕产期膳食指南',
      zh: '成分不明的草本茶、中药方和动物源补品（燕窝、阿胶“补气血”证据有限）**不建议孕期常规使用**——不少草药有活血或成分不明的问题。确有需要（感冒调理等）请到正规中医机构并主动告知孕周。有明确证据的是：叶酸、铁、钙、碘、DHA 按 App 内目标补足，比昂贵的补品更重要。',
      en: 'Herbal teas, traditional formulas and animal-derived tonics of unclear composition (bird\'s nest, donkey-hide gelatin — limited evidence) are **not recommended routinely in pregnancy**; some herbs are uterotonic or simply unstandardised. If you genuinely need one, see a licensed practitioner and tell them your gestational week. The evidence-backed “supplements” are folate, iron, calcium, iodine and DHA at your in-app targets.',
    },
  ];

  function trafficHit(q) {
    const ql = q.toLowerCase();
    const variant = Standards.region(Store.state.settings.region).dietVariant;
    const lists = [['go', 'd.tl.go', Content.TRAFFIC.go], ['mod', 'd.tl.mod', Content.TRAFFIC.mod[variant]], ['stop', 'd.tl.stop', Content.TRAFFIC.stop[variant]]];
    for (const [key, labelKey, arr] of lists) {
      for (const it of arr) {
        if ((it.zh && q.includes(it.zh)) || (it.en && ql.includes(String(it.en).toLowerCase()))) {
          return { key, labelKey, item: it };
        }
      }
    }
    return null;
  }

  // Score topics by keyword hits; answer with the best match.
  function offlineAnswer(question) {
    const q = String(question || '').trim();
    const ql = q.toLowerCase();
    let best = null, bestScore = 0;
    for (const topic of KB) {
      let s = 0;
      for (const k of topic.keys) if (ql.includes(k.toLowerCase())) s += k.length >= 3 ? 2 : 1;
      if (s > bestScore) { bestScore = s; best = topic; }
    }
    const hit = trafficHit(q);
    let head = '';
    if (hit) {
      const verdict = t(hit.labelKey);
      head = `📌 App 饮食红绿灯把「${hit.item.zh}」归为 *${verdict}*：${UI.L(hit.item.why)}。\n\n`;
    }
    if (best) {
      const body = I18N.lang === 'zh' ? best.zh : best.en;
      return { text: head + body, src: best.src, matched: true };
    }
    const generic = I18N.lang === 'zh'
      ? '这个问题超出内置知识库的范围。孕期通用原则供参考：\n• 饮食：避免生食、酒精、高汞鱼、未消毒奶制品；保证叶酸/铁/钙/碘/DHA。\n• 运动：无禁忌证时保持每周 ≥150 分钟中等强度。\n• 用药与治疗：任何用药先告知医生你在孕期。\n• 急症信号：出血、破水、剧烈腹痛、胎动明显减少、剧烈头痛——立即就医。\n\n可以换个具体问法（如「孕妇能吃 X 吗」「X 成分护肤品能用吗」）；或在「我的 → AI 服务设置」接入你自己的大模型，获得不受词库限制的问答。'
      : 'This is beyond the built-in knowledge base. General pregnancy principles: avoid raw food, alcohol, high-mercury fish and unpasteurised dairy; keep folate/iron/calcium/iodine/DHA on target; stay active (≥150 min/week) without contraindications; tell any prescriber you are pregnant; and seek immediate care for bleeding, fluid loss, severe pain, reduced movements or severe headache.\n\nTry a more specific question, or connect your own LLM under Me → AI service settings for open-ended answers.';
    return { text: head + generic, src: 'ACOG · NHS · WHO', matched: false };
  }

  global.AI = { configured, chat, chatWithHistory, test, analyzeFood, offlineAnswer, cfg };
})(window);
