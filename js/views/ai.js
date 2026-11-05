/* 小芽 AI — chat screen (text / photo / voice Q&A) plus the two AI sheets shared with
   Diet and Exercise: photo nutrition and history import. Requires js/ai.js. */
(function () {
  'use strict';
  const { esc, icon, L, toast, fmtEnergy } = UI;

  // ---------------------------------------------------------------------------
  // Shared: "AI not set up" sheet
  // ---------------------------------------------------------------------------
  function notReady() {
    UI.sheet({
      title: t('ai.notready.t'),
      body: `<div class="stack"><div class="row" style="justify-content:center">${Mascot.mascot({ size: 84, mood: 'calm' })}</div><p class="small muted center">${esc(t('ai.notready.d'))}</p></div>`,
      actions: `<button class="btn secondary" data-demo>${esc(t('ai.demo.try'))}</button><a class="btn primary" href="#/me/ai" data-close>${esc(t('ai.setup'))}</a>`,
      onMount(s, close) {
        s.querySelector('[data-demo]').addEventListener('click', () => { Store.update(x => { x.settings.ai.demo = true; }); close(); toast(t('ai.demo.on'), 'ok'); UI.render(); });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Shared: photo nutrition sheet (Diet)
  // ---------------------------------------------------------------------------
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const confTag = c => c === 'low' ? `<span class="conf low">${esc(t('dp.conf.low'))}</span>` : '';
  function totalsOf(items) {
    const tot = { grams: 0, kcal: 0, protein: 0, carb: 0, fat: 0, fibre: 0 };
    for (const it of items) { const n = AI.itemNutrients(it); tot.grams += it.grams; for (const k in n) tot[k] += n[k]; }
    return tot;
  }
  function macroBar(n) {
    const s = Engine.macroSplit(n);
    if (!s) return '';
    return `<div class="macro-bar" role="img" aria-label="${esc(t('dp.ratio'))}"><i class="c" style="width:${s.carb}%"></i><i class="p" style="width:${s.protein}%"></i><i class="f" style="width:${s.fat}%"></i></div>
      <div class="macro-legend"><span class="c"><i></i>${esc(t('d.n.carb'))} ${s.carb}%</span><span class="p"><i></i>${esc(t('d.n.protein'))} ${s.protein}%</span><span class="f"><i></i>${esc(t('d.n.fat'))} ${s.fat}%</span></div>`;
  }
  function totalsHTML(items) {
    const tot = totalsOf(items);
    const stat = (v, l) => `<div class="stat"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`;
    return `<div class="totals three">${stat(Math.round(tot.grams) + '<small>g</small>', t('dp.total.weight'))}${stat(esc(fmtEnergy(tot.kcal, false)) + `<small>${esc(t('units.' + Store.state.settings.units.energy))}</small>`, t('dp.total.kcal'))}${stat(tot.protein.toFixed(1) + '<small>g</small>', t('d.n.protein'))}${stat(tot.carb.toFixed(1) + '<small>g</small>', t('d.n.carb'))}${stat(tot.fat.toFixed(1) + '<small>g</small>', t('d.n.fat'))}${stat(tot.fibre.toFixed(1) + '<small>g</small>', t('d.n.fibre'))}</div>
      <div class="mt-2"><div class="eyebrow mb-1">${esc(t('dp.ratio'))}</div>${macroBar(tot) || `<p class="xs subtle">—</p>`}<p class="xs subtle mt-1">${esc(t('dp.ratio.ref'))}</p></div>`;
  }

  function photoMeal(day, meal) {
    if (AI.status() === 'off') return notReady();
    day = day || Store.todayStr();
    let img = null, items = null, notes = '', busy = false, err = '', mealSel = MEALS.includes(meal) ? meal : guessMeal(), ctrl = null;
    const itemMeta = it => { const n = AI.itemNutrients(it); return `${fmtEnergy(n.kcal)} · P ${n.protein} g · C ${n.carb} g · F ${n.fat} g · ${t('d.n.fibre')} ${n.fibre} g${n.caffeine > 0 ? ` · ${t('d.n.caffeine')} ${Math.round(n.caffeine)} mg` : ''}`; };
    UI.sheet({
      title: t('dp.title'), wide: true,
      body: `<p class="small muted mb-2">${esc(t('dp.sub'))}</p><div id="dp"></div>`,
      onMount(s, close) {
        const box = s.querySelector('#dp');
        const draw = () => {
          const cam = `<input type="file" accept="image/*" capture="environment" class="sr-only" data-pick>`;
          const gal = `<input type="file" accept="image/*" class="sr-only" data-pick>`;
          let html = '';
          if (!img) html += `<div class="photo-drop static">${icon('image')}<b>${esc(t('dp.pick'))}</b><span class="hint">${esc(t('dp.pick.hint'))}</span><div class="pick-row"><label class="btn primary">${icon('camera')}${esc(t('ai.take'))}${cam}</label><label class="btn secondary">${icon('image')}${esc(t('ai.gallery'))}${gal}</label></div></div>`;
          else html += `<div class="photo-drop has-img static" style="${items ? 'min-height:150px' : ''}"><img src="${img.thumbBig}" alt=""><div class="pick-row overlay"><label class="btn sm">${icon('camera')}${esc(t('dp.retake'))}${cam}</label><label class="btn sm">${icon('image')}${esc(t('ai.gallery'))}${gal}</label></div></div>`;
          if (img && !items && !busy) html += `<button class="btn primary block mt-2" data-analyze>${icon('sparkle')}${esc(t('dp.analyze'))}</button>`;
          if (busy) html += `<div class="busy">${UI.spinner('lg')}<span class="grow">${esc(t('dp.analyzing'))}</span><button class="btn sm secondary" data-cancel>${esc(t('c.cancel'))}</button></div>`;
          if (err) html += `<div class="alert urgent mt-2"><div class="ic">${icon('alert')}</div><div class="grow"><div class="d">${esc(err)}</div></div></div><button class="btn secondary block mt-2" data-analyze>${esc(t('c.retry'))}</button>`;
          if (items) {
            if (!items.length) html += `<div class="empty"><div class="big">🍽️</div>${esc(t('dp.none'))}</div><button class="btn secondary block" data-analyze>${esc(t('dp.retry'))}</button>`;
            else {
              html += `<div class="eyebrow mt-3 mb-1">${esc(t('dp.items'))}</div><div data-items>${items.map((it, i) => `<div class="ai-item" data-i="${i}"><div class="n">${esc(it.name)}${confTag(it.confidence)}${it.matched ? `<span class="conf" title="${esc(t('dp.matched'))}">${esc(t('dp.matched'))}</span>` : ''}</div><div class="g"><input class="input" type="number" inputmode="numeric" min="1" max="3000" value="${it.grams}" data-g="${i}"><span>g</span><button class="rm" data-rm="${i}" aria-label="${esc(t('c.remove'))}">${icon('x')}</button></div><div class="m">${esc(itemMeta(it))}</div></div>`).join('')}</div>
                <div class="mt-3" data-tot>${totalsHTML(items)}</div>
                ${notes ? `<div class="notice mt-2"><b>${esc(t('dp.notes'))}</b> · ${esc(notes)}</div>` : ''}
                <div class="field mt-3"><label>${esc(t('dp.addto'))} · ${esc(UI.fmtRelDay(day))}</label><div class="seg block" data-meals>${MEALS.map(m => `<button class="${m === mealSel ? 'active' : ''}" data-meal="${m}">${esc(t('d.meal.' + m))}</button>`).join('')}</div></div>
                <button class="btn primary block mt-2" data-add>${icon('plus')}${esc(t('dp.add', { n: items.length }))}</button>
                <div class="row mt-2" style="gap:8px"><button class="btn sm ghost" data-analyze>${icon('refresh')}${esc(t('dp.retry'))}</button></div>
                <p class="xs subtle mt-2">${esc(t('dp.est'))}</p>`;
            }
          }
          box.innerHTML = html;
        };
        const analyze = async () => {
          if (!img || busy) return;
          busy = true; err = ''; items = null; ctrl = new AbortController(); draw();
          try { const r = await AI.analyzeMeal(img.full, { signal: ctrl.signal }); items = r.items; notes = r.notes; }
          catch (e) { console.warn(e); if (!(e && e.code === 'aborted')) err = t(AI.errorKey(e)); }
          busy = false; ctrl = null; draw();
        };
        box.addEventListener('change', async e => {
          const inp = e.target.closest('[data-pick]');
          if (inp && inp.files && inp.files[0]) {
            try { const full = await AI.compressImage(inp.files[0], 1024); img = { full, thumbBig: await AI.compressImage(full, 480, 0.7) }; items = null; err = ''; draw(); }
            catch (e2) { toast(t('ai.err.image'), 'danger'); }
          }
        });
        box.addEventListener('input', e => {
          const g = e.target.closest('[data-g]'); if (!g) return;
          const v = Math.max(0, +g.value || 0); const it = items[+g.dataset.g]; it.grams = v || 1;
          g.closest('.ai-item').querySelector('.m').textContent = itemMeta(it);
          box.querySelector('[data-tot]').innerHTML = totalsHTML(items);
          box.querySelector('[data-add]').innerHTML = `${icon('plus')}${esc(t('dp.add', { n: items.length }))}`;
        });
        box.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.hasAttribute('data-analyze')) analyze();
          else if (b.hasAttribute('data-cancel')) { if (ctrl) ctrl.abort(); }
          else if (b.dataset.rm != null) { items.splice(+b.dataset.rm, 1); draw(); }
          else if (b.dataset.meal) { mealSel = b.dataset.meal; box.querySelectorAll('[data-meal]').forEach(x => x.classList.toggle('active', x === b)); }
          else if (b.hasAttribute('data-add')) {
            const valid = items.filter(it => it.grams > 0);
            if (!valid.length) return;
            const base = Date.now(); const tot = totalsOf(valid);
            Store.update(x => { valid.forEach((it, i) => x.meals.push({ date: day, meal: mealSel, name: it.name, grams: Math.round(it.grams), n: AI.itemNutrients(it), src: 'photo', ts: base + i })); });
            toast(t('dp.added', { n: valid.length, kcal: fmtEnergy(tot.kcal) }), 'ok'); close(); UI.render();
          }
        });
        s.closest('.sheet-backdrop').addEventListener('sheet-close', () => { if (ctrl) ctrl.abort(); });
        draw();
      },
    });
  }
  function guessMeal() { const h = new Date().getHours(); return h < 10.5 ? 'breakfast' : h < 14.5 ? 'lunch' : h < 17 ? 'snack' : h < 21 ? 'dinner' : 'snack'; }

  // ---------------------------------------------------------------------------
  // Shared: history import sheet (Diet + Exercise)
  // ---------------------------------------------------------------------------
  const norm = s => AI.normName(s);
  // Same day + slot and (same normalised name | matches the same DB food | similar name with energy within 10%).
  function mealDup(st, m) {
    const nm = norm(m.name); if (!nm) return false;
    const kcal = m.n ? m.n.kcal : 0;
    const dbName = x => { const f = x.foodId ? Content.FOODS.find(ff => ff.id === x.foodId) : null; return f ? [norm(f.zh), norm(f.en)] : [norm(x.name)]; };
    return st.meals.some(x => {
      if (x.date !== m.date || x.meal !== m.meal) return false;
      const names = dbName(x);
      if (names.includes(nm)) return true;
      const similar = names.some(n => n && n.length >= 2 && (n.includes(nm) || nm.includes(n)));
      if (!similar) return false;
      const xk = x.n ? x.n.kcal : (() => { const n = Engine.entryNutrients(x); return n ? n.kcal : 0; })();
      return !kcal || !xk || Math.abs(xk - kcal) <= Math.max(15, 0.1 * Math.max(xk, kcal));
    });
  }
  const workoutDup = (st, w) => st.workouts.some(x => x.date === w.date && x.type === w.type && Math.abs(x.minutes - w.minutes) <= Math.max(2, 0.1 * w.minutes));
  const seenImage = (st, hash) => (st.imports || []).some(i => i.hash === hash);

  function importHistory(kind = 'both') {
    if (AI.status() === 'off') return notReady();
    let imgs = [], busy = false, err = '', res = null, sel = { m: [], w: [] }, ctrl = null, seenAll = false;
    const today = Store.todayStr();
    UI.sheet({
      title: t(kind === 'diet' ? 'imp.title.diet' : kind === 'exercise' ? 'imp.title.exercise' : 'imp.title'), wide: true,
      body: `<p class="small muted mb-2">${esc(t('imp.sub'))}</p><div id="imp"></div>`,
      onMount(s, close) {
        const box = s.querySelector('#imp');
        const count = () => sel.m.filter(Boolean).length + sel.w.filter(Boolean).length;
        const draw = () => {
          let html = '';
          if (!res) {
            html += `<div class="thumbs">${imgs.map((im, i) => `<div class="th ${im.seen ? 'seen' : ''}"><img src="${im.thumb}" alt="">${im.seen ? `<span class="tag">${esc(t('imp.seen.tag'))}</span>` : ''}<button class="rm" data-rmimg="${i}" aria-label="${esc(t('c.remove'))}">${icon('x')}</button></div>`).join('')}${imgs.length < 8 ? `<label class="add" aria-label="${esc(t('ai.take'))}">${icon('camera')}<span>${esc(t('ai.take'))}</span><input type="file" accept="image/*" capture="environment" class="sr-only" data-pick></label><label class="add" aria-label="${esc(t('ai.gallery'))}">${icon('image')}<span>${esc(t('ai.gallery'))}</span><input type="file" accept="image/*" multiple class="sr-only" data-pick></label>` : ''}</div>
              ${!imgs.length ? `<p class="xs subtle mt-1">${esc(t('imp.pick'))}</p>` : ''}
              ${imgs.some(im => im.seen) ? `<div class="notice mt-2">${esc(t('imp.seen'))}</div>` : ''}
              ${busy ? `<div class="busy">${UI.spinner('lg')}<span class="grow">${esc(t('imp.analyzing'))}</span><button class="btn sm secondary" data-cancel>${esc(t('c.cancel'))}</button></div>` : `<button class="btn primary block mt-3" data-analyze ${imgs.length ? '' : 'disabled'}>${icon('sparkle')}${esc(t('imp.analyze', { n: imgs.length }))}</button>`}
              ${err ? `<div class="alert urgent mt-2"><div class="ic">${icon('alert')}</div><div class="grow"><div class="d">${esc(err)}</div></div></div>` : ''}`;
          } else {
            const total = res.meals.length + res.workouts.length;
            const dups = res.meals.filter(m => m.dup).length + res.workouts.filter(w => w.dup).length;
            html += `<div class="row between"><b class="small">${esc(t('imp.found', { m: res.meals.length, w: res.workouts.length }))}</b>${total ? `<div class="row" style="gap:4px"><button class="btn sm ghost" data-selall>${esc(t('imp.selectall'))}</button><button class="btn sm ghost" data-selnone>${esc(t('imp.selectnone'))}</button></div>` : ''}</div>
              ${dups ? `<p class="xs subtle mt-1">${esc(t('imp.dup.note', { n: dups }))}</p>` : ''}`;
            if (!total) html += `<div class="empty"><div class="big">🗂️</div>${esc(t('imp.none'))}</div>`;
            if (res.meals.length) html += `<div class="imp-group"><div class="eyebrow mb-1">${esc(t('imp.meals'))}</div>${res.meals.map((m, i) => `<div class="imp-row ${m.dup ? 'dup' : ''}"><button class="cb" role="checkbox" aria-checked="${!!sel.m[i]}" data-cbm="${i}">${sel.m[i] ? icon('check') : ''}</button><div><div class="t">${esc(m.name)}${m.dup ? `<span class="chip warn xs">${esc(t('imp.dup'))}</span>` : ''}</div><div class="f"><input type="date" class="input" value="${m.date}" max="${today}" data-mf="date" data-i="${i}"><select class="input" data-mf="meal" data-i="${i}">${MEALS.map(k => `<option value="${k}" ${k === m.meal ? 'selected' : ''}>${esc(t('d.meal.' + k))}</option>`).join('')}</select><input type="number" class="input" value="${m.grams}" min="1" data-mf="grams" data-i="${i}" aria-label="g"><span class="xs subtle">g</span><input type="number" class="input" value="${m.n.kcal}" min="0" data-mf="kcal" data-i="${i}" aria-label="kcal"><span class="xs subtle">kcal</span></div><div class="xs subtle mt-1">P ${m.n.protein} g · C ${m.n.carb} g · F ${m.n.fat} g · ${esc(t('d.n.fibre'))} ${m.n.fibre} g${m.n.caffeine > 0 ? ` · ${esc(t('d.n.caffeine'))} ${Math.round(m.n.caffeine)} mg` : ''}</div></div></div>`).join('')}</div>`;
            if (res.workouts.length) html += `<div class="imp-group"><div class="eyebrow mb-1">${esc(t('imp.workouts'))}</div>${res.workouts.map((w, i) => `<div class="imp-row ${w.dup ? 'dup' : ''}"><button class="cb" role="checkbox" aria-checked="${!!sel.w[i]}" data-cbw="${i}">${sel.w[i] ? icon('check') : ''}</button><div><div class="t">${esc(t('e.type.' + w.type))}${w.note ? `<span class="xs subtle" style="font-weight:500">${esc(w.note)}</span>` : ''}${w.dup ? `<span class="chip warn xs">${esc(t('imp.dup'))}</span>` : ''}</div><div class="f"><input type="date" class="input" value="${w.date}" max="${today}" data-wf="date" data-i="${i}"><select class="input" data-wf="type" data-i="${i}">${AI.WORKOUT_TYPES.map(k => `<option value="${k}" ${k === w.type ? 'selected' : ''}>${esc(t('e.type.' + k))}</option>`).join('')}</select><input type="number" class="input" value="${w.minutes}" min="1" max="600" data-wf="minutes" data-i="${i}" aria-label="min"><span class="xs subtle">${esc(t('c.min'))}</span></div></div></div>`).join('')}</div>`;
            if (res.notes) html += `<p class="xs subtle mt-2">${esc(res.notes)}</p>`;
            html += `<div class="row mt-3" style="gap:8px"><button class="btn secondary" data-again>${icon('chevL')}${esc(t('c.back'))}</button><button class="btn primary grow" data-import ${count() ? '' : 'disabled'}>${esc(t('imp.import', { n: count() }))}</button></div>`;
          }
          box.innerHTML = html;
        };
        const refreshImportBtn = () => { const b = box.querySelector('[data-import]'); if (b) { b.disabled = !count(); b.textContent = t('imp.import', { n: count() }); } };
        const analyze = async () => {
          if (!imgs.length || busy) return;
          busy = true; err = ''; ctrl = new AbortController(); seenAll = imgs.every(im => im.seen); draw();
          try {
            const r = await AI.importHistory(imgs.map(x => x.full), kind, { signal: ctrl.signal });
            const st = Store.state;
            r.meals.forEach(m => { m.dup = seenAll || mealDup(st, m); });
            r.workouts.forEach(w => { w.dup = seenAll || workoutDup(st, w); });
            res = r; sel = { m: r.meals.map(m => !m.dup), w: r.workouts.map(w => !w.dup) };
          } catch (e) { console.warn(e); if (!(e && e.code === 'aborted')) err = t(AI.errorKey(e)); }
          busy = false; ctrl = null; draw();
        };
        box.addEventListener('change', async e => {
          const inp = e.target.closest('[data-pick]');
          if (inp && inp.files && inp.files.length) {
            const files = Array.from(inp.files).slice(0, 8 - imgs.length);
            try { for (const f of files) { const full = await AI.compressImage(f, 1280, 0.85); const hash = AI.imageHash(full); imgs.push({ full, hash, seen: seenImage(Store.state, hash), thumb: await AI.compressImage(full, 200, 0.7) }); } }
            catch (e2) { toast(t('ai.err.image'), 'danger'); }
            draw(); return;
          }
          const mf = e.target.closest('[data-mf]');
          if (mf) { const m = res.meals[+mf.dataset.i]; const k = mf.dataset.mf; if (k === 'kcal') m.n.kcal = Math.max(0, Math.round(+mf.value || 0)); else if (k === 'grams') m.grams = Math.max(1, Math.round(+mf.value || 1)); else if (k === 'date') { if (mf.value && mf.value <= today) m.date = mf.value; else mf.value = m.date; } else m[k] = mf.value; return; }
          const wf = e.target.closest('[data-wf]');
          if (wf) { const w = res.workouts[+wf.dataset.i]; const k = wf.dataset.wf; if (k === 'minutes') w.minutes = Math.max(1, Math.round(+wf.value || 1)); else if (k === 'date') { if (wf.value && wf.value <= today) w.date = wf.value; else wf.value = w.date; } else w[k] = wf.value; }
        });
        box.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.rmimg != null) { imgs.splice(+b.dataset.rmimg, 1); draw(); }
          else if (b.hasAttribute('data-analyze')) analyze();
          else if (b.hasAttribute('data-cancel')) { if (ctrl) ctrl.abort(); }
          else if (b.dataset.cbm != null) { const i = +b.dataset.cbm; sel.m[i] = !sel.m[i]; b.setAttribute('aria-checked', sel.m[i]); b.innerHTML = sel.m[i] ? icon('check') : ''; refreshImportBtn(); }
          else if (b.dataset.cbw != null) { const i = +b.dataset.cbw; sel.w[i] = !sel.w[i]; b.setAttribute('aria-checked', sel.w[i]); b.innerHTML = sel.w[i] ? icon('check') : ''; refreshImportBtn(); }
          else if (b.hasAttribute('data-selall')) { sel = { m: res.meals.map(() => true), w: res.workouts.map(() => true) }; draw(); }
          else if (b.hasAttribute('data-selnone')) { sel = { m: res.meals.map(() => false), w: res.workouts.map(() => false) }; draw(); }
          else if (b.hasAttribute('data-again')) { res = null; draw(); }
          else if (b.hasAttribute('data-import')) {
            const meals = res.meals.filter((m, i) => sel.m[i]), workouts = res.workouts.filter((w, i) => sel.w[i]);
            if (!meals.length && !workouts.length) return;
            const base = Date.now();
            Store.update(x => {
              meals.forEach((m, i) => x.meals.push({ date: m.date, meal: m.meal, name: m.name, grams: m.grams, n: Object.assign({}, m.n), src: 'import', ts: base + i }));
              workouts.forEach((w, i) => x.workouts.push({ date: w.date, type: w.type, minutes: w.minutes, src: 'import', ts: base + 1000 + i }));
              x.imports = (x.imports || []).concat(imgs.map(im => ({ hash: im.hash, ts: base }))).slice(-200);
            });
            toast(t('imp.done', { m: meals.length, w: workouts.length }), 'ok'); close(); UI.render();
          }
        });
        s.closest('.sheet-backdrop').addEventListener('sheet-close', () => { if (ctrl) ctrl.abort(); });
        draw();
      },
    });
  }

  window.AISheets = { notReady, photoMeal, importHistory, mealDup, workoutDup };

  // ---------------------------------------------------------------------------
  // Chat screen  #/ai
  // ---------------------------------------------------------------------------
  let draft = { text: '', images: [], audio: null };   // images: [{full, thumb}]
  let busy = false, lastReq = null, rec = null, recKind = null, ctrl = null, partial = '';
  const MAX_MSGS = 200, MAX_THUMB_MSGS = 40; // keep localStorage well under the ~5 MB quota
  const chats = () => Store.state.aiChats || [];

  function render() {
    const stt = AI.status();
    return `<div class="ai-head">
        <button class="back" data-act="back" aria-label="${esc(t('c.back'))}">${icon('chevL')}</button>
        ${Mascot.mascot({ size: 40, mood: 'happy', animate: true })}
        <h1>${esc(t('ai.title'))}<span class="sub">${esc(t('ai.sub'))}</span></h1>
        <a class="status-pill ${stt}" href="#/me/ai" style="text-decoration:none">${esc(t('m.ai.sub.' + stt))}</a>
        <button class="btn icon ghost sm" data-act="clear" aria-label="${esc(t('ai.clear'))}" ${chats().length ? '' : 'disabled'}>${icon('trash')}</button>
      </div>
      <div class="chat" id="chat" aria-live="polite">${messagesHTML()}</div>
      <div class="composer">
        <div class="attach" id="ai-attach" hidden></div>
        <div class="state" id="ai-state" hidden></div>
        <div class="row">
          <button class="btn icon" data-act="pick" title="${esc(t('ai.photo'))}" aria-label="${esc(t('ai.photo'))}">${icon('camera')}</button>
          <input type="file" accept="image/*" capture="environment" class="sr-only" id="ai-photo-cam" data-chatpick><input type="file" accept="image/*" multiple class="sr-only" id="ai-photo" data-chatpick>
          <button class="btn icon" data-act="voice" id="ai-voice" title="${esc(t('ai.voice'))}" aria-label="${esc(t('ai.voice'))}">${icon('mic')}</button>
          <textarea id="ai-text" rows="1" placeholder="${esc(t('ai.ph'))}" aria-label="${esc(t('ai.ph'))}">${esc(draft.text)}</textarea>
          <button class="btn icon send" data-act="send" id="ai-send" aria-label="${esc(t('ai.send'))}">${icon('send')}</button>
        </div>
        <div class="foot">${esc(t('ai.disclaimer'))}</div>
      </div>`;
  }

  function messagesHTML() {
    const list = chats();
    let html = '';
    if (!list.length) {
      html += `<div class="intro">${Mascot.mascot({ size: 96, mood: 'happy' })}<p class="lead">${esc(t('ai.intro'))}</p>
        <div class="sug">${[1, 2, 3, 4, 5, 6].map(i => `<button data-sug="${esc(t('ai.sug.' + i))}">${esc(t('ai.sug.' + i))}</button>`).join('')}</div></div>`;
    }
    html += list.map(msgHTML).join('');
    if (busy) html += `<div class="msg ai" id="ai-live"><div class="av">${Mascot.mascot({ size: 30, mood: 'happy', animate: false })}</div><div class="bub"><div data-partial>${partial ? UI.mdLite(partial) : ''}</div><div class="row" style="gap:8px;margin-top:${partial ? 8 : 0}px"><span class="typing"><i></i><i></i><i></i></span><button class="btn sm secondary" data-act="stop">${icon('stop')}${esc(t('ai.stop'))}</button></div></div></div>`;
    return html;
  }
  function msgHTML(m) {
    const time = `<time>${esc(UI.fmtTime(m.ts))}</time>`;
    if (m.role === 'user') {
      const pics = m.thumbs && m.thumbs.length ? `<div class="pics">${m.thumbs.map(s => `<img src="${s}" alt="">`).join('')}</div>` : (m.hadPhoto ? `<div class="pics"><span class="chip xs">${icon('image')}${esc(t('ai.photo.gone'))}</span></div>` : '');
      const txt = m.text ? esc(m.text) : (m.voice ? esc(t('ai.voice.q')) : '');
      return `<div class="msg me" data-id="${m.id}"><div class="bub">${pics}${txt}${time}</div></div>`;
    }
    const av = `<div class="av">${Mascot.mascot({ size: 30, mood: m.error ? 'calm' : 'happy', animate: false })}</div>`;
    if (m.error) return `<div class="msg ai" data-id="${m.id}"><div class="bub err">${esc(t(m.error))}${lastReq ? ` <button class="btn sm secondary mt-1" data-act="retry">${esc(t('c.retry'))}</button>` : ''}${time}</div></div>`;
    const d = m.data || {};
    const verdict = d.verdict ? `<span class="verdict ${esc(d.verdict)}">${esc(d.verdict === 'info' ? t('ai.verdict.info') : t('d.verdict.' + d.verdict))}</span>` : '';
    const tips = d.tips && d.tips.length ? `<div class="tips"><div class="eyebrow">${esc(t('ai.tips'))}</div><ul>${d.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    const care = d.seekCare ? `<div class="care">${icon('alert')}<span>${esc(t('ai.care'))} <a href="#/tools/sos" style="color:inherit">${esc(t('t.sos'))} ›</a></span></div>` : '';
    const src = d.sources && d.sources.length ? `<div class="src">${esc(t('ai.sources'))}: ${d.sources.map(esc).join(' · ')}</div>` : '';
    return `<div class="msg ai" data-id="${m.id}">${av}<div class="bub">${verdict}${d.title ? `<div class="ttl">${esc(d.title)}</div>` : ''}${UI.mdLite(m.text)}${tips}${care}${src}${m.demo ? `<span class="demo-tag">${esc(t('ai.demo.tag'))}</span>` : ''}${time}</div></div>`;
  }

  function redrawChat(root) {
    const c = root.querySelector('#chat'); if (!c) return;
    c.innerHTML = messagesHTML();
    const clr = root.querySelector('[data-act="clear"]'); if (clr) clr.disabled = !chats().length;
    requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  }
  function redrawAttach(root) {
    const a = root.querySelector('#ai-attach'); if (!a) return;
    const has = draft.images.length || draft.audio;
    a.hidden = !has;
    a.innerHTML = draft.images.map((im, i) => `<div class="th"><img src="${im.thumb}" alt=""><button class="rm" data-rmimg="${i}" aria-label="${esc(t('c.remove'))}">${icon('x')}</button></div>`).join('')
      + (draft.audio ? `<span class="audio">${icon('mic')}${esc(t('ai.audio.clip'))} ${draft.audio.secs ? draft.audio.secs + 's' : ''}<button data-rmaudio aria-label="${esc(t('c.remove'))}">${icon('x')}</button></span>` : '');
  }
  function setState(root, msg) { const s = root.querySelector('#ai-state'); if (!s) return; s.hidden = !msg; s.textContent = msg || ''; }
  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; }

  function pushMsg(m) {
    Store.update(s => {
      s.aiChats = s.aiChats || []; s.aiChats.push(m);
      if (s.aiChats.length > MAX_MSGS) s.aiChats.splice(0, s.aiChats.length - MAX_MSGS);
      // keep only the most recent photo thumbnails; older messages keep their text
      let withThumbs = s.aiChats.filter(x => x.thumbs && x.thumbs.length).length;
      for (const x of s.aiChats) { if (withThumbs <= MAX_THUMB_MSGS) break; if (x.thumbs && x.thumbs.length) { x.thumbs = []; x.hadPhoto = true; withThumbs--; } }
    });
  }
  // Camera-or-gallery chooser for the composer. Desktop (no coarse pointer) goes straight to the file picker.
  function pickSource(root) {
    const cam = root.querySelector('#ai-photo-cam'), gal = root.querySelector('#ai-photo');
    if (!gal) return;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!touch || !cam) { gal.click(); return; }
    UI.sheet({
      title: t('ai.photo'),
      body: `<div class="choice-group"><button class="choice" data-src="cam"><span class="lead">${icon('camera')}</span><div class="grow"><div class="t">${esc(t('ai.take'))}</div><div class="d">${esc(t('ai.take.d'))}</div></div></button><button class="choice" data-src="gal"><span class="lead">${icon('image')}</span><div class="grow"><div class="t">${esc(t('ai.gallery'))}</div><div class="d">${esc(t('ai.gallery.d'))}</div></div></button></div>`,
      onMount(s, close) { s.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => { close(); (b.dataset.src === 'cam' ? cam : gal).click(); })); },
    });
  }
  function offlineState(root) {
    const off = typeof navigator !== 'undefined' && navigator.onLine === false && AI.status() !== 'demo';
    setState(root, off ? t('ai.offline') : '');
    return off;
  }

  async function send(root, override) {
    if (busy) return;
    const ta = root.querySelector('#ai-text');
    if (rec) await stopVoice(root); // flush final transcript / audio clip first
    const text = override != null ? override : (ta ? ta.value.trim() : draft.text.trim());
    if (!text && !draft.images.length && !draft.audio) return;
    if (AI.status() === 'off') { notReady(); return; }
    if (offlineState(root)) { toast(t('ai.offline')); return; }
    const req = { text, images: draft.images.map(x => x.full), audio: draft.audio, thumbs: draft.images.map(x => x.thumb) };
    draft = { text: '', images: [], audio: null };
    if (ta) { ta.value = ''; autosize(ta); }
    redrawAttach(root); setState(root, '');
    const userMsg = { id: Store.uid(), role: 'user', ts: Date.now(), text, thumbs: req.thumbs, voice: !!req.audio };
    pushMsg(userMsg);
    await run(root, req, userMsg.id);
  }
  async function run(root, req, userId) {
    lastReq = req; busy = true; redrawChat(root);
    const history = chats().filter(m => m.id !== userId && !m.error).slice(-8).map(m => ({ role: m.role, text: m.role === 'ai' ? [m.data && m.data.title, m.text].filter(Boolean).join('\n') : m.text }));
    ctrl = new AbortController(); partial = '';
    let lastPaint = 0;
    const onDelta = txt => {
      partial = txt; const now = Date.now(); if (now - lastPaint < 80) return; lastPaint = now;
      const el = root.querySelector('#ai-live [data-partial]'); if (!el) return;
      el.innerHTML = UI.mdLite(txt); el.nextElementSibling.style.marginTop = txt ? '8px' : '0';
      const c = root.querySelector('#chat'); if (c && c.scrollHeight - c.scrollTop - c.clientHeight < 160) c.scrollTop = c.scrollHeight;
    };
    try {
      const a = await AI.ask({ text: req.text, images: req.images, audio: req.audio, history, signal: ctrl.signal, onDelta });
      if (a.transcript && !req.text) Store.update(s => { const u = (s.aiChats || []).find(m => m.id === userId); if (u) u.text = a.transcript; });
      pushMsg({ id: Store.uid(), role: 'ai', ts: Date.now(), text: a.text, data: { verdict: a.verdict, title: a.title, tips: a.tips, sources: a.sources, seekCare: a.seekCare }, demo: AI.status() === 'demo' });
      lastReq = null;
    } catch (e) {
      console.warn('AI', e);
      pushMsg({ id: Store.uid(), role: 'ai', ts: Date.now(), error: AI.errorKey(e) });
    }
    busy = false; ctrl = null; partial = ''; redrawChat(root);
  }
  function stop() { if (ctrl) ctrl.abort(); }
  async function retry(root) {
    if (!lastReq || busy) return;
    // drop the error bubble, re-run against the same user message
    let userId = null;
    Store.update(s => { const l = s.aiChats || []; if (l.length && l[l.length - 1].error) l.pop(); const u = l.slice().reverse().find(m => m.role === 'user'); userId = u && u.id; });
    await run(root, lastReq, userId);
  }

  // --- Voice: Web Speech API (live transcript) → MediaRecorder clip (sent to the model) ---
  let recDone = null; // resolves once the recorder/recogniser has flushed its result
  function stopVoice(root) {
    const r = rec, kind = recKind, done = recDone;
    rec = null; recKind = null; recDone = null;
    const b = root.querySelector('#ai-voice'); if (b) { b.classList.remove('rec'); b.innerHTML = icon('mic'); }
    setState(root, '');
    try { if (kind === 'sr') r.stop(); else if (kind === 'mr' && r.state !== 'inactive') r.stop(); } catch (e) { return Promise.resolve(); }
    return done ? Promise.race([done, new Promise(res => setTimeout(res, 2500))]) : Promise.resolve();
  }
  async function toggleVoice(root) {
    if (rec) { stopVoice(root); return; }
    const btn = root.querySelector('#ai-voice'), ta = root.querySelector('#ai-text');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.lang = I18N.lang === 'zh' ? 'zh-CN' : 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      const base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
      let finish; recDone = new Promise(res => { finish = res; });
      r.onresult = ev => { let s = ''; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; ta.value = base + s; draft.text = ta.value; autosize(ta); };
      r.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') toast(t('ai.voice.denied'), 'danger'); else if (ev.error !== 'aborted' && ev.error !== 'no-speech') toast(t('ai.voice.unsupported')); if (rec === r) stopVoice(root); };
      r.onend = () => { finish(); if (rec === r) { stopVoice(root); ta.focus(); } };
      try { r.start(); } catch (e) { toast(t('ai.voice.unsupported')); recDone = null; return; }
      rec = r; recKind = 'sr'; btn.classList.add('rec'); btn.innerHTML = icon('stop'); setState(root, t('ai.listening'));
      return;
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { toast(t('ai.voice.denied'), 'danger'); return; }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = []; const started = Date.now();
      let finish; recDone = new Promise(res => { finish = res; });
      mr.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(tr => tr.stop());
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' });
          if (blob.size >= 1000) {
            const dataURL = await AI.fileToDataURL(blob);
            draft.audio = { dataURL, mime: (blob.type || 'audio/webm').split(';')[0], secs: Math.round((Date.now() - started) / 1000) };
            redrawAttach(root);
          }
        } finally { finish(); }
      };
      mr.start(250);
      rec = mr; recKind = 'mr'; btn.classList.add('rec'); btn.innerHTML = icon('stop'); setState(root, t('ai.recording'));
      return;
    }
    toast(t('ai.voice.unsupported'));
  }

  function mount(root) {
    const ta = root.querySelector('#ai-text'), chat = root.querySelector('#chat');
    if (!ta || !chat) return;
    redrawAttach(root);
    requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
    offlineState(root);
    const onNet = () => offlineState(root);
    window.addEventListener('online', onNet); window.addEventListener('offline', onNet);
    netCleanup = () => { window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet); };
    ta.addEventListener('input', () => { draft.text = ta.value; autosize(ta); });
    ta.addEventListener('focus', () => setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 300));
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(min-width: 560px)').matches) { e.preventDefault(); send(root); } });
    root.addEventListener('change', async e => {
      if (e.target.hasAttribute('data-chatpick') && e.target.files && e.target.files.length) {
        const files = Array.from(e.target.files).slice(0, 4 - draft.images.length);
        try { for (const f of files) { const full = await AI.compressImage(f, 1024); draft.images.push({ full, thumb: await AI.thumb(full) }); } }
        catch (err) { toast(t('ai.err.image'), 'danger'); }
        e.target.value = ''; redrawAttach(root);
      }
    });
    root.addEventListener('click', async e => {
      const sug = e.target.closest('[data-sug]'); if (sug) { send(root, sug.dataset.sug); return; }
      const rmi = e.target.closest('[data-rmimg]'); if (rmi) { draft.images.splice(+rmi.dataset.rmimg, 1); redrawAttach(root); return; }
      if (e.target.closest('[data-rmaudio]')) { draft.audio = null; redrawAttach(root); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'send') send(root);
      else if (act === 'pick') pickSource(root);
      else if (act === 'stop') stop();
      else if (act === 'voice') toggleVoice(root);
      else if (act === 'retry') retry(root);
      else if (act === 'clear') { if (await UI.confirm(t('ai.clear.confirm'), { danger: true, okText: t('c.delete') })) { Store.update(s => { s.aiChats = []; }); lastReq = null; redrawChat(root); } }
    });
  }
  // stop any live recording when leaving the screen (router calls unmount)
  let netCleanup = null;
  UI.Views.ai = { render, mount, unmount() { if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } rec = null; recKind = null; recDone = null; } stop(); busy = false; partial = ''; if (netCleanup) { netCleanup(); netCleanup = null; } } };
})();
