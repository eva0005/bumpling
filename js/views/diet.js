/* Diet — energy & nutrient targets by region/trimester, food logging, traffic light, myths, scenario recipes, GDM mode (PRD §6.3, §6.9) */
(function () {
  'use strict';
  const { esc, icon, L, fmtEnergy, ring, stdBadge, sourceNote, toast } = UI;
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  let day = null; // date being viewed
  let tab = 'log';

  const NUTR = [['protein', 'g'], ['fiber', 'g'], ['folate', 'μg'], ['iron', 'mg'], ['calcium', 'mg'], ['iodine', 'μg'], ['dha', 'mg']];

  // Meal items may be library foods (foodId) or free-form / AI-estimated foods (custom, per 100 g)
  const mealItemName = x => {
    if (x.custom) return x.custom.name;
    const f = Content.FOODS.find(ff => ff.id === x.foodId);
    return f ? L({ zh: f.zh, en: f.en }) : null;
  };
  const mealItemNutrients = x => {
    if (x.custom) return Content.customNutrients(x.custom, x.grams);
    const f = Content.FOODS.find(ff => ff.id === x.foodId);
    return f ? Content.foodNutrients(f, x.grams) : { kcal: 0 };
  };
  const mealItemKcal = x => mealItemNutrients(x).kcal || 0;
  const defaultMeal = () => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; };

  function render(params) {
    const st = Store.state;
    day = day || Store.todayStr();
    const targets = Engine.nutrientTargets(st, Engine.parseDate(day));
    const energy = Engine.energyTarget(st, Engine.parseDate(day));
    const intake = Engine.dayIntake(st, day);
    const left = targets.kcal - intake.kcal;
    const gs = Engine.gainStatus(st);
    const variant = Standards.region(st.settings.region).dietVariant;
    const isToday = day === Store.todayStr();
    const cafPct = intake.caffeine / targets.caffeineMax;

    return `${UI.topbar(t('d.title'), false, stdBadge(true))}
      <div class="seg block mb-2" role="tablist">${[['log', 'd.energy'], ['tl', 'd.tl'], ['myths', 'd.myths'], ['scenes', 'd.recipes']].map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'active' : ''}" data-tab="${k}">${esc(t(l))}</button>`).join('')}</div>
      ${tab === 'log' ? `
      <section class="card">
        <div class="card-head"><div class="row"><button class="btn icon ghost sm" data-day="-1" aria-label="prev">${icon('chevL')}</button><h2 class="card-title">${esc(isToday ? t('c.today') : UI.fmtDate(day))}</h2><button class="btn icon ghost sm" data-day="1" aria-label="next" ${isToday ? 'disabled' : ''}>${icon('chevR')}</button></div><span class="xs subtle">${esc(t('d.base', { base: fmtEnergy(energy.base), extra: fmtEnergy(energy.extra, false) }))}</span></div>
        <div class="row" style="gap:18px">
          ${ring(intake.kcal / targets.kcal, esc(fmtEnergy(intake.kcal, false)), esc(t('units.' + st.settings.units.energy)), intake.kcal > targets.kcal * 1.1 ? 'over' : '')}
          <div class="grow stack" style="gap:8px">
            <div class="row between small"><span class="muted">${esc(t('d.target'))}</span><b>${esc(fmtEnergy(targets.kcal))}</b></div>
            <div class="row between small"><span class="muted">${esc(t('d.eaten'))}</span><b>${esc(fmtEnergy(intake.kcal))}</b></div>
            <div class="row between small"><span class="muted">${esc(left >= 0 ? t('d.left') : t('d.over'))}</span><b style="${left < 0 ? 'color:var(--accent)' : ''}">${esc(fmtEnergy(Math.abs(left)))}</b></div>
            ${energy.trimester === 1 ? `<span class="xs subtle">${esc(t('d.t1.note'))}</span>` : ''}
          </div>
        </div>
        ${gs.status === 'high' ? `<div class="notice mt-2">${esc(t('d.trend.fast'))}</div>` : gs.status === 'low' ? `<div class="notice mt-2">${esc(t('d.trend.slow'))}</div>` : ''}
        ${st.settings.gdmMode ? `<div class="notice primary mt-2"><b>${esc(t('d.gdm'))}</b> · ${esc(L(Content.SCENES.gdm.tip))}</div>` : ''}
        <button class="btn soft block mt-2" data-act="photo-estimate" id="btn-photo-estimate">${icon('camera')}${esc(t('d.photo'))}</button>
        <p class="xs subtle mt-1 center">${esc(t('d.photo.d'))}</p>
      </section>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('d.nutrients'))}</h2></div>
        <div class="grid-3 mb-2">${[['protein', 'g'], ['carb', 'g'], ['fat', 'g']].map(([k, u]) => `<div class="stat" style="background:var(--surface-2);border-radius:12px;padding:10px"><div class="v" style="font-size:1.2rem">${Math.round(intake[k])}<small>/${targets[k]} ${u}</small></div><div class="l">${esc(t('d.n.' + k))}</div></div>`).join('')}</div>
        ${(() => { const pk = intake.protein * 4, ck = intake.carb * 4, fk = intake.fat * 9, tot = pk + ck + fk; if (!tot) return ''; const pc = Math.round(pk / tot * 100), cc = Math.round(ck / tot * 100), fc = Math.max(0, 100 - pc - cc); return `<div class="mb-2"><div class="row between xs subtle mb-1"><span>${esc(t('d.macros.ratio'))}</span><span class="num">P ${pc}% · C ${cc}% · F ${fc}%</span></div><div class="macro-bar"><i class="p" style="width:${pc}%"></i><i class="c" style="width:${cc}%"></i><i class="f" style="width:${fc}%"></i></div></div>`; })()}
        ${NUTR.map(([k, u]) => { const p = targets[k] ? intake[k] / targets[k] : 0; return `<div class="nutrient"><span class="n">${esc(t('d.n.' + k))}</span><span class="v">${k === 'folate' || k === 'iodine' || k === 'calcium' || k === 'dha' ? Math.round(intake[k]) : intake[k].toFixed(1)} / ${targets[k]} ${u}</span><div class="bar ${p >= 1 ? 'ok' : p >= 0.6 ? '' : 'warn'}"><i style="width:${Math.min(100, p * 100)}%"></i></div></div>`; }).join('')}
        <div class="nutrient"><span class="n">${esc(t('d.n.caffeine'))}</span><span class="v">${Math.round(intake.caffeine)} / ${targets.caffeineMax} mg ${esc(t('d.n.caffeine.max'))}</span><div class="bar ${cafPct > 1 ? 'danger' : cafPct > 0.75 ? 'warn' : 'accent'}"><i style="width:${Math.min(100, cafPct * 100)}%"></i></div></div>
        ${sourceNote(targets.sourceKey)}
      </section>

      ${MEALS.map(m => { const items = st.meals.filter(x => x.date === day && x.meal === m); const kcal = items.reduce((s, x) => s + mealItemKcal(x), 0);
        return `<section class="card mt-3 pad-sm"><div class="meal-head"><b>${esc(t('d.meal.' + m))}</b><div class="row"><span class="subtle small">${kcal ? esc(fmtEnergy(kcal)) : ''}</span><button class="btn sm soft" data-addmeal="${m}">${icon('plus')}${esc(t('c.add'))}</button></div></div>
          ${items.length ? items.map(x => { const label = mealItemName(x); if (!label) return ''; const n = mealItemNutrients(x); const supp = !x.custom && x.foodId ? (Content.FOODS.find(ff => ff.id === x.foodId) || {}).tags || [] : [];
            return `<div class="food-row" ${x.photoId ? `data-photoview="${x.photoId}" role="button" tabindex="0" title="${esc(t('photo.privacy'))}"` : ''}><div class="grow">${x.photoId ? `<img class="meal-thumb" data-photo="${x.photoId}" alt="${esc(t('photo.add'))}">` : ''}<div class="n">${esc(label)}</div><div class="m">${supp.includes('supplement') ? x.grams + ' ×' : x.grams + ' g'} · ${esc(fmtEnergy(n.kcal))}${x.custom ? ' · ' + esc(t('d.photo.custom')) : ''}</div></div><button class="btn icon ghost" data-delmeal="${x.ts}" aria-label="${esc(t('c.delete'))}">${icon('x')}</button></div>`; }).join('') : ''}
        </section>`; }).join('')}
      ` : ''}

      ${tab === 'tl' ? `
      <section class="card"><div class="card-head"><h2 class="card-title">${esc(t('d.tl'))}</h2><span class="xs subtle">${esc(t('region.' + st.settings.region))}</span></div>
        <h3 class="eyebrow mt-1 mb-1" style="color:var(--ok)">● ${esc(t('d.tl.go'))}</h3>${Content.TRAFFIC.go.map(x => `<div class="tl-food go"><i></i><div><div class="n">${esc(L(x))}</div><div class="w">${esc(L(x.why))}</div></div></div>`).join('')}
        <h3 class="eyebrow mt-3 mb-1" style="color:var(--warn)">● ${esc(t('d.tl.mod'))}</h3>${Content.TRAFFIC.mod[variant].map(x => `<div class="tl-food mod"><i></i><div><div class="n">${esc(L(x))}</div><div class="w">${esc(L(x.why))}</div></div></div>`).join('')}
        <h3 class="eyebrow mt-3 mb-1" style="color:var(--danger)">● ${esc(t('d.tl.stop'))}</h3>${Content.TRAFFIC.stop[variant].map(x => `<div class="tl-food stop"><i></i><div><div class="n">${esc(L(x))}</div><div class="w">${esc(L(x.why))}</div></div></div>`).join('')}
        ${sourceNote(targets.sourceKey)}
      </section>` : ''}

      ${tab === 'myths' ? `
      <section class="card"><div class="card-head"><h2 class="card-title">${esc(t('d.myths'))}</h2></div><p class="small muted mb-2">${esc(t('d.myths.lead'))}</p>
        ${Content.MYTHS[variant].concat(Content.MYTHS[variant === 'cn' ? 'intl' : 'cn'].slice(0, 3)).map((m, i) => `<details class="accordion" ${i === 0 ? 'open' : ''}><summary><span>${esc(L(m.q))}</span>${icon('chevD', 'chev')}</summary><div class="acc-body"><span class="verdict ${m.v}">${esc(t('d.verdict.' + m.v))}</span><p>${esc(L(m.a))}</p></div></details>`).join('')}
      </section>` : ''}

      ${tab === 'scenes' ? `
      <section class="stack">
        <div class="card pad-sm row between"><div><div class="bold">${esc(t('d.gdm'))}</div><div class="xs subtle">${esc(t('d.gdm.d'))}</div></div><button class="switch" role="switch" aria-checked="${st.settings.gdmMode}" data-act="toggle-gdm"></button></div>
        ${Object.keys(Content.SCENES).map(k => { const s = Content.SCENES[k]; return `<details class="card accordion pad-sm" ${k === 'gdm' && st.settings.gdmMode ? 'open' : ''}><summary><span class="bold">${esc(t('d.scene.' + k))}</span>${icon('chevD', 'chev')}</summary><div class="acc-body stack">
          <div><div class="eyebrow mb-1">${esc(t('d.scene.foods'))}</div><div class="chips">${L(s.foods).map(f => `<span class="chip ok">${esc(f)}</span>`).join('')}</div></div>
          <div><div class="eyebrow mb-1">${esc(t('d.scene.avoid'))}</div><div class="chips">${L(s.avoid).map(f => `<span class="chip warn">${esc(f)}</span>`).join('')}</div></div>
          <div class="notice primary"><b>${esc(t('d.scene.tip'))}</b> · ${esc(L(s.tip))}</div></div></details>`; }).join('')}
      </section>` : ''}`;
  }

  function addSheet(meal) {
    const st = Store.state;
    const variant = Standards.region(st.settings.region).dietVariant;
    // Chinese-language users abroad can search Chinese food too (PRD 6.9)
    const pool = Content.FOODS.filter(f => f.variant === 'both' || f.variant === variant || (I18N.lang === 'zh' && f.variant === 'cn'));
    const recentIds = [...new Set(st.meals.slice().sort((a, b) => b.ts - a.ts).map(m => m.foodId))].slice(0, 8);
    const rowFor = f => `<div class="food-row" data-food="${f.id}"><div class="grow"><div class="n">${esc(L({ zh: f.zh, en: f.en }))}</div><div class="m">${f.tags.includes('supplement') ? esc(t('d.supp')) : `${f.serving} g · ${esc(fmtEnergy(Content.foodNutrients(f, f.serving).kcal))}`}</div></div><button class="add" aria-label="${esc(t('c.add'))}">+</button></div>`;
    UI.sheet({
      title: `${t('d.add')} · ${t('d.meal.' + meal)}`,
      body: `<div class="search mb-2">${icon('search')}<input class="input" id="food-q" type="search" placeholder="${esc(t('d.search'))}" autocomplete="off"></div>
        <div id="food-list">${recentIds.length ? `<div class="eyebrow mb-1">${esc(t('d.quick'))}</div>` : ''}${recentIds.map(id => Content.FOODS.find(f => f.id === id)).filter(Boolean).map(rowFor).join('')}${!recentIds.length ? pool.slice(0, 12).map(rowFor).join('') : ''}</div>
        <div id="food-amount" hidden class="mt-2"></div>
        <div class="mt-2">${Photos.pickerHTML('meal-photo', t('photo.add'), true)}</div>`,
      onMount(s, close) {
        let photoId = null;
        Photos.bindPicker(s, 'meal-photo', id => { photoId = id; });
        const q = s.querySelector('#food-q'), list = s.querySelector('#food-list'), amt = s.querySelector('#food-amount');
        q.addEventListener('input', () => {
          const v = q.value.trim().toLowerCase();
          const res = v ? Content.FOODS.filter(f => f.zh.toLowerCase().includes(v) || f.en.toLowerCase().includes(v) || f.tags.some(tg => tg.includes(v))).slice(0, 20) : pool.slice(0, 12);
          list.innerHTML = res.length ? res.map(rowFor).join('') : `<div class="empty">${esc(t('d.noresult'))}</div>`;
        });
        list.addEventListener('click', e => {
          const row = e.target.closest('[data-food]'); if (!row) return;
          const f = Content.FOODS.find(x => x.id === row.dataset.food);
          const supp = f.tags.includes('supplement');
          amt.hidden = false;
          amt.innerHTML = `<div class="card tint"><div class="bold mb-1">${esc(L({ zh: f.zh, en: f.en }))}</div><div class="field"><label>${esc(t('d.serving'))}</label><div class="input-group"><input class="input" type="number" id="food-g" inputmode="decimal" value="${supp ? 1 : f.serving}" min="1"><span class="unit">${supp ? '×' : 'g'}</span></div></div>
            <div class="row mt-2" style="gap:8px">${(supp ? [1, 2] : [0.5, 1, 1.5, 2]).map(m => `<button class="chip selectable" data-mult="${m}">${supp ? m + ' ×' : Math.round(f.serving * m) + ' g'}</button>`).join('')}</div>
            <button class="btn primary block mt-2" id="food-add">${esc(t('c.add'))}</button></div>`;
          amt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          amt.querySelectorAll('[data-mult]').forEach(c => c.addEventListener('click', () => { amt.querySelector('#food-g').value = supp ? +c.dataset.mult : Math.round(f.serving * +c.dataset.mult); }));
          amt.querySelector('#food-add').addEventListener('click', () => {
            const g = +amt.querySelector('#food-g').value; if (!g) return;
            Store.update(x => { x.meals.push(Object.assign({ date: day, meal, foodId: f.id, grams: g, ts: Date.now() }, photoId ? { photoId } : {})); });
            toast(t('d.added', { f: L({ zh: f.zh, en: f.en }) }), 'ok'); close(); UI.render();
          });
        });
      },
    });
  }

  // --- 拍照估算：photo → AI vision → editable items → meal log -------------------
  const typingHTML = () => `<div class="ai-typing"><i></i><i></i><i></i><span>${esc(t('d.photo.thinking'))}</span></div>`;
  const norm100 = (v, grams) => { const g = Math.max(1, grams || 0); return Math.round(((v || 0) * 100 / g) * 10) / 10; };

  function estimateSheet() {
    let meal = defaultMeal(), photoId = null, items = [];
    UI.sheet({
      title: t('d.photo'),
      wide: true,
      body: `<div class="field"><label>${esc(t('d.photo.meal'))}</label><div class="seg block" id="est-meal">${MEALS.map(m => `<button class="${m === meal ? 'active' : ''}" data-estmeal="${m}">${esc(t('d.meal.' + m))}</button>`).join('')}</div></div>
        <div class="mt-2">${Photos.pickerHTML('est-photo', t('photo.add'), true)}</div>
        <div id="est-status" class="mt-2"></div>
        <div id="est-results"></div>
        <div id="est-extra" class="mt-3"></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" id="est-go" disabled>${icon('sparkle')}${esc(t('d.photo.go'))}</button>`,
      onMount(s, close) {
        const go = s.querySelector('#est-go'), status = s.querySelector('#est-status'), res = s.querySelector('#est-results'), extra = s.querySelector('#est-extra');
        Photos.bindPicker(s, 'est-photo', id => { photoId = id; go.disabled = !id; });
        s.querySelectorAll('[data-estmeal]').forEach(b => b.addEventListener('click', () => { meal = b.dataset.estmeal; s.querySelectorAll('[data-estmeal]').forEach(x => x.classList.toggle('active', x === b)); }));

        const vals = it => {
          const g = Math.max(1, it.grams || 0) / 100;
          const f = t('d.n.fiber');
          return `≈ ${Math.round(it.per100.kcal * g)} kcal · P ${Math.round(it.per100.protein * g)}g · C ${Math.round(it.per100.carb * g)}g · F ${Math.round(it.per100.fat * g)}g · ${esc(f)} ${(it.per100.fiber * g).toFixed(1)}g`;
        };
        const totals = () => items.reduce((s, it) => { const g = Math.max(1, it.grams || 0) / 100; s.kcal += it.per100.kcal * g; s.protein += it.per100.protein * g; s.carb += it.per100.carb * g; s.fat += it.per100.fat * g; s.fiber += it.per100.fiber * g; return s; }, { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0 });

        const renderResults = () => {
          if (!items.length) { res.innerHTML = ''; return; }
          const tt = totals();
          res.innerHTML = items.map((it, i) => `<div class="est-item" data-i="${i}">
              <div class="row" style="gap:8px">
                <input class="input est-name grow" data-k="name" value="${esc(it.name)}" aria-label="${esc(t('d.photo.name'))}">
                <div class="input-group est-grams"><input class="input num" data-k="grams" type="number" min="1" value="${it.grams}" aria-label="${esc(t('d.photo.grams'))}"><span class="unit">g</span></div>
              </div>
              <div class="row between xs subtle mt-1"><span class="est-vals num">${vals(it)}</span><span class="chip ${it.matched ? 'ok' : 'info'} xs">${esc(it.matched ? t('d.photo.matched') : t('d.photo.custom'))}</span></div>
              <button class="btn icon ghost sm est-del" aria-label="${esc(t('c.delete'))}" style="position:absolute;top:8px;right:8px">${icon('x')}</button>
            </div>`).join('')
            + `<div class="est-total num">${esc(t('d.photo.total'))} ≈ ${esc(fmtEnergy(tt.kcal))} · P ${Math.round(tt.protein)}g · C ${Math.round(tt.carb)}g · F ${Math.round(tt.fat)}g · ${esc(t('d.n.fiber'))} ${tt.fiber.toFixed(1)}g</div>
            <button class="btn primary block mt-2" id="est-addall">${icon('check')}${esc(t('d.photo.addall'))}</button>
            <p class="xs subtle mt-1">${esc(t('d.photo.conf'))}</p>`;
          res.querySelector('#est-addall').addEventListener('click', addAll);
          res.querySelectorAll('.est-item').forEach(row => {
            const it = items[+row.dataset.i];
            row.querySelector('.est-del').addEventListener('click', () => { items.splice(+row.dataset.i, 1); renderResults(); });
            row.querySelector('[data-k="name"]').addEventListener('input', e => { it.name = e.target.value; });
            row.querySelector('[data-k="grams"]').addEventListener('input', e => { it.grams = Math.max(0, +e.target.value || 0); row.querySelector('.est-vals').textContent = vals(it); });
          });
        };

        const addAll = () => {
          if (!items.length) return;
          Store.update(x => {
            items.forEach((it, i) => {
              const grams = Math.max(1, Math.round(it.grams || 0));
              const rec = { date: day, meal, grams, ts: Date.now() + i };
              if (it.matched) rec.foodId = it.matched.id;
              else rec.custom = { name: it.name || t('d.photo.custom'), kcal: it.per100.kcal, protein: it.per100.protein, carb: it.per100.carb, fat: it.per100.fat, fiber: it.per100.fiber };
              if (i === 0 && photoId) rec.photoId = photoId;
              x.meals.push(rec);
            });
          });
          toast(t('d.photo.added', { n: items.length, meal: t('d.meal.' + meal) }), 'ok');
          close(); UI.render();
        };

        // Manual fallback / supplement: pick from the built-in food library.
        const renderManual = () => {
          extra.innerHTML = `<div class="eyebrow mb-1">${esc(t('d.photo.manual'))}</div>
            <div class="search mb-1">${icon('search')}<input class="input" id="est-q" type="search" placeholder="${esc(t('d.photo.search.ph'))}" autocomplete="off"></div>
            <div id="est-list"></div>`;
          const q = extra.querySelector('#est-q'), list = extra.querySelector('#est-list');
          const show = () => {
            const v = q.value.trim().toLowerCase();
            const variant = Standards.region(Store.state.settings.region).dietVariant;
            const pool = Content.FOODS.filter(f => f.variant === 'both' || f.variant === variant);
            const hits = v ? Content.FOODS.filter(f => f.zh.toLowerCase().includes(v) || f.en.toLowerCase().includes(v) || f.tags.some(tg => tg.includes(v))).slice(0, 12) : pool.slice(0, 8);
            list.innerHTML = hits.length ? hits.map(f => `<div class="food-row" data-pick="${f.id}"><div class="grow"><div class="n">${esc(L({ zh: f.zh, en: f.en }))}</div><div class="m">${f.serving} g · ${esc(fmtEnergy(Content.foodNutrients(f, f.serving).kcal))}</div></div><button class="add" aria-label="${esc(t('c.add'))}">+</button></div>`).join('') : `<div class="empty">${esc(t('d.noresult'))}</div>`;
          };
          q.addEventListener('input', show);
          list.addEventListener('click', e => {
            const row = e.target.closest('[data-pick]'); if (!row) return;
            const f = Content.FOODS.find(x => x.id === row.dataset.pick);
            Store.update(x => x.meals.push(Object.assign({ date: day, meal, foodId: f.id, grams: f.serving, ts: Date.now() }, photoId ? { photoId } : {})));
            toast(t('d.added', { f: L({ zh: f.zh, en: f.en }) }), 'ok');
            close(); UI.render();
          });
          show();
        };

        go.addEventListener('click', async () => {
          if (!photoId) { toast(t('d.photo.needphoto'), 'danger'); return; }
          go.disabled = true;
          if (AI.configured()) {
            status.innerHTML = typingHTML();
            try {
              const dataUrl = await Photos.dataURL(photoId, 1024);
              const parsed = await AI.analyzeFood(dataUrl);
              items = parsed.map(it => ({
                name: it.name || t('d.photo.custom'),
                grams: Math.max(1, Math.round(it.grams || 100)),
                per100: { kcal: norm100(it.kcal, it.grams), protein: norm100(it.protein, it.grams), carb: norm100(it.carb, it.grams), fat: norm100(it.fat, it.grams), fiber: norm100(it.fiber, it.grams) },
                matched: Content.matchFood(it.name),
              }));
              status.innerHTML = '';
            } catch (e) {
              status.innerHTML = `<div class="notice">${esc(t('ai.err', { e: (e && e.message) || e }))}</div>`;
            }
            renderResults();
          } else {
            status.innerHTML = `<div class="notice primary">${esc(t('d.photo.offline'))}</div><a class="btn soft block mt-2" href="#/me/ai" data-close>${icon('settings')}${esc(t('d.photo.setup'))}</a>`;
          }
          go.disabled = false;
        });
        renderManual();
      },
    });
  }

  function mount(root) {
    root.addEventListener('click', e => {
      const pv = e.target.closest('[data-photoview]');
      if (pv && !e.target.closest('button')) { Photos.viewer(pv.dataset.photoview); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { tab = b.dataset.tab; UI.render(); }
      else if (b.dataset.day) { const d = Engine.addDays(Engine.parseDate(day), +b.dataset.day); if (d > new Date()) return; day = Store.todayStr(d); UI.render(); }
      else if (b.dataset.addmeal) addSheet(b.dataset.addmeal);
      else if (b.dataset.act === 'photo-estimate') estimateSheet();
      else if (b.dataset.delmeal) { Store.update(s => { s.meals = s.meals.filter(m => String(m.ts) !== b.dataset.delmeal); }); UI.render(); }
      else if (b.dataset.act === 'toggle-gdm') { Store.update(s => { s.settings.gdmMode = !s.settings.gdmMode; }); UI.render(); }
    });
    Photos.hydrate(root);
  }
  UI.Views.diet = { render, mount };
})();
