/* Diet — energy & nutrient targets by region/trimester, food logging, traffic light, myths, scenario recipes, GDM mode (PRD §6.3, §6.9) */
(function () {
  'use strict';
  const { esc, icon, L, fmtEnergy, ring, stdBadge, sourceNote, toast } = UI;
  const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
  let day = null; // date being viewed
  let tab = 'log';

  const NUTR = [['protein', 'g'], ['folate', 'μg'], ['iron', 'mg'], ['calcium', 'mg'], ['iodine', 'μg'], ['dha', 'mg']];

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
      </section>

      <div class="ai-tiles mt-3">
        <button class="ai-tile" data-act="photo-meal" id="btn-photo-meal"><span class="ic">${icon('camera')}</span><div><b>${esc(t('dp.photo.btn'))}<span class="ai-badge">${icon('sparkle')}AI</span></b><span>${esc(t('dp.tile.sub'))}</span></div>${icon('chevR', 'go')}</button>
        <button class="ai-tile" data-act="import-history" id="btn-import-diet"><span class="ic coral">${icon('upload')}</span><div><b>${esc(t('dp.import.btn'))}<span class="ai-badge">${icon('sparkle')}AI</span></b><span>${esc(t('imp.tile.sub'))}</span></div>${icon('chevR', 'go')}</button>
      </div>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('d.nutrients'))}</h2></div>
        <div class="totals two mb-2">${[['protein', 'g'], ['carb', 'g'], ['fat', 'g'], ['fibre', 'g']].map(([k, u]) => `<div class="stat"><div class="v">${Math.round(intake[k])}<small> / ${targets[k]} ${u}</small></div><div class="l">${esc(t('d.n.' + k))}</div></div>`).join('')}</div>
        ${(() => { const s = Engine.macroSplit(intake); if (!s) return ''; return `<div class="mb-2"><div class="eyebrow mb-1">${esc(t('dp.ratio'))}</div><div class="macro-bar"><i class="c" style="width:${s.carb}%"></i><i class="p" style="width:${s.protein}%"></i><i class="f" style="width:${s.fat}%"></i></div><div class="macro-legend"><span class="c"><i></i>${esc(t('d.n.carb'))} ${s.carb}%</span><span class="p"><i></i>${esc(t('d.n.protein'))} ${s.protein}%</span><span class="f"><i></i>${esc(t('d.n.fat'))} ${s.fat}%</span></div><p class="xs subtle mt-1">${esc(t('dp.ratio.ref'))}</p></div>`; })()}
        ${NUTR.map(([k, u]) => { const p = intake[k] / targets[k]; return `<div class="nutrient"><span class="n">${esc(t('d.n.' + k))}</span><span class="v">${k === 'folate' || k === 'iodine' || k === 'calcium' || k === 'dha' ? Math.round(intake[k]) : intake[k].toFixed(1)} / ${targets[k]} ${u}</span><div class="bar ${p >= 1 ? 'ok' : p >= 0.6 ? '' : 'warn'}"><i style="width:${Math.min(100, p * 100)}%"></i></div></div>`; }).join('')}
        <div class="nutrient"><span class="n">${esc(t('d.n.caffeine'))}</span><span class="v">${Math.round(intake.caffeine)} / ${targets.caffeineMax} mg ${esc(t('d.n.caffeine.max'))}</span><div class="bar ${cafPct > 1 ? 'danger' : cafPct > 0.75 ? 'warn' : 'accent'}"><i style="width:${Math.min(100, cafPct * 100)}%"></i></div></div>
        ${sourceNote(targets.sourceKey)}
      </section>

      ${MEALS.map(m => { const items = st.meals.filter(x => x.date === day && x.meal === m); const kcal = items.reduce((s, x) => { const n = Engine.entryNutrients(x); return s + (n ? n.kcal : 0); }, 0);
        return `<section class="card mt-3 pad-sm"><div class="meal-head"><b>${esc(t('d.meal.' + m))}</b><div class="row"><span class="subtle small">${kcal ? esc(fmtEnergy(kcal)) : ''}</span><button class="btn icon sm soft" data-photomeal="${m}" aria-label="${esc(t('dp.photo.btn'))}">${icon('camera')}</button><button class="btn sm soft" data-addmeal="${m}">${icon('plus')}${esc(t('c.add'))}</button></div></div>
          ${items.length ? items.map(x => { const n = Engine.entryNutrients(x); if (!n) return ''; const f = x.foodId ? Content.FOODS.find(ff => ff.id === x.foodId) : null; const name = f ? L({ zh: f.zh, en: f.en }) : (x.name || '—'); const supp = f && f.tags.includes('supplement'); const badge = x.src === 'photo' ? `<span class="ai-badge">${icon('sparkle')}${esc(t('d.ai.entry'))}</span>` : x.src === 'import' ? `<span class="ai-badge">${icon('upload')}${esc(t('imp.badge'))}</span>` : ''; return `<div class="food-row"><div class="grow"><div class="n">${esc(name)} ${badge}</div><div class="m">${supp ? x.grams + ' ×' : x.grams + ' g'} · ${esc(fmtEnergy(n.kcal))}${x.src ? ` · P ${UI.r1(n.protein)} · C ${UI.r1(n.carb)} · F ${UI.r1(n.fat)}${n.caffeine > 0 ? ` · ${esc(t('d.n.caffeine'))} ${Math.round(n.caffeine)} mg` : ''}` : ''}</div></div><button class="btn icon ghost" data-delmeal="${x.ts}" aria-label="${esc(t('c.delete'))}">${icon('x')}</button></div>`; }).join('') : ''}
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
    const recentIds = [...new Set(st.meals.filter(m => m.foodId).sort((a, b) => b.ts - a.ts).map(m => m.foodId))].slice(0, 8);
    const rowFor = f => `<div class="food-row" data-food="${f.id}"><div class="grow"><div class="n">${esc(L({ zh: f.zh, en: f.en }))}</div><div class="m">${f.tags.includes('supplement') ? esc(t('d.supp')) : `${f.serving} g · ${esc(fmtEnergy(Content.foodNutrients(f, f.serving).kcal))}`}</div></div><button class="add" aria-label="${esc(t('c.add'))}">+</button></div>`;
    UI.sheet({
      title: `${t('d.add')} · ${t('d.meal.' + meal)}`,
      body: `<div class="search mb-2">${icon('search')}<input class="input" id="food-q" type="search" placeholder="${esc(t('d.search'))}" autocomplete="off"></div>
        <div id="food-list">${recentIds.length ? `<div class="eyebrow mb-1">${esc(t('d.quick'))}</div>` : ''}${recentIds.map(id => Content.FOODS.find(f => f.id === id)).filter(Boolean).map(rowFor).join('')}${!recentIds.length ? pool.slice(0, 12).map(rowFor).join('') : ''}</div>
        <div id="food-amount" hidden class="mt-2"></div>`,
      onMount(s, close) {
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
            Store.update(x => { x.meals.push({ date: day, meal, foodId: f.id, grams: g, ts: Date.now() }); });
            toast(t('d.added', { f: L({ zh: f.zh, en: f.en }) }), 'ok'); close(); UI.render();
          });
        });
      },
    });
  }

  function mount(root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { tab = b.dataset.tab; UI.render(); }
      else if (b.dataset.day) { const d = Engine.addDays(Engine.parseDate(day), +b.dataset.day); if (d > new Date()) return; day = Store.todayStr(d); UI.render(); }
      else if (b.dataset.addmeal) addSheet(b.dataset.addmeal);
      else if (b.dataset.photomeal) AISheets.photoMeal(day, b.dataset.photomeal);
      else if (b.dataset.act === 'photo-meal') AISheets.photoMeal(day);
      else if (b.dataset.act === 'import-history') AISheets.importHistory('diet');
      else if (b.dataset.delmeal) { Store.update(s => { s.meals = s.meals.filter(m => String(m.ts) !== b.dataset.delmeal); }); UI.render(); }
      else if (b.dataset.act === 'toggle-gdm') { Store.update(s => { s.settings.gdmMode = !s.settings.gdmMode; }); UI.render(); }
    });
  }
  UI.Views.diet = { render, mount };
})();
