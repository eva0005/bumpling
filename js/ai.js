/* ==========================================================================
   AI — 小芽 AI provider layer (v1.2).
   Talks to Google Gemini or any OpenAI-compatible /chat/completions endpoint
   straight from the browser with the user's own key (stored on-device only,
   see Store.exportJSON). Three structured tasks, all returning JSON:
     ask()            pregnancy Q&A (text + photos + voice clip)
     analyzeMeal()    one meal photo → foods, grams, kcal, P/C/F/fibre
     importHistory()  screenshots / handwritten logs → meal & workout entries
   A fully offline demo mode returns built-in samples so the UI can be tried
   without a key. No DOM here except an off-screen canvas for image resizing.
   ========================================================================== */
(function (global) {
  'use strict';

  const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  const OPENAI_BASE = 'https://api.openai.com/v1';
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const WORKOUT_TYPES = ['walk', 'yoga', 'swim', 'kegel', 'stretch', 'pelvic', 'breath', 'strength', 'other'];

  class AIError extends Error {
    constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; this.detail = detail || ''; }
  }

  const cfg = () => (Store.state.settings && Store.state.settings.ai) || {};
  function status() { const a = cfg(); if (a.demo) return 'demo'; if (a.apiKey && a.consent) return 'ready'; return 'off'; }
  const isReady = () => status() !== 'off';

  // --- Images -------------------------------------------------------------------
  function fileToDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new AIError('image')); r.readAsDataURL(file); });
  }
  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new AIError('image')); im.src = src; });
  }
  // Downscale to maxDim (longest side) JPEG — keeps uploads small and localStorage thumbnails tiny.
  async function compressImage(src, maxDim = 1024, quality = 0.82) {
    const dataURL = typeof src === 'string' ? src : await fileToDataURL(src);
    try {
      const im = await loadImage(dataURL);
      const scale = Math.min(1, maxDim / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
      const w = Math.max(1, Math.round((im.naturalWidth || im.width) * scale)), h = Math.max(1, Math.round((im.naturalHeight || im.height) * scale));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(im, 0, 0, w, h);
      return c.toDataURL('image/jpeg', quality);
    } catch (e) {
      if (/^data:image\//.test(dataURL)) return dataURL; // canvas unavailable: send as-is
      throw new AIError('image');
    }
  }
  const thumb = src => compressImage(src, 160, 0.7);
  function splitDataURL(d) { const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(d || ''); if (!m) throw new AIError('image'); return { mime: m[1] || 'application/octet-stream', b64: m[2] ? m[3] : btoa(unescape(encodeURIComponent(decodeURIComponent(m[3])))) }; }

  // --- Context shared with the model (never weight values or names) -------------------
  function context() {
    const st = Store.state;
    const a = cfg();
    const lang = I18N.lang === 'zh' ? 'Simplified Chinese (简体中文)' : 'English';
    const lines = [`Answer language: ${lang}.`, `Today: ${Store.todayStr()}.`];
    if (a.shareContext !== false) {
      const g = Engine.gestAge(st.profile);
      if (g) lines.push(`User is pregnant, gestational age ${g.weeks}w${g.rem}d (trimester ${g.trimester}).`);
      lines.push(`Regional guideline pack: ${st.settings.region} (${t('region.' + st.settings.region + '.src')}).`);
      const cond = (st.profile.conditions || []).slice(); if (st.settings.gdmMode) cond.push('gestational diabetes mode on');
      if (st.profile.multiple) cond.push('multiple pregnancy');
      if (cond.length) lines.push(`Known conditions: ${cond.join(', ')}.`);
    }
    return lines.join('\n');
  }

  // --- Prompts -----------------------------------------------------------------------
  const SYS_CHAT = `You are 小芽 (Bumpling), a warm, evidence-based pregnancy companion inside a pregnancy tracking app.
Scope: food & drink safety, skincare/cosmetic ingredients, medications (general guidance only), daily life, exercise, symptoms, emotional wellbeing during pregnancy and postpartum.
Rules:
- Ground answers in mainstream guidelines (ACOG, NICE/NHS, WHO, 中华医学会, 中国营养学会 DRIs, FDA/EFSA/国家药监局 for cosmetics). Prefer conservative, practical advice; say when evidence is limited.
- Never diagnose, never prescribe doses of prescription drugs, never tell the user to stop a prescribed medicine. For red-flag symptoms (bleeding, fluid leak, severe headache/vision changes, reduced fetal movement, severe abdominal pain, fever ≥38°C) set seekCare=true and tell her to contact her clinician / emergency services.
- If a photo is attached, identify the product/food/label first (read ingredient lists carefully), then answer about it. If audio is attached, first transcribe the question into "transcript".
- Be concise: a short direct verdict, then 2–5 key points. Use plain language.
Return ONLY a JSON object:
{"verdict":"yes"|"caution"|"no"|"info","title":"<=14 words headline","answer":"main answer; **bold** and '- ' bullets allowed","tips":["<=3 short practical tips"],"sources":["<=3 short guideline references, e.g. ACOG FAQ 2023, NHS 2024"],"seekCare":false,"transcript":"question transcribed from audio, else empty"}`;

  const MICRO = 'folate (µg), iron (mg), calcium (mg), iodine (µg), dha (mg), caffeine (mg)';
  const SYS_MEAL = `You are a registered dietitian estimating nutrition from ONE meal photo for a pregnant user.
Identify each distinct food or drink, estimate its portion in grams (use plates ~26 cm, chopsticks ~24 cm, bowls ~12 cm, cups ~240 ml as scale references), then compute energy, macronutrients AND the pregnancy-relevant micronutrients ${MICRO} FOR THAT PORTION using standard food composition data (USDA FoodData Central / 中国食物成分表). Caffeine matters: coffee, tea, cola, milk tea, chocolate, energy drinks must carry a realistic caffeine value; everything else 0. Supplements or non-food: skip. If unsure, still give a best estimate and mark confidence "low".
Return ONLY JSON:
{"items":[{"name":"short name in the answer language","grams":0,"kcal":0,"protein":0,"carb":0,"fat":0,"fibre":0,"folate":0,"iron":0,"calcium":0,"iodine":0,"dha":0,"caffeine":0,"confidence":"high"|"medium"|"low"}],"notes":"one or two short sentences: assumptions, pregnancy-relevant cautions (raw fish, soft cheese, high caffeine, very high sugar…), or empty"}
All numeric values are totals for the estimated portion (not per 100 g). grams/kcal integers, others one decimal. If nothing edible is visible return {"items":[],"notes":"..."}.`;

  const SYS_IMPORT = `You convert images of diet and exercise records (screenshots from other apps, handwritten diaries, smartwatch summaries, food photos with captions) into structured entries for a pregnancy tracker.
Extract every meal and every workout you can read. Dates: use the date shown; resolve relative words (今天/昨天/yesterday/Mon) against the provided "Today"; if the year is missing assume the most recent past occurrence. Never output future dates. Map meal slots to breakfast/lunch/dinner/snack by label or time (05–10 breakfast, 10:30–14 lunch, 17–21 dinner, else snack). Estimate grams, energy, macronutrients and the micronutrients ${MICRO} for the portion when not stated (standard composition tables; caffeine for coffee/tea/cola/milk tea). Map workouts to one of: ${WORKOUT_TYPES.join(', ')} (walk covers walking/hiking/stroller; strength covers light weights/resistance bands; other for anything else). minutes integer.
Return ONLY JSON:
{"meals":[{"date":"YYYY-MM-DD","meal":"breakfast"|"lunch"|"dinner"|"snack","name":"","grams":0,"kcal":0,"protein":0,"carb":0,"fat":0,"fibre":0,"folate":0,"iron":0,"calcium":0,"iodine":0,"dha":0,"caffeine":0}],"workouts":[{"date":"YYYY-MM-DD","type":"walk","minutes":0,"note":""}],"notes":"short remark or empty"}
If nothing importable is visible return empty arrays.`;

  // --- JSON extraction -----------------------------------------------------------------
  function parseJSON(text) {
    if (!text) throw new AIError('parse');
    let s = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(s); } catch (e) { /* fall through */ }
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { /* fall through */ } }
    throw new AIError('parse');
  }
  const num = (v, d = 0) => { const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.\-]/g, '')) : +v; return isFinite(n) ? n : d; };
  const r1 = n => Math.round(n * 10) / 10;

  // --- Transport -----------------------------------------------------------------------
  const TIMEOUT_MS = 60000;
  // Combine the caller's AbortSignal with a hard timeout. Returns {signal, done}.
  function withTimeout(signal, ms = TIMEOUT_MS) {
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, ms);
    const onAbort = () => ctrl.abort();
    if (signal) { if (signal.aborted) ctrl.abort(); else signal.addEventListener('abort', onAbort, { once: true }); }
    return { signal: ctrl.signal, done() { clearTimeout(timer); if (signal) signal.removeEventListener('abort', onAbort); }, get timedOut() { return timedOut; } };
  }
  function fetchError(e, tm) {
    if (e && e.name === 'AbortError') return new AIError(tm && tm.timedOut ? 'timeout' : 'aborted');
    // A TypeError from fetch while the browser says it is online is almost always CORS / blocked endpoint.
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (online && cfg().provider === 'openai') return new AIError('cors', e && e.message);
    return new AIError('network', e && e.message);
  }
  async function readError(res) {
    const txt = await res.text().catch(() => '');
    let body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = null; }
    const msg = (body && body.error && (body.error.message || body.error.code)) || txt.slice(0, 200) || res.statusText;
    if (res.status === 401 || res.status === 403) return new AIError('key', msg);
    if (res.status === 429) return new AIError('quota', msg);
    if (res.status === 404 || (/model/i.test(String(msg)) && res.status === 400)) return new AIError('model', msg);
    if (res.status === 400 && /API key|api_key/i.test(String(msg))) return new AIError('key', msg);
    return new AIError('generic', `${res.status} ${msg}`);
  }
  async function httpJSON(url, opts = {}) {
    const tm = withTimeout(opts.signal);
    let res;
    try { res = await fetch(url, Object.assign({}, opts, { signal: tm.signal })); }
    catch (e) { tm.done(); throw fetchError(e, tm); }
    try {
      if (!res.ok) throw await readError(res);
      const txt = await res.text();
      try { return txt ? JSON.parse(txt) : null; } catch (e) { throw new AIError('parse'); }
    } finally { tm.done(); }
  }
  // POST and consume a server-sent-event stream; onEvent(jsonChunk) per "data:" line. Falls back to a plain JSON body.
  async function httpSSE(url, opts, onEvent) {
    const tm = withTimeout(opts.signal, TIMEOUT_MS * 2);
    let res;
    try { res = await fetch(url, Object.assign({}, opts, { signal: tm.signal })); }
    catch (e) { tm.done(); throw fetchError(e, tm); }
    try {
      if (!res.ok) throw await readError(res);
      const ct = res.headers.get('content-type') || '';
      if (!res.body || !res.body.getReader || !/event-stream/i.test(ct)) {
        const txt = await res.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { throw new AIError('parse'); }
        onEvent(j); return;
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try { onEvent(JSON.parse(data)); } catch (e) { /* ignore partial */ }
        }
      }
      if (buf.startsWith('data:')) { const data = buf.slice(5).trim(); if (data && data !== '[DONE]') { try { onEvent(JSON.parse(data)); } catch (e) { /* ignore */ } } }
    } catch (e) {
      if (e instanceof AIError) throw e;
      throw fetchError(e, tm);
    } finally { tm.done(); }
  }
  function baseUrl() { const a = cfg(); return (a.baseUrl || OPENAI_BASE).replace(/\/+$/, ''); }

  // req = { system, text, images:[dataURL], audio:{dataURL}|null, history:[{role:'user'|'ai', text}], signal?, onDelta?(textSoFar) }
  async function callGemini(req) {
    const a = cfg();
    const model = a.model || 'gemini-2.5-flash';
    const contents = [];
    for (const h of (req.history || [])) if (h.text) contents.push({ role: h.role === 'ai' ? 'model' : 'user', parts: [{ text: h.text }] });
    const parts = [];
    for (const im of (req.images || [])) { const { mime, b64 } = splitDataURL(im); parts.push({ inline_data: { mime_type: mime, data: b64 } }); }
    if (req.audio) { const { mime, b64 } = splitDataURL(req.audio.dataURL); parts.push({ inline_data: { mime_type: req.audio.mime || mime, data: b64 } }); }
    parts.push({ text: req.text || '(see attachment)' });
    contents.push({ role: 'user', parts });
    const body = {
      system_instruction: { parts: [{ text: req.system }] },
      contents,
      generationConfig: { temperature: 0.3, response_mime_type: 'application/json', max_output_tokens: 2048 },
      safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(c => ({ category: c, threshold: 'BLOCK_ONLY_HIGH' })),
    };
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': a.apiKey }, body: JSON.stringify(body), signal: req.signal };
    let text = '', blocked = null;
    const take = out => {
      if (out && out.promptFeedback && out.promptFeedback.blockReason) blocked = out.promptFeedback.blockReason;
      const cand = out && out.candidates && out.candidates[0];
      if (!cand) return;
      if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') blocked = cand.finishReason;
      text += (cand.content && cand.content.parts || []).map(p => p.text || '').join('');
      if (req.onDelta) req.onDelta(text);
    };
    if (req.onDelta) await httpSSE(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, opts, take);
    else take(await httpJSON(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, opts));
    if (blocked) throw new AIError('blocked', blocked);
    if (!text) throw new AIError('parse');
    return text;
  }

  async function callOpenAI(req) {
    const a = cfg();
    const model = a.model || 'gpt-4o-mini';
    const messages = [{ role: 'system', content: req.system }];
    for (const h of (req.history || [])) if (h.text) messages.push({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.text });
    const content = [];
    for (const im of (req.images || [])) content.push({ type: 'image_url', image_url: { url: im } });
    if (req.audio) {
      const { b64 } = splitDataURL(req.audio.dataURL);
      const fmt = /mp4|m4a|aac/.test(req.audio.mime || '') ? 'mp4' : /wav/.test(req.audio.mime || '') ? 'wav' : /mp3|mpeg/.test(req.audio.mime || '') ? 'mp3' : 'webm';
      content.push({ type: 'input_audio', input_audio: { data: b64, format: fmt } });
    }
    content.push({ type: 'text', text: req.text || '(see attachment)' });
    messages.push({ role: 'user', content: content.length === 1 ? content[0].text : content });
    const stream = !!req.onDelta;
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.apiKey }, body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 2048, stream }), signal: req.signal };
    let text = '', filtered = false;
    const take = out => {
      const ch = out && out.choices && out.choices[0];
      if (!ch) return;
      if (ch.finish_reason === 'content_filter') filtered = true;
      const c = ch.delta ? ch.delta.content : (ch.message && ch.message.content);
      text += Array.isArray(c) ? c.map(p => p.text || '').join('') : (c || '');
      if (req.onDelta) req.onDelta(text);
    };
    if (stream) await httpSSE(`${baseUrl()}/chat/completions`, opts, take);
    else take(await httpJSON(`${baseUrl()}/chat/completions`, opts));
    if (filtered) throw new AIError('blocked');
    if (!text) throw new AIError('parse');
    return text;
  }

  async function call(req) {
    const a = cfg();
    if (!a.apiKey) throw new AIError('key');
    if (!a.consent) throw new AIError('consent');
    const text = a.provider === 'openai' ? await callOpenAI(req) : await callGemini(req);
    return parseJSON(text);
  }
  // While a JSON answer streams in, surface the partial "answer" string so the UI can show progress.
  function partialAnswer(text) {
    const m = /"answer"\s*:\s*"/.exec(text || '');
    if (!m) return '';
    let s = text.slice(m.index + m[0].length), out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\') { const n = s[i + 1]; if (n === 'n') out += '\n'; else if (n === 't') out += '\t'; else if (n === 'u') { out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16) || 32); i += 4; } else if (n != null) out += n; i++; }
      else if (c === '"') break;
      else out += c;
    }
    return out;
  }

  // --- Public tasks --------------------------------------------------------------------
  function normAnswer(j, fallbackText) {
    const v = ['yes', 'caution', 'no', 'info'].includes(j.verdict) ? j.verdict : 'info';
    return {
      verdict: v, title: String(j.title || '').trim(), text: String(j.answer || j.text || fallbackText || '').trim(),
      tips: Array.isArray(j.tips) ? j.tips.map(String).filter(Boolean).slice(0, 4) : [],
      sources: Array.isArray(j.sources) ? j.sources.map(String).filter(Boolean).slice(0, 4) : [],
      seekCare: !!j.seekCare, transcript: String(j.transcript || '').trim(),
    };
  }
  async function ask({ text = '', images = [], audio = null, history = [], signal = null, onDelta = null } = {}) {
    if (cfg().demo) { await wait(700, signal); return demoAnswer(text, images, audio); }
    const j = await call({ system: SYS_CHAT + '\n\n' + context(), text: text || (audio ? 'Please transcribe and answer my voice question.' : 'Please look at the photo and tell me whether it is suitable during pregnancy.'), images, audio, history: history.slice(-8), signal, onDelta: onDelta ? raw => onDelta(partialAnswer(raw)) : null });
    return normAnswer(j);
  }

  // --- Nutrition helpers -------------------------------------------------------------------
  const NUT_KEYS = ['kcal', 'protein', 'carb', 'fat', 'fibre', 'folate', 'iron', 'calcium', 'iodine', 'dha', 'caffeine'];
  const MICRO_KEYS = ['folate', 'iron', 'calcium', 'iodine', 'dha', 'caffeine'];
  const normName = s => String(s || '').toLowerCase().replace(/[\s\u3000·•,，。.、()（）\-_/+&]/g, '').replace(/（.*?）|\(.*?\)/g, '');
  // Best-effort match of a free-text food name to the local database (exact, then containment of ≥2 chars).
  function matchFood(name) {
    const n = normName(name); if (!n) return null;
    const foods = Content.FOODS.filter(f => !f.tags.includes('supplement'));
    let hit = foods.find(f => normName(f.zh) === n || normName(f.en) === n);
    if (hit) return hit;
    const cands = foods.map(f => { const z = normName(f.zh), e = normName(f.en); const l = Math.max(z.length >= 2 && (n.includes(z) || z.includes(n)) ? z.length : 0, e.length >= 3 && (n.includes(e) || e.includes(n)) ? e.length : 0); return [l, f]; }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
    return cands.length ? cands[0][1] : null;
  }
  // Fill in micronutrients the model left out (0 / missing) from the matched database food, scaled by grams.
  function fillMicros(n, name, grams) {
    const f = matchFood(name);
    if (!f) return { n, matched: null };
    const db = Content.foodNutrients(f, grams);
    const out = Object.assign({}, n);
    for (const k of MICRO_KEYS) if (!(+out[k] > 0) && db[k] > 0) out[k] = r1(db[k]);
    return { n: out, matched: f.id };
  }
  const round = (k, v) => k === 'kcal' ? Math.round(v) : r1(v);

  function normItems(items) {
    return (Array.isArray(items) ? items : []).map(it => {
      const grams = Math.round(num(it.grams, 0));
      const name = String(it.name || '').trim();
      if (!name || grams <= 0) return null;
      let n = {}; for (const k of NUT_KEYS) n[k] = Math.max(0, num(it[k]));
      const filled = fillMicros(n, name, grams); n = filled.n;
      // per-gram ratios so the UI can rescale when the user edits the portion
      const per = {}; for (const k of NUT_KEYS) per[k] = n[k] / grams;
      return { name, grams, per, matched: filled.matched, confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium' };
    }).filter(Boolean).slice(0, 20);
  }
  const itemNutrients = (it, grams = it.grams) => { const out = {}; for (const k of NUT_KEYS) out[k] = round(k, (it.per[k] || 0) * grams); return out; };
  async function analyzeMeal(image, { signal = null } = {}) {
    if (cfg().demo) { await wait(1200, signal); return { items: normItems(DEMO_MEAL.items), notes: I18N.lang === 'zh' ? DEMO_MEAL.notes.zh : DEMO_MEAL.notes.en }; }
    const j = await call({ system: SYS_MEAL + '\n\n' + context(), text: 'Analyse this meal photo.', images: [image], signal });
    return { items: normItems(j.items), notes: String(j.notes || '').trim() };
  }

  function normImport(j) {
    const today = Store.todayStr();
    const okDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today;
    const meals = (Array.isArray(j.meals) ? j.meals : []).map(m => {
      const name = String(m.name || '').trim(); if (!name) return null;
      const grams = Math.max(1, Math.round(num(m.grams, 100)));
      let n = {}; for (const k of NUT_KEYS) n[k] = round(k, Math.max(0, num(m[k])));
      n = fillMicros(n, name, grams).n;
      return { date: okDate(String(m.date || '')), meal: MEALS.includes(m.meal) ? m.meal : 'snack', name, grams, n };
    }).filter(Boolean).slice(0, 60);
    const workouts = (Array.isArray(j.workouts) ? j.workouts : []).map(w => {
      const minutes = Math.round(num(w.minutes)); if (!minutes || minutes <= 0) return null;
      return { date: okDate(String(w.date || '')), type: WORKOUT_TYPES.includes(w.type) ? w.type : 'other', minutes: Math.min(600, minutes), note: String(w.note || '').trim() };
    }).filter(Boolean).slice(0, 60);
    return { meals, workouts, notes: String(j.notes || '').trim() };
  }
  async function importHistory(images, kind = 'both', { signal = null } = {}) {
    if (cfg().demo) { await wait(1400, signal); return normImport(demoImport(kind)); }
    const hint = kind === 'diet' ? 'The user says these are DIET records (still extract workouts if clearly present).' : kind === 'exercise' ? 'The user says these are EXERCISE records (still extract meals if clearly present).' : '';
    const j = await call({ system: SYS_IMPORT + '\n\n' + context(), text: `Extract all records from the ${images.length} attached image(s). ${hint}`.trim(), images, signal });
    return normImport(j);
  }
  // Cheap, stable fingerprint of an image data URL (used to flag re-importing the same screenshot).
  function imageHash(dataURL) {
    const s = String(dataURL || ''); let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + s.length.toString(36);
  }

  async function listModels() {
    const a = cfg();
    if (!a.apiKey) throw new AIError('key');
    if (a.provider === 'openai') {
      const out = await httpJSON(`${baseUrl()}/models`, { headers: { Authorization: 'Bearer ' + a.apiKey } });
      return ((out && out.data) || []).map(m => m.id).filter(Boolean).sort();
    }
    const out = await httpJSON(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': a.apiKey } });
    return ((out && out.models) || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name || '').replace(/^models\//, '')).filter(n => /gemini/i.test(n)).sort();
  }
  async function test() {
    const a = cfg();
    if (!a.apiKey) throw new AIError('key');
    const text = a.provider === 'openai'
      ? await callOpenAI({ system: 'Reply with the JSON {"ok":true}.', text: 'ping' })
      : await callGemini({ system: 'Reply with the JSON {"ok":true}.', text: 'ping' });
    parseJSON(text);
    return a.model || (a.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash');
  }

  // Map an error to a user-facing message key.
  function errorKey(e) {
    const code = e && e.code;
    if (code === 'key' || code === 'consent') return 'ai.err.key';
    if (['quota', 'model', 'network', 'parse', 'blocked', 'image', 'timeout', 'aborted', 'cors'].includes(code)) return 'ai.err.' + code;
    return 'ai.err.generic';
  }

  // --- Demo mode (offline samples) -------------------------------------------------------
  // Demo delay that honours cancellation like a real request would.
  const wait = (ms, signal) => new Promise((res, rej) => {
    if (signal && signal.aborted) return rej(new AIError('aborted'));
    const id = setTimeout(() => { if (signal) signal.removeEventListener('abort', onAbort); res(); }, ms);
    const onAbort = () => { clearTimeout(id); rej(new AIError('aborted')); };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
  const DEMO_QA = [
    { k: /螃蟹|蟹|crab/i, zh: { verdict: 'caution', title: '熟透的螃蟹可以适量吃', answer: '完全煮熟的螃蟹是优质蛋白来源，孕期可以吃。\n- 一定要蒸煮至全熟，避免醉蟹、生腌。\n- 每周水产总量建议 2–3 份（约 220–340 g），螃蟹属于低汞类。\n- 过敏体质或既往吃蟹不适者避免。\n- 「寒凉导致流产」缺乏科学依据。', tips: ['挑新鲜活蟹，现做现吃', '搭配姜醋更易消化', '肠胃敏感可先少量尝试'], sources: ['FDA/EPA Advice About Eating Fish 2021', 'NHS: Foods to avoid in pregnancy', '中国营养学会《孕期妇女膳食指南》2022'], seekCare: false },
      en: { verdict: 'caution', title: 'Fully cooked crab is fine in moderation', answer: 'Thoroughly cooked crab is a good source of protein and low in mercury.\n- Avoid raw or lightly cured crab (e.g. drunken crab).\n- Aim for 2–3 servings (8–12 oz) of low-mercury seafood per week in total.\n- Skip it if you have a shellfish allergy.', tips: ['Buy fresh and eat it the same day', 'Reheat leftovers until steaming hot'], sources: ['FDA/EPA Advice About Eating Fish 2021', 'NHS: Foods to avoid in pregnancy'], seekCare: false } },
    { k: /寿司|刺身|生鱼|sushi|sashimi|raw fish/i, zh: { verdict: 'caution', title: '熟食寿司可以，生鱼片建议避免', answer: '孕期主要担心李斯特菌、寄生虫和汞。\n- 熟料寿司（熟虾、鳗鱼、蟹柳、蔬菜卷）可以吃。\n- 生鱼片、生三文鱼卷不建议；若店家使用经商业急冻处理的鱼，风险较低但仍有争议。\n- 避免大型鱼：金枪鱼大腹、剑鱼、鲨鱼。', tips: ['选信誉好的餐厅', '用酱油别太多，注意钠'], sources: ['ACOG FAQ: Nutrition During Pregnancy 2023', 'NHS 2023'], seekCare: false },
      en: { verdict: 'caution', title: 'Cooked sushi yes — raw fish best avoided', answer: 'Concerns are listeria, parasites and mercury.\n- Cooked rolls (shrimp tempura, eel, crab stick, veggie) are fine.\n- Skip raw fish and high-mercury species (bigeye tuna, swordfish).\n- UK guidance allows previously-frozen raw fish; US guidance advises avoiding it.', tips: ['Choose a reputable restaurant', 'Go easy on soy sauce (sodium)'], sources: ['ACOG FAQ 2023', 'NHS: Foods to avoid in pregnancy 2023'], seekCare: false } },
    { k: /咖啡|奶茶|咖啡因|caffeine|coffee|tea/i, zh: { verdict: 'caution', title: '每天咖啡因不超过 200 mg', answer: '主流指南一致建议孕期咖啡因 ≤200 mg/天。\n- 约等于 1 杯中杯拿铁（≈150 mg）或 2 杯红茶。\n- 奶茶、可乐、巧克力、功能饮料里也有咖啡因，要一起算。\n- 应用的饮食页会自动累计今日咖啡因。', tips: ['换成低因咖啡或麦茶', '下午后尽量不喝，减少失眠'], sources: ['ACOG Committee Opinion 462', 'NHS 2023', 'WS/T 801-2022 配套指南'], seekCare: false },
      en: { verdict: 'caution', title: 'Keep caffeine under 200 mg a day', answer: 'Guidelines agree on ≤200 mg/day in pregnancy.\n- That is about one 12-oz latte (~150 mg) or two cups of black tea.\n- Count cola, energy drinks, chocolate and bubble tea too.\n- The Diet tab tallies today\'s caffeine for you.', tips: ['Switch to decaf after lunch'], sources: ['ACOG Committee Opinion 462', 'NHS 2023'], seekCare: false } },
    { k: /视黄醇|维A|维生素A|retin|tretinoin|异维|水杨酸|salicylic|护肤|化妆|面霜|精华|成分|skincare|cosmetic|cream|serum|ingredient/i, zh: { verdict: 'no', title: '含视黄醇 / 维 A 酸类产品孕期应避免', answer: '口服维 A 酸明确致畸；外用视黄醇吸收少，但各国指南仍建议孕期停用，以防万一。\n- **避免**：视黄醇、视黄醛、维 A 酸、异维 A 酸、他扎罗汀、高浓度水杨酸（>2%）、对苯二酚。\n- **可用**：烟酰胺、维生素 C、透明质酸、壬二酸、神经酰胺、物理防晒（氧化锌 / 二氧化钛）。\n- 孕期色斑与痘痘可咨询皮肤科选择安全方案。', tips: ['查看成分表（INCI）而不是只看产品名', '新产品先在耳后试用'], sources: ['ACOG FAQ: Skin Conditions During Pregnancy', 'AAD: Is any acne treatment safe during pregnancy?'], seekCare: false },
      en: { verdict: 'no', title: 'Avoid retinol / retinoid products in pregnancy', answer: 'Oral retinoids are teratogenic; topical absorption is low, but guidelines still advise stopping them during pregnancy.\n- **Avoid**: retinol, retinal, tretinoin, isotretinoin, tazarotene, high-strength salicylic acid (>2%), hydroquinone.\n- **Fine**: niacinamide, vitamin C, hyaluronic acid, azelaic acid, ceramides, mineral sunscreen (zinc oxide / titanium dioxide).', tips: ['Read the INCI list, not just the front label', 'Patch-test new products'], sources: ['ACOG FAQ: Skin Conditions During Pregnancy', 'AAD guidance'], seekCare: false } },
    { k: /染发|美甲|指甲油|烫发|hair dye|manicure|nail/i, zh: { verdict: 'caution', title: '染发、美甲可以，注意通风和时机', answer: '现有证据认为孕期染发和美甲风险很低。\n- 染发建议在 12 周后，选择半永久或挑染，减少头皮接触。\n- 美甲时保持通风，避免长时间吸入丙酮、甲醛等气味；可选「5-free」「10-free」指甲油。\n- 做完若头晕、恶心，及时离开到空气流通处。', tips: ['提前告知理发师 / 美甲师你怀孕了'], sources: ['NHS: Is it safe to use hair dye when pregnant?', 'ACOG FAQ 2023'], seekCare: false },
      en: { verdict: 'caution', title: 'Hair dye and manicures are OK with ventilation', answer: 'Evidence suggests very low risk.\n- Many wait until after 12 weeks and choose highlights or semi-permanent dye to limit scalp contact.\n- Keep the room ventilated; choose "5-free"/"10-free" polishes.\n- Step outside if you feel light-headed.', tips: ['Tell your stylist you are pregnant'], sources: ['NHS: Is it safe to use hair dye when pregnant?', 'ACOG FAQ 2023'], seekCare: false } },
    { k: /出血|见红|流血|破水|胎动减少|剧烈腹痛|bleed|leak|fluid|severe pain|no movement/i, zh: { verdict: 'info', title: '这些情况请立即联系医生', answer: '阴道出血、破水、胎动明显减少、持续剧烈腹痛、剧烈头痛或视物模糊都属于需要立刻就医的信号。请不要等待 AI 的解释，现在就联系产检医院或拨打急救电话。', tips: ['记录开始时间和量', '带好产检手册'], sources: ['ACOG: Warning signs during pregnancy', 'NHS: Urgent symptoms'], seekCare: true },
      en: { verdict: 'info', title: 'Please contact your clinician now', answer: 'Vaginal bleeding, leaking fluid, noticeably reduced movements, persistent severe abdominal pain, severe headache or vision changes all need urgent assessment. Please call your maternity unit or emergency services now rather than waiting for an AI explanation.', tips: ['Note when it started', 'Bring your maternity notes'], sources: ['ACOG: Urgent maternal warning signs', 'NHS: Urgent symptoms'], seekCare: true } },
  ];
  const DEMO_DEFAULT = {
    zh: { verdict: 'info', title: '演示模式示例回答', answer: '这是一条离线演示回答，用来展示小芽 AI 的回答格式：先给出结论，再列出要点与参考来源。\n- 连接你自己的 Gemini 或 OpenAI 兼容 Key 后，小芽会基于孕周、地区标准和你的问题给出真实回答。\n- 试试问「孕妇可以吃螃蟹吗」「含视黄醇的面霜能用吗」「每天能喝多少咖啡」。', tips: ['在「我的 → 小芽 AI」中完成设置'], sources: ['Bumpling 演示数据'], seekCare: false },
    en: { verdict: 'info', title: 'Demo-mode sample answer', answer: 'This is an offline sample showing the answer format: a verdict first, then key points and sources.\n- Connect your own Gemini or OpenAI-compatible key and Bumpling will answer your real question in context.\n- Try "Can I eat crab?", "Can I use a retinol cream?" or "How much coffee is OK?".', tips: ['Set it up under Me → Bumpling AI'], sources: ['Bumpling demo data'], seekCare: false },
  };
  const DEMO_PHOTO = {
    zh: { verdict: 'caution', title: '照片识别（演示）', answer: '演示模式无法真正识别图片。连接 AI 服务后，小芽会读取照片中的食物、产品名称和成分表，再给出孕期建议。', tips: ['拍清楚成分表或食物整体'], sources: ['Bumpling 演示数据'], seekCare: false },
    en: { verdict: 'caution', title: 'Photo recognition (demo)', answer: 'Demo mode cannot read images. Once connected, Bumpling reads the food, product name and ingredient list in the photo before answering.', tips: ['Photograph the ingredient list clearly'], sources: ['Bumpling demo data'], seekCare: false },
  };
  function demoAnswer(text, images, audio) {
    const L = I18N.lang === 'zh' ? 'zh' : 'en';
    if (images && images.length && !text) return normAnswer(DEMO_PHOTO[L]);
    const hit = DEMO_QA.find(q => q.k.test(text || ''));
    const a = normAnswer(hit ? hit[L] : DEMO_DEFAULT[L]);
    if (audio && !text) a.transcript = L === 'zh' ? '（演示）孕妇可以吃螃蟹吗？' : '(demo) Can I eat crab while pregnant?';
    return a;
  }
  const DEMO_MEAL = {
    get items() { const zh = I18N.lang === 'zh'; return [
      { name: zh ? '米饭' : 'Steamed rice', grams: 150, kcal: 174, protein: 3.9, carb: 38.9, fat: 0.5, fibre: 0.6, folate: 4, iron: 0.3, calcium: 10, iodine: 0, dha: 0, caffeine: 0, confidence: 'high' },
      { name: zh ? '清蒸鲈鱼' : 'Steamed sea bass', grams: 100, kcal: 105, protein: 18.6, carb: 0, fat: 3.4, fibre: 0, folate: 8, iron: 2.0, calcium: 138, iodine: 15, dha: 240, caffeine: 0, confidence: 'medium' },
      { name: zh ? '蒜蓉西兰花' : 'Garlic broccoli', grams: 90, kcal: 45, protein: 3.7, carb: 4.5, fat: 2.0, fibre: 2.3, folate: 97, iron: 0.9, calcium: 60, iodine: 1, dha: 0, caffeine: 0, confidence: 'high' },
      { name: zh ? '番茄蛋汤' : 'Tomato & egg soup', grams: 200, kcal: 62, protein: 3.6, carb: 3.2, fat: 3.8, fibre: 0.6, folate: 22, iron: 0.8, calcium: 24, iodine: 8, dha: 15, caffeine: 0, confidence: 'low' },
      { name: zh ? '拿铁' : 'Latte', grams: 355, kcal: 150, protein: 8, carb: 12, fat: 7, fibre: 0, folate: 14, iron: 0.2, calcium: 270, iodine: 40, dha: 0, caffeine: 150, confidence: 'high' },
    ]; },
    notes: { zh: '演示数据：一份典型的中式午餐。连接 AI 服务后会按你的照片识别。', en: 'Demo data: a typical Chinese lunch. Connect an AI service to analyse your own photo.' },
  };
  function demoImport(kind) {
    const zh = I18N.lang === 'zh';
    const d = n => Store.todayStr(new Date(Date.now() - n * 86400000));
    const meals = [
      { date: d(1), meal: 'breakfast', name: zh ? '牛奶 + 全麦面包' : 'Milk + wholegrain toast', grams: 300, kcal: 290, protein: 14, carb: 40, fat: 8, fibre: 4, folate: 40, iron: 1.6, calcium: 300, iodine: 50, dha: 0, caffeine: 0 },
      { date: d(1), meal: 'lunch', name: zh ? '鸡胸肉沙拉' : 'Chicken salad', grams: 320, kcal: 380, protein: 32, carb: 18, fat: 19, fibre: 5, folate: 90, iron: 2.2, calcium: 70, iodine: 5, dha: 0, caffeine: 0 },
      { date: d(2), meal: 'dinner', name: zh ? '番茄牛腩面' : 'Tomato beef noodles', grams: 450, kcal: 560, protein: 28, carb: 72, fat: 16, fibre: 4, folate: 45, iron: 3.6, calcium: 50, iodine: 6, dha: 0, caffeine: 0 },
    ];
    const workouts = [
      { date: d(1), type: 'walk', minutes: 35, note: zh ? '晚饭后散步' : 'After-dinner walk' },
      { date: d(2), type: 'yoga', minutes: 25, note: zh ? '孕期瑜伽' : 'Prenatal yoga' },
    ];
    return { meals: kind === 'exercise' ? [] : meals, workouts: kind === 'diet' ? [] : workouts, notes: zh ? '演示数据。' : 'Demo data.' };
  }

  global.AI = { AIError, status, isReady, ask, analyzeMeal, importHistory, listModels, test, errorKey, compressImage, thumb, fileToDataURL, itemNutrients, parseJSON, partialAnswer, normItems, normImport, matchFood, normName, imageHash, NUT_KEYS, MICRO_KEYS, MEALS, WORKOUT_TYPES, GEMINI_BASE, OPENAI_BASE, TIMEOUT_MS };
})(window);
