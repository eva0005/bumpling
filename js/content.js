/* ==========================================================================
   Content library — managed as "region × language" (PRD §8).
   Bilingual fields are { zh, en }. Region-variant lists are keyed 'cn' / 'intl'.
   ========================================================================== */
(function (global) {
  'use strict';

  // --- Baby development by week ---------------------------------------------
  // [week, fruit emoji, fruit {zh,en}, length cm, weight g, milestone {zh,en}, mom tip {zh,en}]
  const WEEKS = [
    [4, '🌱', { zh: '罂粟籽', en: 'poppy seed' }, 0.1, 0, { zh: '受精卵完成着床，胚胎开始分化出三个胚层。', en: 'The embryo has implanted and is forming three germ layers.' }, { zh: '现在开始每天补充 400 μg 叶酸，避免烟酒。', en: 'Start 400 μg folic acid daily if you have not; avoid alcohol and smoking.' }],
    [5, '🫘', { zh: '芝麻', en: 'sesame seed' }, 0.2, 0, { zh: '神经管开始形成，这是叶酸最关键的时期。', en: 'The neural tube is forming — the most folate-critical window.' }, { zh: '疲劳和乳房胀痛很常见；预约首次产检。', en: 'Fatigue and breast tenderness are common; book your first visit.' }],
    [6, '🫛', { zh: '扁豆', en: 'lentil' }, 0.5, 0, { zh: '心管开始搏动，B 超可能看到原始心跳。', en: 'The heart tube starts beating; a scan may show a flicker.' }, { zh: '孕吐可能开始，少量多餐，避免空腹。', en: 'Nausea may begin — eat small, frequent meals and avoid an empty stomach.' }],
    [7, '🫐', { zh: '蓝莓', en: 'blueberry' }, 1.0, 0, { zh: '手脚芽出现，大脑快速发育。', en: 'Arm and leg buds appear; the brain is growing fast.' }, { zh: '尿频属正常；别因此少喝水。', en: 'Frequent urination is normal — do not cut back on water.' }],
    [8, '🍇', { zh: '树莓', en: 'raspberry' }, 1.6, 1, { zh: '手指脚趾开始分化，胚胎开始小幅活动。', en: 'Fingers and toes begin to separate; tiny movements start.' }, { zh: '每天保证 1.5–2 L 水；姜茶可缓解孕吐。', en: 'Aim for 1.5–2 L water daily; ginger tea can ease nausea.' }],
    [9, '🍒', { zh: '樱桃', en: 'cherry' }, 2.3, 2, { zh: '从胚胎进入胎儿期，所有主要器官已具雏形。', en: 'Now officially a fetus; all major organs have begun to form.' }, { zh: '情绪波动常见，和伴侣聊聊你的感受。', en: 'Mood swings are common — talk through how you feel.' }],
    [10, '🍊', { zh: '金橘', en: 'kumquat' }, 3.1, 4, { zh: '骨骼开始硬化，眼睑形成。', en: 'Bones begin to harden; eyelids form.' }, { zh: '咖啡因每天控制在 200 mg 以内。', en: 'Keep caffeine under 200 mg a day.' }],
    [11, '🍈', { zh: '无花果', en: 'fig' }, 4.1, 7, { zh: '可以吞咽羊水，横膈膜开始形成。', en: 'Baby can swallow amniotic fluid; the diaphragm forms.' }, { zh: 'NT 检查窗口期开始（11–13⁺⁶ 周）。', en: 'NT scan window opens (11–13w6d).' }],
    [12, '🍋‍🟩', { zh: '青柠', en: 'lime' }, 5.4, 14, { zh: '反射出现，手指可以张合。', en: 'Reflexes appear; fingers can open and close.' }, { zh: '流产风险显著下降，孕吐通常开始缓解。', en: 'Miscarriage risk drops markedly; nausea usually starts to ease.' }],
    [13, '🍋', { zh: '柠檬', en: 'lemon' }, 7.4, 23, { zh: '声带形成，开始产生尿液。', en: 'Vocal cords form; baby starts producing urine.' }, { zh: '孕早期即将结束，增重目标仍为 0–2 kg。', en: 'First trimester ends soon; gain target so far is still 0–2 kg.' }],
    [14, '🍑', { zh: '桃子', en: 'peach' }, 8.7, 43, { zh: '面部表情出现，可能开始吮吸拇指。', en: 'Facial expressions appear; thumb-sucking may begin.' }, { zh: '精力恢复，是建立运动习惯的好时机。', en: 'Energy returns — a good time to build an exercise habit.' }],
    [15, '🍎', { zh: '苹果', en: 'apple' }, 10.1, 70, { zh: '骨骼在 X 光下已可见，能感知光线。', en: 'Bones are visible on X-ray; baby can sense light.' }, { zh: '开始关注铁的摄入：红肉、动物血、豆类。', en: 'Pay attention to iron: lean red meat, legumes, fortified cereal.' }],
    [16, '🥑', { zh: '牛油果', en: 'avocado' }, 11.6, 100, { zh: '听觉发育，能听到你的心跳。', en: 'Hearing develops; baby can hear your heartbeat.' }, { zh: '经产妇可能开始感觉到胎动。', en: 'If this is not your first, you may start feeling flutters.' }],
    [17, '🍐', { zh: '梨', en: 'pear' }, 13.0, 140, { zh: '开始积累脂肪，骨骼由软骨转变为骨。', en: 'Fat stores begin; cartilage turns to bone.' }, { zh: '左侧卧更利于血液循环。', en: 'Sleeping on your left side helps circulation.' }],
    [18, '🫑', { zh: '甜椒', en: 'bell pepper' }, 14.2, 190, { zh: '神经被髓鞘包裹，听力更敏锐。', en: 'Nerves are being myelinated; hearing sharpens.' }, { zh: '大排畸 / 结构超声窗口期临近。', en: 'Anatomy scan window is approaching.' }],
    [19, '🥭', { zh: '芒果', en: 'mango' }, 15.3, 240, { zh: '胎脂覆盖皮肤，感官区域在大脑中分化。', en: 'Vernix coats the skin; sensory areas of the brain specialise.' }, { zh: '腰背痛开始出现，注意姿势与核心训练。', en: 'Back pain may start — mind posture and gentle core work.' }],
    [20, '🍌', { zh: '香蕉', en: 'banana' }, 25.6, 300, { zh: '孕期过半！吞咽更多，开始产生胎便。', en: 'Halfway! Baby swallows more and begins making meconium.' }, { zh: '多数初产妇在 18–22 周感到胎动。', en: 'Most first-time mums feel movements around 18–22 weeks.' }],
    [21, '🥕', { zh: '胡萝卜', en: 'carrot' }, 26.7, 360, { zh: '骨髓开始造血。', en: 'Bone marrow starts making blood cells.' }, { zh: '每天补钙 1000 mg：奶制品、豆腐、绿叶菜。', en: 'Aim for ~1000 mg calcium: dairy, tofu, leafy greens.' }],
    [22, '🍈', { zh: '木瓜', en: 'papaya' }, 27.8, 430, { zh: '嘴唇、眉毛清晰，能感知触摸。', en: 'Lips and eyebrows are distinct; baby senses touch.' }, { zh: '腿抽筋多见，睡前拉伸小腿。', en: 'Leg cramps are common — stretch calves before bed.' }],
    [23, '🍊', { zh: '西柚', en: 'grapefruit' }, 28.9, 500, { zh: '肺部开始产生表面活性物质。', en: 'Lungs begin producing surfactant.' }, { zh: '糖耐量试验窗口期（24–28 周）临近。', en: 'Glucose screening window (24–28 wk) is coming up.' }],
    [24, '🌽', { zh: '玉米', en: 'ear of corn' }, 30.0, 600, { zh: '进入可存活期，面部完全成形。', en: 'Viability milestone; the face is fully formed.' }, { zh: '留意手脸水肿与头痛，按时测血压。', en: 'Watch for facial/hand swelling and headaches; check BP.' }],
    [25, '🥦', { zh: '花椰菜', en: 'cauliflower' }, 34.6, 660, { zh: '对声音有反应，开始有睡眠周期。', en: 'Responds to sound; sleep-wake cycles begin.' }, { zh: '便秘：多膳食纤维 + 足量水 + 规律运动。', en: 'Constipation: more fibre, plenty of water, regular movement.' }],
    [26, '🥬', { zh: '生菜', en: 'lettuce' }, 35.6, 760, { zh: '眼睛开始睁开，肺部继续发育。', en: 'Eyes begin to open; lungs keep maturing.' }, { zh: '胃灼热：少量多餐，饭后不要立刻躺下。', en: 'Heartburn: small meals, avoid lying down right after eating.' }],
    [27, '🥬', { zh: '卷心菜', en: 'cabbage' }, 36.6, 875, { zh: '大脑活动活跃，可能会打嗝。', en: 'Brain activity is lively; baby may hiccup.' }, { zh: '孕中期最后一周，回顾增重是否在区间。', en: 'Last week of the 2nd trimester — review your gain curve.' }],
    [28, '🍆', { zh: '茄子', en: 'aubergine' }, 37.6, 1000, { zh: '能够眨眼，做梦（REM 睡眠）。', en: 'Baby can blink and has REM sleep.' }, { zh: '孕晚期开始：每天数胎动，建议左侧卧。', en: 'Third trimester: count kicks daily; favour left-side sleeping.' }],
    [29, '🎃', { zh: '小南瓜', en: 'butternut squash' }, 38.6, 1150, { zh: '肌肉和肺快速成熟，骨骼储存钙。', en: 'Muscles and lungs mature; bones store calcium.' }, { zh: '铁需求达到峰值，注意补铁。', en: 'Iron needs peak now — keep up iron-rich foods.' }],
    [30, '🥬', { zh: '大白菜', en: 'Chinese cabbage' }, 39.9, 1320, { zh: '开始调节自身体温，胎毛减少。', en: 'Begins regulating temperature; lanugo thins.' }, { zh: '失眠多见：固定作息，睡前少喝水。', en: 'Sleep troubles are common — keep a routine, limit evening fluids.' }],
    [31, '🥥', { zh: '椰子', en: 'coconut' }, 41.1, 1500, { zh: '五感全部运作，脂肪持续积累。', en: 'All five senses work; fat keeps accumulating.' }, { zh: '练习分娩呼吸，了解临产征兆。', en: 'Practise labour breathing; learn the signs of labour.' }],
    [32, '🍈', { zh: '哈密瓜', en: 'cantaloupe' }, 42.4, 1700, { zh: '多数宝宝已转为头位。', en: 'Most babies have turned head-down.' }, { zh: '每 2 周一次产检，关注血压和水肿。', en: 'Visits every 2 weeks now — watch BP and swelling.' }],
    [33, '🍍', { zh: '菠萝', en: 'pineapple' }, 43.7, 1900, { zh: '颅骨仍柔软以便分娩，免疫系统发育。', en: 'Skull stays soft for birth; immune system develops.' }, { zh: '开始准备待产包。', en: 'Start packing your hospital bag.' }],
    [34, '🍈', { zh: '甜瓜', en: 'honeydew melon' }, 45.0, 2150, { zh: '肺部接近成熟，指甲长到指尖。', en: 'Lungs are nearly mature; nails reach fingertips.' }, { zh: '与医生讨论分娩计划。', en: 'Discuss your birth plan with your clinician.' }],
    [35, '🍈', { zh: '蜜瓜', en: 'melon' }, 46.2, 2400, { zh: '肾脏发育完全，肝脏开始处理废物。', en: 'Kidneys fully developed; liver begins processing waste.' }, { zh: 'GBS 筛查（按地区）。', en: 'GBS screening (depending on region).' }],
    [36, '🥒', { zh: '冬瓜', en: 'winter melon' }, 47.4, 2600, { zh: '胎头可能开始入盆。', en: 'Baby may begin to engage (drop) into the pelvis.' }, { zh: '每周产检开始；宫缩计时器已开放。', en: 'Weekly visits begin; the contraction timer is now available.' }],
    [37, '🥬', { zh: '芹菜束', en: 'bunch of chard' }, 48.6, 2900, { zh: '早期足月，正在练习呼吸和吮吸。', en: 'Early term; practising breathing and sucking.' }, { zh: '确认去医院的路线和联系电话。', en: 'Confirm your route to hospital and contact numbers.' }],
    [38, '🥬', { zh: '大葱', en: 'leek' }, 49.8, 3100, { zh: '器官全部成熟，脑部仍在快速发育。', en: 'Organs are mature; the brain keeps developing rapidly.' }, { zh: '留意见红、破水、规律宫缩。', en: 'Watch for show, waters breaking, regular contractions.' }],
    [39, '🍉', { zh: '小西瓜', en: 'mini watermelon' }, 50.7, 3300, { zh: '足月！体脂继续增加以保温。', en: 'Full term! Body fat keeps increasing for warmth.' }, { zh: '休息、补水、吃好——随时准备迎接。', en: 'Rest, hydrate and eat well — ready any day now.' }],
    [40, '🎃', { zh: '南瓜', en: 'pumpkin' }, 51.2, 3450, { zh: '预产期到了，大多数宝宝会在前后两周出生。', en: 'Due date — most babies arrive within two weeks either side.' }, { zh: '如超过 41 周，医生会讨论催产。', en: 'If you pass 41 weeks your clinician will discuss induction.' }],
    [41, '🎃', { zh: '南瓜', en: 'pumpkin' }, 51.5, 3600, { zh: '宝宝继续增重，胎盘功能需监测。', en: 'Baby keeps gaining; placental function is monitored.' }, { zh: '每天数胎动，按医嘱做监护。', en: 'Count kicks daily; attend monitoring as advised.' }],
    [42, '🎃', { zh: '南瓜', en: 'pumpkin' }, 51.7, 3700, { zh: '过期妊娠，通常会安排引产。', en: 'Post-term — induction is usually arranged.' }, { zh: '与医生讨论引产方案。', en: 'Discuss induction with your clinician.' }],
  ];
  const weekInfo = w => {
    const clamped = Math.min(42, Math.max(4, w));
    const row = WEEKS.find(r => r[0] === clamped) || WEEKS[0];
    return { week: row[0], emoji: row[1], fruit: row[2], len: row[3], wt: row[4], milestone: row[5], tip: row[6] };
  };

  // --- Trimester guide (PRD §6.5) ----------------------------------------------
  const TRIMESTERS = {
    1: {
      issues: { zh: ['孕吐、疲劳、尿频', '先兆流产担忧', '用药顾虑', '情绪波动'], en: ['Nausea, fatigue, frequent urination', 'Worry about miscarriage', 'Medication concerns', 'Mood swings'] },
      actions: { zh: ['少量多餐，避免空腹；姜、苏打饼干可缓解孕吐', '每天坚持 400 μg 叶酸或孕期复合维生素', '剧吐无法进食、体重下降 >5% 时就医', '任何用药前咨询医生或药师', '孕早期不需要额外增加能量'], en: ['Small frequent meals, never an empty stomach; ginger and plain crackers help', 'Take 400 μg folic acid or a prenatal vitamin daily', 'See a clinician if you cannot keep food down or lose >5% body weight', 'Check with a clinician or pharmacist before any medication', 'No extra energy is needed in the first trimester'] },
    },
    2: {
      issues: { zh: ['增重加速', '贫血、便秘', '腰背痛、腿抽筋', '血糖升高（GDM 风险）'], en: ['Faster weight gain', 'Anaemia, constipation', 'Back pain, leg cramps', 'Rising blood sugar (GDM risk)'] },
      actions: { zh: ['按每周增重区间控制节奏，不做"一人吃两人补"', '补铁补钙：红肉、动物血、奶制品、豆腐、绿叶菜', '每天 25–30 g 膳食纤维 + 足量水', '每周 ≥150 分钟中等强度运动：快走、游泳、孕妇瑜伽', '24–28 周按时做糖耐量检查'], en: ['Pace your gain to the weekly range — no "eating for two"', 'Iron and calcium: lean red meat, legumes, dairy, tofu, leafy greens', '25–30 g fibre daily plus plenty of water', '≥150 min moderate activity weekly: brisk walking, swimming, prenatal yoga', 'Attend glucose screening at 24–28 weeks'] },
    },
    3: {
      issues: { zh: ['水肿、妊娠期高血压风险', '失眠、胃灼热', '胎动异常', '分娩焦虑'], en: ['Swelling, risk of hypertensive disorders', 'Insomnia, heartburn', 'Changes in fetal movement', 'Anxiety about birth'] },
      actions: { zh: ['左侧卧；定期监测血压；突发头痛、视物模糊立即就医', '每日固定时间数胎动，2 小时不足 10 次立即就医', '少量多餐，睡前 2 小时不进食以减轻胃灼热', '练习分娩呼吸与骨盆活动', '36 周起准备待产包，确认医院路线'], en: ['Sleep on your left; monitor BP; seek care for sudden headache or blurred vision', 'Count kicks at the same time daily; <10 in 2 hours means seek care now', 'Small meals; nothing for 2 hours before bed to ease heartburn', 'Practise labour breathing and pelvic mobility', 'Pack your hospital bag from 36 weeks; confirm your route'] },
    },
  };

  // --- Food database (per 100 g unless serving given) ---------------------------
  // id, zh, en, serving g, kcal, protein, carb, fat, folate μg, iron mg, calcium mg, iodine μg, dha mg, caffeine mg, variant ('cn'|'intl'|'both'), tags
  const F = (id, zh, en, serving, kcal, p, c, f, fol, fe, ca, i, dha, caf, variant, tags) =>
    ({ id, zh, en, serving, kcal, protein: p, carb: c, fat: f, folate: fol, iron: fe, calcium: ca, iodine: i, dha, caffeine: caf, variant, tags: tags || [] });
  const FOODS = [
    // staples
    F('rice', '米饭', 'Steamed rice', 150, 116, 2.6, 25.9, 0.3, 3, 0.3, 7, 0, 0, 0, 'both', ['staple']),
    F('brownrice', '糙米饭', 'Brown rice', 150, 123, 2.7, 25.6, 1.0, 9, 0.6, 3, 0, 0, 0, 'both', ['staple', 'lowgi']),
    F('mantou', '馒头', 'Steamed bun (mantou)', 100, 223, 7.0, 47.0, 1.1, 18, 1.8, 38, 0, 0, 0, 'cn', ['staple']),
    F('noodles', '面条（煮）', 'Noodles (cooked)', 200, 110, 3.9, 22.0, 0.4, 5, 0.5, 7, 0, 0, 0, 'both', ['staple']),
    F('millet', '小米粥', 'Millet porridge', 250, 46, 1.4, 8.4, 0.7, 3, 0.5, 10, 0, 0, 0, 'cn', ['staple', 'nausea']),
    F('oats', '燕麦片（干）', 'Rolled oats (dry)', 40, 367, 15.0, 66.9, 6.7, 56, 7.0, 186, 0, 0, 0, 'both', ['staple', 'lowgi', 'fibre']),
    F('wwbread', '全麦面包', 'Wholemeal bread', 60, 247, 13.0, 41.0, 3.4, 50, 2.5, 107, 0, 0, 0, 'both', ['staple', 'fibre']),
    F('sweetpotato', '红薯', 'Sweet potato', 150, 86, 1.6, 20.0, 0.1, 11, 0.6, 30, 0, 0, 0, 'both', ['staple', 'fibre']),
    F('pasta', '意面（煮）', 'Pasta (cooked)', 180, 158, 5.8, 31.0, 0.9, 7, 1.3, 7, 0, 0, 0, 'intl', ['staple']),
    F('cereal', '强化早餐谷物', 'Fortified breakfast cereal', 30, 379, 7.0, 84.0, 1.0, 400, 24.0, 200, 0, 0, 0, 'intl', ['staple']),
    F('dumplings', '饺子（猪肉白菜）', 'Pork & cabbage dumplings', 200, 230, 9.0, 25.0, 10.0, 20, 1.5, 30, 2, 0, 0, 'cn', ['dish']),
    F('baozi', '包子（肉）', 'Steamed pork bun (baozi)', 100, 227, 8.5, 32.0, 7.0, 15, 1.2, 25, 0, 0, 0, 'cn', ['dish']),
    // protein
    F('egg', '鸡蛋', 'Egg', 50, 144, 13.3, 2.8, 8.8, 70, 2.0, 56, 27, 60, 0, 'both', ['protein']),
    F('milk', '牛奶', 'Milk', 250, 54, 3.0, 3.4, 3.2, 5, 0.3, 104, 20, 0, 0, 'both', ['dairy', 'calcium']),
    F('yogurt', '酸奶', 'Yogurt', 150, 72, 2.5, 9.3, 2.7, 7, 0.4, 118, 15, 0, 0, 'both', ['dairy', 'calcium']),
    F('greekyogurt', '希腊酸奶', 'Greek yogurt', 170, 59, 10.0, 3.6, 0.4, 7, 0.1, 110, 20, 0, 0, 'intl', ['dairy', 'protein']),
    F('cheddar', '切达奶酪（巴氏杀菌）', 'Cheddar (pasteurised)', 30, 403, 25.0, 1.3, 33.0, 18, 0.7, 721, 40, 0, 0, 'intl', ['dairy', 'calcium']),
    F('tofu', '豆腐', 'Tofu', 150, 82, 8.1, 4.2, 3.7, 17, 1.9, 164, 0, 0, 0, 'both', ['protein', 'calcium']),
    F('soymilk', '豆浆', 'Soy milk', 250, 31, 3.0, 1.2, 1.6, 15, 0.5, 10, 0, 0, 0, 'cn', ['protein']),
    F('pork', '猪瘦肉', 'Lean pork', 80, 143, 20.3, 1.5, 6.2, 1, 3.0, 6, 1, 0, 0, 'both', ['protein', 'iron']),
    F('beef', '瘦牛肉', 'Lean beef', 80, 106, 20.2, 1.2, 2.3, 6, 3.3, 9, 2, 0, 0, 'both', ['protein', 'iron']),
    F('chicken', '鸡胸肉', 'Chicken breast', 100, 118, 24.6, 0.6, 1.9, 4, 0.6, 3, 1, 0, 0, 'both', ['protein']),
    F('salmon', '三文鱼（熟）', 'Salmon (cooked)', 100, 139, 17.2, 0, 7.8, 25, 0.3, 13, 15, 1100, 0, 'both', ['protein', 'dha']),
    F('hairtail', '带鱼', 'Hairtail fish', 100, 127, 17.7, 3.1, 4.9, 2, 1.2, 28, 20, 400, 0, 'cn', ['protein', 'dha']),
    F('sardines', '沙丁鱼罐头', 'Canned sardines', 90, 208, 24.6, 0, 11.5, 10, 2.9, 382, 35, 500, 0, 'intl', ['protein', 'dha', 'calcium']),
    F('tuna', '金枪鱼罐头（淡）', 'Canned light tuna', 85, 116, 25.5, 0, 0.8, 4, 1.3, 11, 15, 200, 0, 'intl', ['protein', 'dha', 'moderate']),
    F('shrimp', '虾', 'Shrimp (cooked)', 80, 93, 18.6, 2.8, 0.8, 15, 1.5, 62, 35, 150, 0, 'both', ['protein']),
    F('liver', '猪肝（熟）', 'Pork liver (cooked)', 30, 129, 19.3, 5.0, 3.5, 425, 22.6, 6, 10, 0, 0, 'cn', ['iron', 'moderate']),
    F('lentils', '小扁豆（煮）', 'Lentils (cooked)', 150, 116, 9.0, 20.0, 0.4, 181, 3.3, 19, 0, 0, 0, 'intl', ['protein', 'iron', 'folate', 'lowgi']),
    F('chickpeas', '鹰嘴豆（煮）', 'Chickpeas (cooked)', 120, 164, 8.9, 27.0, 2.6, 172, 2.9, 49, 0, 0, 0, 'intl', ['protein', 'folate', 'lowgi']),
    F('edamame', '毛豆', 'Edamame', 100, 121, 11.0, 9.0, 5.0, 311, 2.3, 63, 0, 0, 0, 'both', ['protein', 'folate']),
    F('peanutbutter', '花生酱', 'Peanut butter', 20, 588, 25.0, 20.0, 50.0, 87, 1.9, 49, 0, 0, 0, 'intl', ['fat']),
    // vegetables
    F('spinach', '菠菜（熟）', 'Spinach (cooked)', 100, 24, 2.6, 3.6, 0.3, 146, 3.6, 136, 2, 0, 0, 'both', ['veg', 'folate', 'iron']),
    F('broccoli', '西兰花', 'Broccoli', 100, 36, 4.1, 4.3, 0.6, 108, 1.0, 67, 1, 0, 0, 'both', ['veg', 'folate']),
    F('kale', '羽衣甘蓝', 'Kale', 80, 49, 4.3, 8.8, 0.9, 141, 1.5, 150, 0, 0, 0, 'intl', ['veg', 'folate', 'calcium']),
    F('bokchoy', '小白菜', 'Bok choy', 100, 15, 1.5, 2.2, 0.3, 66, 0.8, 105, 1, 0, 0, 'cn', ['veg', 'calcium']),
    F('tomatoegg', '番茄炒蛋', 'Tomato & scrambled egg', 200, 130, 5.5, 4.0, 10.0, 40, 1.1, 35, 10, 25, 0, 'cn', ['dish']),
    F('kelp', '海带（湿）', 'Kelp (wet)', 50, 13, 1.2, 2.1, 0.1, 2, 0.9, 46, 1140, 0, 0, 'cn', ['veg', 'iodine']),
    F('nori', '紫菜（干）', 'Dried laver (nori)', 5, 250, 26.7, 44.0, 1.1, 400, 54.0, 264, 4320, 0, 0, 'both', ['iodine']),
    F('avocado', '牛油果', 'Avocado', 70, 160, 2.0, 8.5, 14.7, 81, 0.6, 12, 0, 0, 0, 'both', ['fat', 'folate']),
    // fruit & nuts
    F('apple', '苹果', 'Apple', 150, 54, 0.2, 13.5, 0.2, 3, 0.6, 4, 0, 0, 0, 'both', ['fruit']),
    F('banana', '香蕉', 'Banana', 120, 93, 1.4, 22.0, 0.2, 20, 0.4, 7, 0, 0, 0, 'both', ['fruit']),
    F('orange', '橙子', 'Orange', 150, 48, 0.8, 11.1, 0.2, 30, 0.4, 20, 0, 0, 0, 'both', ['fruit', 'folate']),
    F('strawberry', '草莓', 'Strawberries', 100, 32, 0.7, 7.7, 0.3, 24, 0.4, 16, 0, 0, 0, 'both', ['fruit']),
    F('jujube', '红枣（干）', 'Dried jujube', 20, 276, 3.2, 67.8, 0.5, 30, 2.3, 64, 0, 0, 0, 'cn', ['fruit']),
    F('walnut', '核桃', 'Walnuts', 20, 646, 14.9, 19.0, 58.8, 100, 2.7, 56, 0, 0, 0, 'both', ['nuts', 'fat']),
    F('almonds', '杏仁', 'Almonds', 25, 579, 21.0, 22.0, 50.0, 44, 3.7, 269, 0, 0, 0, 'both', ['nuts', 'calcium']),
    F('oj', '橙汁', 'Orange juice', 200, 45, 0.7, 10.4, 0.2, 30, 0.2, 11, 0, 0, 0, 'intl', ['drink']),
    // drinks
    F('latte', '拿铁', 'Latte', 355, 42, 2.2, 3.5, 2.0, 4, 0.1, 75, 12, 0, 42, 'both', ['drink', 'caffeine']),
    F('americano', '美式咖啡', 'Americano', 237, 1, 0.1, 0, 0, 1, 0, 2, 0, 0, 40, 'both', ['drink', 'caffeine']),
    F('greentea', '绿茶', 'Green tea', 237, 1, 0, 0, 0, 0, 0, 0, 0, 0, 12, 'both', ['drink', 'caffeine']),
    F('milktea', '奶茶', 'Bubble milk tea', 500, 70, 1.0, 12.0, 2.2, 0, 0.1, 20, 0, 0, 14, 'cn', ['drink', 'caffeine', 'sugar']),
    F('cola', '可乐', 'Cola', 330, 42, 0, 10.6, 0, 0, 0, 2, 0, 0, 10, 'both', ['drink', 'caffeine', 'sugar']),
    // western dishes
    F('pizza', '芝士披萨（1 片）', 'Cheese pizza (1 slice)', 107, 266, 11.0, 33.0, 10.0, 56, 2.3, 188, 8, 0, 0, 'intl', ['dish']),
    F('burger', '牛肉汉堡', 'Beef burger', 150, 267, 13.0, 24.0, 13.0, 40, 2.4, 80, 5, 0, 0, 'intl', ['dish']),
    F('chickensalad', '鸡肉沙拉', 'Chicken salad', 250, 95, 10.0, 4.0, 4.5, 60, 0.9, 40, 2, 0, 0, 'intl', ['dish']),
    F('stirfry', '青椒肉丝', 'Pork & pepper stir-fry', 200, 150, 11.0, 5.0, 9.5, 20, 1.6, 20, 1, 0, 0, 'cn', ['dish']),
    F('congee', '白粥', 'Rice congee', 300, 46, 1.1, 9.9, 0.3, 2, 0.1, 7, 0, 0, 0, 'cn', ['staple', 'nausea']),
    // supplements
    F('prenatal', '孕期复合维生素', 'Prenatal multivitamin', 1, 0, 0, 0, 0, 680, 27, 200, 150, 200, 0, 'both', ['supplement']),
    F('folicacid', '叶酸片 400 μg', 'Folic acid 400 μg', 1, 0, 0, 0, 0, 680, 0, 0, 0, 0, 0, 'both', ['supplement']),
    F('dhacap', 'DHA 胶囊', 'DHA capsule', 1, 10, 0, 0, 1, 0, 0, 0, 0, 200, 0, 'both', ['supplement']),
  ];
  // Supplements store per-unit values; everything else is per 100 g.
  const foodNutrients = (food, grams) => {
    const factor = food.tags.includes('supplement') ? grams : grams / 100;
    const out = {};
    ['kcal', 'protein', 'carb', 'fat', 'folate', 'iron', 'calcium', 'iodine', 'dha', 'caffeine'].forEach(k => { out[k] = (food[k] || 0) * factor; });
    return out;
  };

  // --- Food traffic light (PRD §6.3, §6.9) ----------------------------------------
  const TRAFFIC = {
    go: [
      { zh: '熟透的鸡蛋、瘦肉、禽肉', en: 'Well-cooked eggs, lean meat, poultry', why: { zh: '优质蛋白与铁', en: 'Quality protein and iron' } },
      { zh: '低汞鱼类（三文鱼、沙丁鱼、鳕鱼、带鱼）每周 2–3 次', en: 'Low-mercury fish (salmon, sardines, cod) 2–3 times a week', why: { zh: 'DHA 与碘', en: 'DHA and iodine' } },
      { zh: '巴氏杀菌奶制品、豆腐', en: 'Pasteurised dairy, tofu', why: { zh: '钙', en: 'Calcium' } },
      { zh: '深绿色叶菜、豆类、全谷物', en: 'Dark leafy greens, legumes, whole grains', why: { zh: '叶酸、铁、膳食纤维', en: 'Folate, iron, fibre' } },
      { zh: '坚果、牛油果、橄榄油', en: 'Nuts, avocado, olive oil', why: { zh: '健康脂肪', en: 'Healthy fats' } },
      { zh: '新鲜水果（整果优于果汁）', en: 'Fresh fruit (whole over juice)', why: { zh: '维生素 C 促进铁吸收', en: 'Vitamin C aids iron absorption' } },
    ],
    mod: {
      cn: [
        { zh: '咖啡、浓茶、奶茶', en: 'Coffee, strong tea, milk tea', why: { zh: '咖啡因每日 ≤200 mg', en: 'Caffeine ≤200 mg/day' } },
        { zh: '螃蟹、虾（必须熟透）', en: 'Crab, shrimp (fully cooked)', why: { zh: '熟透可以吃，适量；生腌醉蟹不行', en: 'Fine when fully cooked; never raw-marinated' } },
        { zh: '西瓜、荔枝、桂圆等高糖水果', en: 'Watermelon, lychee, longan (high sugar)', why: { zh: '控制份量，尤其 GDM', en: 'Watch portions, especially with GDM' } },
        { zh: '动物肝脏', en: 'Liver', why: { zh: '每周 1–2 次、每次 ≤50 g，避免维生素 A 过量', en: '1–2 times a week, ≤50 g, to avoid excess vitamin A' } },
        { zh: '腌制食品（咸菜、腊肉）', en: 'Pickled and cured foods', why: { zh: '钠高，水肿、高血压者少吃', en: 'High sodium — limit if swelling or hypertension' } },
        { zh: '外卖、火锅', en: 'Takeaway, hotpot', why: { zh: '食材要煮透，少油少盐', en: 'Cook ingredients thoroughly; less oil and salt' } },
      ],
      intl: [
        { zh: '咖啡、能量饮料', en: 'Coffee, energy drinks', why: { zh: '咖啡因每日 ≤200 mg', en: 'Caffeine ≤200 mg/day' } },
        { zh: '金枪鱼罐头', en: 'Canned tuna', why: { zh: '淡金枪鱼每周 ≤2–3 份；长鳍 ≤1 份', en: 'Light tuna ≤2–3 servings/week; albacore ≤1' } },
        { zh: '人工甜味剂', en: 'Artificial sweeteners', why: { zh: '适量即可，不必依赖', en: 'Fine in moderation' } },
        { zh: '草本茶', en: 'Herbal teas', why: { zh: '成分不明的不要多喝', en: 'Avoid large amounts of unverified herbs' } },
        { zh: '动物肝脏 / 肝酱', en: 'Liver / liver pâté', why: { zh: '维生素 A 过量风险', en: 'Risk of excess vitamin A' } },
        { zh: '快餐与加工肉', en: 'Fast food and processed meat', why: { zh: '高钠高脂，偶尔即可', en: 'High sodium and fat — occasional only' } },
      ],
    },
    stop: {
      cn: [
        { zh: '酒精（含料酒未挥发、醪糟）', en: 'Alcohol (including rice-wine dishes)', why: { zh: '没有安全剂量', en: 'No safe amount' } },
        { zh: '生腌、醉蟹、醉虾、生鱼片', en: 'Raw-marinated crab/shrimp, sashimi', why: { zh: '寄生虫、李斯特菌', en: 'Parasites, Listeria' } },
        { zh: '未全熟的肉蛋（溏心蛋、涮肉）', en: 'Undercooked meat and eggs', why: { zh: '沙门氏菌、弓形虫', en: 'Salmonella, toxoplasma' } },
        { zh: '高汞鱼（鲨鱼、剑鱼、大眼金枪鱼、方头鱼）', en: 'High-mercury fish (shark, swordfish, bigeye tuna, tilefish)', why: { zh: '汞影响胎儿神经发育', en: 'Mercury harms fetal brain development' } },
        { zh: '未消毒的鲜奶和奶制品', en: 'Unpasteurised milk and cheese', why: { zh: '李斯特菌', en: 'Listeria' } },
        { zh: '不明来源的中药补品', en: 'Herbal tonics of unknown origin', why: { zh: '成分不明，可能影响妊娠', en: 'Unknown constituents' } },
      ],
      intl: [
        { zh: '酒精', en: 'Alcohol', why: { zh: '没有安全剂量', en: 'No safe amount' } },
        { zh: '熟食冷切肉、热狗（除非加热至冒热气）', en: 'Deli / cold cuts, hot dogs (unless steaming hot)', why: { zh: '李斯特菌', en: 'Listeria' } },
        { zh: '软质未消毒奶酪（brie、camembert、feta、蓝纹）', en: 'Soft unpasteurised cheeses (brie, camembert, feta, blue)', why: { zh: '李斯特菌', en: 'Listeria' } },
        { zh: '生鱼寿司、冷藏烟熏海鲜、生蚝', en: 'Raw-fish sushi, refrigerated smoked seafood, raw oysters', why: { zh: '李斯特菌、寄生虫', en: 'Listeria, parasites' } },
        { zh: '高汞鱼（鲨鱼、剑鱼、鲭鱼王、方头鱼、大眼金枪鱼）', en: 'High-mercury fish (shark, swordfish, king mackerel, tilefish, bigeye tuna) — FDA list', why: { zh: '汞', en: 'Mercury' } },
        { zh: '生豆芽、生面团、未消毒果汁', en: 'Raw sprouts, raw dough, unpasteurised juice', why: { zh: '沙门氏菌、大肠杆菌', en: 'Salmonella, E. coli' } },
      ],
    },
  };

  // --- Myth check (说法辨析, PRD §6.9 P1) ---------------------------------------
  const MYTHS = {
    cn: [
      { q: { zh: '孕妇不能吃螃蟹？', en: 'Can pregnant women eat crab?' }, v: 'caution', a: { zh: '熟透的螃蟹可以适量吃，它是优质蛋白来源。不能吃的是生腌、醉蟹等生食，以及来源不明、不新鲜的蟹。"寒凉导致流产"没有证据支持。', en: 'Fully cooked crab is fine in moderation and a good protein source. Avoid raw-marinated or drunken crab and anything not fresh. "Cooling foods cause miscarriage" has no evidence.' } },
      { q: { zh: '西瓜太寒，孕妇不能吃？', en: 'Is watermelon too "cold" for pregnancy?' }, v: 'yes', a: { zh: '可以吃。注意份量（含糖较高），GDM 妈妈每次 100–150 g 为宜。', en: 'Yes you can. Watch portion size as it is fairly sugary — 100–150 g at a time if you have GDM.' } },
      { q: { zh: '吃酱油宝宝皮肤会黑？', en: 'Does soy sauce make the baby\'s skin darker?' }, v: 'yes', a: { zh: '不会。肤色由遗传决定，酱油的色素不会通过胎盘影响肤色。但酱油钠高，仍应少放。', en: 'No. Skin colour is genetic; pigments in soy sauce do not reach the baby. Soy sauce is high in sodium though, so go easy.' } },
      { q: { zh: '一人吃两人补，要多吃？', en: 'Eating for two?' }, v: 'no', a: { zh: '孕早期不需要额外能量；孕中期每天仅多 250 kcal（约一杯奶 + 一个鸡蛋），孕晚期多 400 kcal。重点是营养密度而不是总量。', en: 'No extra energy is needed in the first trimester; only ~250 kcal more per day in the second (a glass of milk plus an egg) and ~400 kcal in the third. Nutrient density matters more than quantity.' } },
      { q: { zh: '孕期不能运动，要静养？', en: 'Should I rest and avoid exercise?' }, v: 'no', a: { zh: '无禁忌证的孕妇每周应运动 ≥150 分钟。运动可降低 GDM、高血压和过度增重的风险。先做运动筛查，有医嘱限制时例外。', en: 'Without contraindications you should aim for ≥150 min a week. Exercise lowers the risk of GDM, hypertension and excess gain. Complete the safety screen first.' } },
      { q: { zh: '孕妇不能吃辣？', en: 'Is spicy food off-limits?' }, v: 'yes', a: { zh: '可以吃，辣不会影响胎儿。若有胃灼热或痔疮，适量减少。', en: 'Spicy food is fine and does not affect the baby. Reduce it if you have heartburn or haemorrhoids.' } },
      { q: { zh: '吃燕窝、海参会让宝宝更聪明？', en: 'Do bird\'s nest or sea cucumber make the baby smarter?' }, v: 'caution', a: { zh: '没有证据。保证 DHA（每周 2–3 次低汞鱼）、碘和铁的摄入更重要。', en: 'No evidence. Adequate DHA (low-mercury fish 2–3 times a week), iodine and iron matter far more.' } },
    ],
    intl: [
      { q: { zh: '可以吃寿司吗？', en: 'Can I eat sushi?' }, v: 'caution', a: { zh: '熟料寿司（熟虾、鳗鱼、蔬菜卷）可以；生鱼寿司建议避免，因为有李斯特菌和寄生虫风险。', en: 'Cooked sushi (cooked shrimp, eel, vegetable rolls) is fine. Avoid raw-fish sushi because of Listeria and parasite risk.' } },
      { q: { zh: '可以吃熟食冷切肉吗？', en: 'Can I eat deli meat?' }, v: 'caution', a: { zh: '加热到冒热气后可以吃。冷食的火腿、火鸡片有李斯特菌风险。', en: 'Yes if heated until steaming hot. Cold ham or turkey slices carry a Listeria risk.' } },
      { q: { zh: '孕期能喝咖啡吗？', en: 'Can I drink coffee?' }, v: 'yes', a: { zh: '可以，每天咖啡因不超过 200 mg（约一杯 350 ml 的滴滤咖啡）。', en: 'Yes — keep caffeine under 200 mg a day (roughly one 12 oz drip coffee).' } },
      { q: { zh: '软奶酪都不能吃？', en: 'Are all soft cheeses off-limits?' }, v: 'caution', a: { zh: '巴氏杀菌的软奶酪（大多数超市奶油奶酪、马苏里拉）可以；未消毒的 brie、camembert、蓝纹奶酪避免。看标签 "pasteurized"。', en: 'Pasteurised soft cheeses (most supermarket cream cheese, mozzarella) are fine. Avoid unpasteurised brie, camembert and blue cheese — check the label.' } },
      { q: { zh: '我妈妈说要吃很多鸡蛋和猪蹄补身体？', en: 'My mother says to eat lots of eggs and pig trotters?' }, v: 'caution', a: { zh: '鸡蛋很好，但每天 1–2 个足够。猪蹄胶原蛋白并不会"补"到胎儿，且脂肪高。两边的建议差异在于营养密度与总能量。', en: 'Eggs are great, but 1–2 a day is plenty. Collagen from trotters does not "transfer" to the baby and is high in fat. The gap between traditions and local advice is really about nutrient density versus total energy.' } },
      { q: { zh: '英国不称体重，我需要关注增重吗？', en: 'UK midwives don\'t weigh me — should I still track gain?' }, v: 'yes', a: { zh: '英国不常规监测，但自我了解增重趋势仍有价值。以 IOM 区间为参考，有疑问请问助产士。', en: 'Routine weighing is not UK practice, but knowing your own trend is still useful. Use the IOM range as a reference and ask your midwife if unsure.' } },
      { q: { zh: '可以吃花生吗？会让宝宝过敏吗？', en: 'Can I eat peanuts? Will it cause allergy?' }, v: 'yes', a: { zh: '除非你自己过敏，否则可以吃。孕期吃花生不会增加宝宝过敏风险。', en: 'Unless you are allergic yourself, yes. Eating peanuts in pregnancy does not raise the baby\'s allergy risk.' } },
    ],
  };

  // --- Scenario recipes (PRD §6.3 P1) ------------------------------------------
  const SCENES = {
    nausea: { foods: { zh: ['苏打饼干', '姜茶 / 姜糖', '小米粥', '冷的酸奶', '烤土司', '西瓜、橙子'], en: ['Plain crackers', 'Ginger tea or ginger chews', 'Rice congee', 'Cold yogurt', 'Dry toast', 'Watermelon, oranges'] }, avoid: { zh: ['油腻、气味重的食物', '空腹'], en: ['Greasy, strong-smelling food', 'Empty stomach'] }, tip: { zh: '起床前先吃几块饼干；固体和液体分开吃；维生素 B6 可能有帮助，请咨询医生。', en: 'Eat crackers before getting up; separate solids and liquids; vitamin B6 may help — ask your clinician.' } },
    anemia: { foods: { zh: ['瘦牛肉、猪肝（每周 1–2 次）', '鸭血、猪血', '扁豆、鹰嘴豆', '菠菜 + 橙子（维 C 助吸收）', '强化谷物'], en: ['Lean beef, liver (1–2×/week)', 'Lentils, chickpeas', 'Spinach + orange (vitamin C helps absorption)', 'Fortified cereal', 'Edamame'] }, avoid: { zh: ['餐后立即喝茶、咖啡', '补铁同时喝牛奶'], en: ['Tea or coffee right after meals', 'Milk together with iron supplements'] }, tip: { zh: '血红素铁（肉类）吸收率远高于植物铁；铁剂空腹或餐间服用效果更好。', en: 'Haem iron (meat) is absorbed much better than plant iron; take iron tablets between meals.' } },
    gdm: { foods: { zh: ['糙米、燕麦、全麦', '豆腐、鱼、鸡蛋', '绿叶菜、西兰花', '坚果（一小把）', '低糖水果：草莓、苹果'], en: ['Brown rice, oats, wholemeal', 'Tofu, fish, eggs', 'Leafy greens, broccoli', 'A small handful of nuts', 'Lower-sugar fruit: berries, apple'] }, avoid: { zh: ['白粥、白面包', '果汁、奶茶', '精制甜点'], en: ['White congee, white bread', 'Juice, milk tea', 'Refined desserts'] }, tip: { zh: '每餐先吃菜和蛋白质再吃主食；少量多餐（3 正餐 + 2–3 加餐）；餐后散步 15 分钟。', en: 'Eat vegetables and protein before carbs; 3 meals + 2–3 snacks; walk 15 minutes after meals.' } },
    constipation: { foods: { zh: ['燕麦、红薯', '火龙果、猕猴桃、西梅', '酸奶', '足量水 2 L'], en: ['Oats, sweet potato', 'Kiwi, prunes, pears', 'Yogurt', '2 L of water'] }, avoid: { zh: ['精白主食', '久坐'], en: ['Refined starches', 'Long periods sitting'] }, tip: { zh: '铁剂可能加重便秘，可与医生讨论换剂型；每天步行 30 分钟。', en: 'Iron tablets can worsen constipation — ask about alternatives; walk 30 minutes daily.' } },
    edema: { foods: { zh: ['冬瓜、黄瓜', '香蕉（钾）', '优质蛋白：鱼、蛋、奶'], en: ['Cucumber, winter melon', 'Banana (potassium)', 'Quality protein: fish, eggs, dairy'] }, avoid: { zh: ['腌制、加工食品（钠）', '长时间站立'], en: ['Pickled and processed foods (sodium)', 'Standing for long periods'] }, tip: { zh: '水肿不要限水；抬高双腿；突发水肿伴头痛、血压高请立即就医。', en: 'Do not restrict fluids; elevate your legs; sudden swelling with headache or high BP needs urgent care.' } },
  };

  // --- Exercise courses by trimester (PRD §6.4) ----------------------------------
  const COURSES = {
    1: [
      { type: 'walk', min: 30, intensity: 'mod', d: { zh: '平地快走，能说话但不能唱歌的速度。', en: 'Brisk flat walk — you can talk but not sing.' } },
      { type: 'stretch', min: 15, intensity: 'low', d: { zh: '颈肩、腰背、小腿拉伸，缓解疲劳。', en: 'Neck, back and calf stretches to ease fatigue.' } },
      { type: 'kegel', min: 10, intensity: 'low', d: { zh: '收缩盆底 5 秒、放松 5 秒，10 次一组，每天 3 组。', en: 'Squeeze 5 s, release 5 s, 10 reps × 3 sets daily.' } },
    ],
    2: [
      { type: 'yoga', min: 30, intensity: 'mod', d: { zh: '猫牛式、侧卧抬腿、靠墙深蹲，避免仰卧超过 2 分钟。', en: 'Cat-cow, side-lying leg lifts, wall squats; avoid lying flat for >2 min.' } },
      { type: 'swim', min: 30, intensity: 'mod', d: { zh: '自由泳或仰泳，水温 28–30 ℃ 为宜。', en: 'Freestyle or backstroke, water around 28–30 ℃.' } },
      { type: 'kegel', min: 10, intensity: 'low', d: { zh: '盆底肌训练，预防产后漏尿。', en: 'Pelvic floor training to prevent postnatal leakage.' } },
      { type: 'strength', min: 20, intensity: 'mod', d: { zh: '弹力带划船、坐姿推举，轻负荷多次数。', en: 'Band rows, seated presses — light load, higher reps.' } },
    ],
    3: [
      { type: 'pelvic', min: 15, intensity: 'low', d: { zh: '瑜伽球骨盆画圈、猫牛式，帮助胎头入盆。', en: 'Pelvic circles on a ball, cat-cow — helps baby engage.' } },
      { type: 'breath', min: 10, intensity: 'low', d: { zh: '4 秒吸气、6 秒呼气；宫缩时用"呼—呼—吹"。', en: 'Inhale 4 s, exhale 6 s; "hee-hee-hoo" for contractions.' } },
      { type: 'walk', min: 20, intensity: 'low', d: { zh: '慢走，随时能停下休息。', en: 'Easy walk — stop and rest whenever you need.' } },
      { type: 'kegel', min: 10, intensity: 'low', d: { zh: '继续盆底训练，为分娩做准备。', en: 'Keep up pelvic floor work ahead of birth.' } },
    ],
  };

  // --- Daily quotes (每日一句) — from parenting / childbirth books and writers ------
  // Each: text {zh,en}, src {zh,en}. Translations are ours; attribution as commonly published.
  const QUOTES = [
    { zh: '相信你自己。你懂得的，比你以为的要多。', en: 'Trust yourself. You know more than you think you do.', src: { zh: '本杰明·斯波克《斯波克育儿经》', en: 'Benjamin Spock, Baby and Child Care' } },
    { zh: '请记住这一点，它千真万确：你的身体不是次品。', en: 'Remember this, for it is as true as true gets: your body is not a lemon.', src: { zh: '伊娜·梅·加斯金《伊娜·梅的分娩指南》', en: 'Ina May Gaskin, Ina May\'s Guide to Childbirth' } },
    { zh: '无论何时、以何种方式分娩，这段经历都会影响你的情绪、心灵、身体与精神，伴随一生。', en: 'Whenever and however you give birth, your experience will impact your emotions, your mind, your body, and your spirit for the rest of your life.', src: { zh: '伊娜·梅·加斯金《伊娜·梅的分娩指南》', en: 'Ina May Gaskin, Ina May\'s Guide to Childbirth' } },
    { zh: '分娩不只是生下孩子，更是造就母亲——坚强、能干、信任自己并知晓内在力量的母亲。', en: 'Birth is not only about making babies. Birth is about making mothers — strong, competent, capable mothers who trust themselves and know their inner strength.', src: { zh: '芭芭拉·卡茨·罗斯曼（社会学家、生育研究者）', en: 'Barbara Katz Rothman, sociologist of birth' } },
    { zh: '我们的文化里有一个秘密——不是分娩很痛，而是女性很强大。', en: 'We have a secret in our culture, and it\'s not that birth is painful. It\'s that women are strong.', src: { zh: '劳拉·斯塔沃·哈姆', en: 'Laura Stavoe Harm' } },
    { zh: '孕育与出生把我们带到创造的本质之中——人的精神勇敢无畏，而身体，是智慧的奇迹。', en: 'Giving birth and being born brings us into the essence of creation, where the human spirit is courageous and bold and the body, a miracle of wisdom.', src: { zh: '哈丽特·哈蒂根（分娩摄影师、作家）', en: 'Harriette Hartigan, birth photographer and writer' } },
    { zh: '决定要一个孩子是件大事：你决定从此让自己的心在身体之外行走。', en: 'Making the decision to have a child is momentous. It is to decide forever to have your heart go walking around outside your body.', src: { zh: '伊丽莎白·斯通', en: 'Elizabeth Stone' } },
    { zh: '没有办法成为完美的母亲，但有一百万种方式成为好母亲。', en: 'There is no way to be a perfect mother, and a million ways to be a good one.', src: { zh: '吉尔·丘吉尔', en: 'Jill Churchill' } },
    { zh: '孩子，你在腹中孕育九个月，在怀中抱三年，在心里放一辈子。', en: 'A baby is something you carry inside you for nine months, in your arms for three years, and in your heart till the day you die.', src: { zh: '玛丽·梅森', en: 'Mary Mason' } },
    { zh: '成为母亲，是去认识那些你从不知道自己拥有的力量。', en: 'Being a mother is learning about strengths you didn\'t know you had.', src: { zh: '琳达·伍滕', en: 'Linda Wooten' } },
    { zh: '孩子出生的那一刻，母亲也诞生了。', en: 'The moment a child is born, the mother is also born.', src: { zh: '奥修', en: 'Osho' } },
    { zh: '要改变世界，先要改变婴儿来到世界的方式。', en: 'To change the world, we must first change the way babies are being born.', src: { zh: '米歇尔·奥当（产科医生）', en: 'Michel Odent, obstetrician' } },
    { zh: '孕育是一个邀请：请你把自己交付给生命背后那股看不见的力量。', en: 'Pregnancy is a process that invites you to surrender to the unseen force behind all life.', src: { zh: '朱迪·福特', en: 'Judy Ford' } },
    { zh: '一个婴儿，是上天认为世界应当继续下去的意见。', en: 'A baby is God\'s opinion that the world should go on.', src: { zh: '卡尔·桑德堡《纪念岩》', en: 'Carl Sandburg, Remembrance Rock' } },
    { zh: '母亲啊！你是荷叶，我是红莲。心中的雨点来了，除了你，谁是我在无遮拦天空下的荫蔽？', en: 'Mother, you are the lotus leaf and I the red lotus. When the rain falls in my heart, who but you shelters me under the open sky?', src: { zh: '冰心《荷叶·母亲》', en: 'Bing Xin, "Lotus Leaf · Mother"' } },
    { zh: '慈母手中线，游子身上衣。临行密密缝，意恐迟迟归。', en: 'Thread in a loving mother\'s hand, clothes on her travelling child; stitch by stitch before he leaves, for fear he returns late.', src: { zh: '孟郊《游子吟》', en: 'Meng Jiao, "Song of the Wandering Son"' } },
    { zh: '母亲的喜悦从新生命在体内萌动时开始：第一次听见那小小的心跳，一次顽皮的踢动提醒她——她从不孤单。', en: 'A mother\'s joy begins when new life is stirring inside; when a tiny heartbeat is heard for the very first time, and a playful kick reminds her that she is never alone.', src: { zh: '佚名', en: 'Unknown' } },
    { zh: '你不需要在今天做完所有事。照顾好自己，就是在照顾宝宝。', en: 'You do not have to do everything today. Taking care of yourself is taking care of your baby.', src: { zh: '小芽孕期 · 医学内容组', en: 'Bumpling medical content team' } },
    { zh: '体重只是一个数字，趋势才是故事。今天在区间里，就是好的一天。', en: 'Weight is just a number; the trend is the story. In range today is a good day.', src: { zh: '小芽孕期 · 医学内容组', en: 'Bumpling medical content team' } },
    { zh: '每一次产检，都是你和宝宝的一次见面。', en: 'Every prenatal visit is another chance to meet your baby.', src: { zh: '小芽孕期 · 医学内容组', en: 'Bumpling medical content team' } },
  ];
  const dayOfYear = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const quoteOfDay = (offset = 0, d = new Date()) => QUOTES[((dayOfYear(d) + offset) % QUOTES.length + QUOTES.length) % QUOTES.length];

  global.Content = { WEEKS, weekInfo, TRIMESTERS, FOODS, foodNutrients, TRAFFIC, MYTHS, SCENES, COURSES, QUOTES, quoteOfDay };
})(window);
