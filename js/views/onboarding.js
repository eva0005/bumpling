/* Onboarding — register → language → country(standard) → dates → body → health → privacy → plan (PRD §6.1, §7.3) */
(function () {
  'use strict';
  const { esc, icon, fmtWeek, fmtDate, toast } = UI;

  const STEPS = ['lang', 'country', 'date', 'body', 'health', 'privacy', 'done'];
  let step = 0;
  let draft = null;

  function init(params) {
    const st = Store.state;
    const editing = params[0] === 'edit';
    step = editing ? 2 : 0;
    draft = {
      lang: st.settings.lang, country: st.settings.country,
      mode: st.profile.edd && !st.profile.lmp ? 'edd' : 'lmp', lmp: st.profile.lmp || '', edd: st.profile.edd || '',
      heightCm: st.profile.heightCm, preWeightKg: st.profile.preWeightKg, age: st.profile.age, multiple: !!st.profile.multiple,
      conditions: (st.profile.conditions || []).slice(), orders: (st.profile.orders || []).slice(),
      localOnly: st.settings.localOnly !== false, agreed: st.privacyAccepted, editing,
      units: st.settings.units,
    };
    I18N.set(draft.lang);
  }

  const stepsBar = () => `<div class="steps" aria-hidden="true">${STEPS.slice(0, -1).map((s, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
  const brand = () => `<div class="brand"><div class="logo">${Mascot.appIcon(48)}</div><div><div class="n">${esc(t('app.name'))}</div><div class="s">${esc(t('app.slogan'))}</div></div></div>`;

  function render(params) {
    if (!draft || (params[0] === 'edit') !== draft.editing) init(params);
    const s = STEPS[step];
    return `<div class="onb">${step < STEPS.length - 1 ? stepsBar() : ''}<div class="body">${screens[s]()}</div></div>`;
  }

  const foot = (nextLabel, extra = '') => `<div class="foot">${step > 0 && step < STEPS.length - 1 ? `<button class="btn secondary" data-step="prev">${esc(t('c.back'))}</button>` : ''}${extra}<button class="btn primary" data-step="next" id="onb-next">${esc(nextLabel || t('c.next'))}</button></div>`;

  const screens = {
    lang() {
      return `${brand()}<h1>${esc(t('onb.lang.title'))}</h1><p class="lead">${esc(t('onb.lang.lead'))}</p>
        <div class="choice-group">${['zh', 'en'].map(l => `<button class="choice ${draft.lang === l ? 'selected' : ''}" data-lang="${l}"><span class="radio"></span><div><div class="t">${esc(t('lang.' + l))}</div><div class="d">${l === 'zh' ? '简体中文界面' : 'English interface'}</div></div></button>`).join('')}</div>${foot()}`;
    },
    country() {
      const r = Standards.country(draft.country).region;
      return `<h1>${esc(t('onb.country.title'))}</h1><p class="lead">${esc(t('onb.country.lead'))}</p>
        <div class="choice-group">${Standards.COUNTRIES.map(c => `<button class="choice ${draft.country === c.code ? 'selected' : ''}" data-country="${c.code}"><span class="flag">${c.flag}</span><div class="grow"><div class="t">${esc(t(c.nameKey))}</div><div class="d">${esc(t('region.' + c.region))} · ${esc(t('region.' + c.region + '.src'))}</div></div><span class="radio"></span></button>`).join('')}</div>
        <div class="notice primary mt-2">${esc(t('region.using', { std: t('region.' + r) }))}${Standards.region(r).noteKey ? '<br>' + esc(t(Standards.region(r).noteKey)) : ''}</div>${foot()}`;
    },
    date() {
      const g = preview();
      return `<h1>${esc(t('onb.date.title'))}</h1><p class="lead">${esc(t('onb.date.lead'))}</p>
        <div class="seg block mb-2"><button class="${draft.mode === 'lmp' ? 'active' : ''}" data-mode="lmp">${esc(t('onb.date.mode.lmp'))}</button><button class="${draft.mode === 'edd' ? 'active' : ''}" data-mode="edd">${esc(t('onb.date.mode.edd'))}</button></div>
        ${draft.mode === 'lmp' ? `<div class="field"><label for="f-lmp">${esc(t('onb.date.lmp'))}</label><input class="input" type="date" id="f-lmp" value="${esc(draft.lmp)}" max="${Store.todayStr()}"></div>` :
        `<div class="field"><label for="f-edd">${esc(t('onb.date.edd'))}</label><input class="input" type="date" id="f-edd" value="${esc(draft.edd)}"></div>`}
        <div id="date-preview" class="notice mt-2" ${g ? '' : 'hidden'}>${g ? esc(t('onb.date.preview', { week: fmtWeek(g), edd: fmtDate(g.edd, { year: 'numeric', month: 'long', day: 'numeric' }) })) : ''}</div>${foot()}`;
    },
    body() {
      const u = draft.units;
      const imperialH = u.height === 'ftin', lb = u.weight === 'lb';
      const f = draft.heightCm && imperialH ? Standards.Units.cmToFtIn(draft.heightCm) : null;
      return `<h1>${esc(t('onb.body.title'))}</h1><p class="lead">${esc(t('onb.body.lead'))}</p>
        <div class="stack">
          <div class="field"><label>${esc(t('onb.body.height'))}</label>
            ${imperialH ? `<div class="input-group"><input class="input" type="number" id="f-ft" inputmode="numeric" placeholder="5" value="${f ? f.ft : ''}"><span class="unit">ft</span><input class="input dual" type="number" id="f-in" inputmode="decimal" placeholder="4" value="${f ? Math.round(f.in) : ''}"><span class="unit">in</span></div>`
              : `<div class="input-group"><input class="input" type="number" id="f-height" inputmode="decimal" placeholder="162" value="${draft.heightCm ? Math.round(draft.heightCm) : ''}"><span class="unit">cm</span></div>`}
          </div>
          <div class="field"><label>${esc(t('onb.body.weight'))}</label><div class="input-group"><input class="input" type="number" id="f-weight" inputmode="decimal" step="0.1" placeholder="${lb ? '128' : '58'}" value="${draft.preWeightKg ? (lb ? Standards.Units.kgToLb(draft.preWeightKg).toFixed(1) : draft.preWeightKg) : ''}"><span class="unit">${lb ? 'lb' : 'kg'}</span></div></div>
          <div class="field"><label>${esc(t('onb.body.age'))}</label><input class="input" type="number" id="f-age" inputmode="numeric" min="14" max="60" placeholder="30" value="${draft.age || ''}"><span class="hint">${esc(t('onb.body.age35'))}</span></div>
          <div class="field"><label>${esc(t('onb.body.multiple'))}</label><div class="seg block"><button class="${!draft.multiple ? 'active' : ''}" data-multiple="0">${esc(t('onb.body.single'))}</button><button class="${draft.multiple ? 'active' : ''}" data-multiple="1">${esc(t('onb.body.twins'))}</button></div></div>
        </div>${foot()}`;
    },
    health() {
      const conds = ['diabetes', 'hypertension', 'thyroid', 'anemia', 'pcos'];
      const chk = (k, on) => `<button class="choice checkbox ${on ? 'selected' : ''}" data-cond="${k}"><span class="radio"></span><div class="t">${esc(t('onb.health.' + k))}</div></button>`;
      return `<h1>${esc(t('onb.health.title'))}</h1><p class="lead">${esc(t('onb.health.lead'))}</p>
        <div class="choice-group">${conds.map(c => chk(c, draft.conditions.includes(c))).join('')}<button class="choice checkbox ${!draft.conditions.length ? 'selected' : ''}" data-cond="none"><span class="radio"></span><div class="t">${esc(t('onb.health.none'))}</div></button></div>
        <h2 class="mt-3 mb-1" style="font-size:1.05rem">${esc(t('onb.health.orders'))}</h2><p class="subtle mb-2">${esc(t('onb.health.orders.hint'))}</p>
        <div class="choice-group">${['bedrest', 'noexercise'].map(o => `<button class="choice checkbox ${draft.orders.includes(o) ? 'selected' : ''}" data-order="${o}"><span class="radio"></span><div class="t">${esc(t('onb.health.' + o))}</div></button>`).join('')}</div>${foot()}`;
    },
    privacy() {
      return `<div class="eyebrow mb-1">${esc(t('onb.privacy.first'))}</div><h1>${esc(t('onb.privacy.title'))}</h1><p class="lead">${esc(t('onb.privacy.lead'))}</p>
        <div class="card stack">${['p1', 'p2', 'p3', 'p4'].map(k => `<div class="row" style="align-items:flex-start"><span style="color:var(--primary);flex:none;margin-top:2px">${icon('shield')}</span><p class="small">${esc(t('onb.privacy.' + k))}</p></div>`).join('')}</div>
        <div class="choice-group mt-3">
          <button class="choice checkbox ${draft.localOnly ? 'selected' : ''}" data-toggle="localOnly"><span class="radio"></span><div class="t">${esc(t('onb.privacy.local'))}</div></button>
          <button class="choice checkbox ${draft.agreed ? 'selected' : ''}" data-toggle="agreed"><span class="radio"></span><div class="t">${esc(t('onb.privacy.agree'))}</div></button>
        </div>${foot(t('c.continue'))}`;
    },
    done() {
      const region = Standards.country(draft.country).region;
      const b = Engine.bmi(draft.heightCm, draft.preWeightKg);
      const cat = Standards.bmiCategory(b, region);
      const tbl = Standards.gwgTable(region, cat, draft.multiple);
      const uw = draft.units.weight === 'lb';
      const cv = kg => uw ? (Standards.Units.kgToLb(kg)).toFixed(0) : kg;
      const unit = t('units.' + draft.units.weight);
      return `<div class="center" style="padding-top:30px"><div style="display:flex;justify-content:center;margin-bottom:8px">${Mascot.mascot({ size: 120, mood: 'cheer' })}</div>
        <h1>${esc(t('onb.done.title'))}</h1><p class="lead">${esc(t('onb.done.lead', { std: t('region.' + region) }))}</p></div>
        <div class="card stack">
          <div class="row between"><span class="muted">${esc(t('onb.done.bmi'))}</span><b>${b ? b.toFixed(1) : '—'} · ${esc(t('bmi.' + cat))}</b></div>
          <div class="row between"><span class="muted">${esc(t('onb.done.gain'))}</span><b>${tbl ? `${cv(tbl.total[0])}–${cv(tbl.total[1])} ${unit}` : '—'}</b></div>
          <div class="row between"><span class="muted">${esc(t('onb.done.rate'))}</span><b>${tbl ? `${uw ? Standards.Units.kgToLb(tbl.rate.low).toFixed(1) : tbl.rate.low}–${uw ? Standards.Units.kgToLb(tbl.rate.high).toFixed(1) : tbl.rate.high} ${unit}` : '—'}</b></div>
          <div class="row between"><span class="muted">${esc(t('region.current'))}</span><b>${Standards.region(region).flag} ${esc(t('region.' + region))}</b></div>
          ${draft.multiple ? `<div class="notice">${esc(tbl ? t('w.multiple.note') : t('w.twin.under'))}</div>` : ''}
          ${UI.sourceNote(Standards.region(region).gwgSourceKey)}
        </div>
        <div class="foot"><button class="btn primary lg block" data-step="finish" id="onb-finish">${esc(t('onb.done.start'))}</button></div>`;
    },
  };

  function preview() {
    const p = draft.mode === 'lmp' ? { lmp: draft.lmp } : { edd: draft.edd };
    if (!(p.lmp || p.edd)) return null;
    const g = Engine.gestAge(p);
    if (!g || g.days < 0 || g.days > 310) return null;
    return g;
  }

  function collect(root) {
    const s = STEPS[step];
    if (s === 'date') {
      const el = root.querySelector('#f-lmp, #f-edd');
      if (draft.mode === 'lmp') draft.lmp = el.value; else draft.edd = el.value;
      if (!preview()) { toast(t('onb.err.date'), 'danger'); return false; }
      if (draft.mode === 'lmp') draft.edd = ''; else draft.lmp = '';
    }
    if (s === 'body') {
      const u = draft.units;
      if (u.height === 'ftin') { const ft = +root.querySelector('#f-ft').value, inch = +root.querySelector('#f-in').value; draft.heightCm = ft ? Standards.Units.ftInToCm(ft, inch || 0) : null; }
      else draft.heightCm = +root.querySelector('#f-height').value || null;
      const w = +root.querySelector('#f-weight').value;
      draft.preWeightKg = w ? (u.weight === 'lb' ? Standards.Units.lbToKg(w) : w) : null;
      draft.age = +root.querySelector('#f-age').value || null;
      if (!draft.heightCm || draft.heightCm < 120 || draft.heightCm > 220 || !draft.preWeightKg || draft.preWeightKg < 30 || draft.preWeightKg > 200) { toast(t('onb.err.body'), 'danger'); return false; }
      if (!draft.age) { toast(t('onb.err.age'), 'danger'); return false; }
    }
    if (s === 'privacy' && !draft.agreed) { toast(t('onb.privacy.agree'), 'danger'); return false; }
    return true;
  }

  function finish() {
    const region = Standards.country(draft.country).region;
    Store.update(st => {
      st.settings.lang = draft.lang; st.settings.country = draft.country;
      const regionChanged = st.settings.region !== region;
      st.settings.region = region;
      if (!draft.editing) st.settings.units = Standards.defaultUnitsFor(draft.country);
      st.settings.localOnly = draft.localOnly;
      st.profile = { lmp: draft.lmp || null, edd: draft.edd || null, heightCm: draft.heightCm, preWeightKg: draft.preWeightKg, age: draft.age, multiple: draft.multiple, conditions: draft.conditions, orders: draft.orders };
      if (draft.conditions.includes('diabetes')) st.settings.gdmMode = true;
      st.privacyAccepted = true; st.onboarded = true;
      if (regionChanged) st.checkups.removed = {};
    });
    draft = null;
    UI.go('#/home');
  }

  function mount(root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.lang) { draft.lang = d.lang; I18N.set(d.lang); UI.render(); }
      else if (d.country) { draft.country = d.country; draft.units = Standards.defaultUnitsFor(d.country); UI.render(); }
      else if (d.mode) { draft.mode = d.mode; UI.render(); }
      else if (d.multiple !== undefined) { draft.multiple = d.multiple === '1'; collectSoft(root); UI.render(); }
      else if (d.cond) {
        if (d.cond === 'none') draft.conditions = [];
        else { const i = draft.conditions.indexOf(d.cond); i >= 0 ? draft.conditions.splice(i, 1) : draft.conditions.push(d.cond); }
        UI.render();
      }
      else if (d.order) { const i = draft.orders.indexOf(d.order); i >= 0 ? draft.orders.splice(i, 1) : draft.orders.push(d.order); UI.render(); }
      else if (d.toggle) { draft[d.toggle] = !draft[d.toggle]; UI.render(); }
      else if (d.step === 'prev') { step = Math.max(0, step - 1); UI.render(); }
      else if (d.step === 'next') { if (!collect(root)) return; step = Math.min(STEPS.length - 1, step + 1); UI.render(); }
      else if (d.step === 'finish') finish();
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'f-lmp' || e.target.id === 'f-edd') {
        if (draft.mode === 'lmp') draft.lmp = e.target.value; else draft.edd = e.target.value;
        const g = preview(); const pv = root.querySelector('#date-preview');
        if (g) { pv.hidden = false; pv.textContent = t('onb.date.preview', { week: fmtWeek(g), edd: fmtDate(g.edd, { year: 'numeric', month: 'long', day: 'numeric' }) }); } else pv.hidden = true;
      }
    });
  }
  // keep typed values when toggling the segment on the body screen
  function collectSoft(root) {
    const u = draft.units;
    if (u.height === 'ftin') { const ft = +root.querySelector('#f-ft').value, inch = +root.querySelector('#f-in').value; if (ft) draft.heightCm = Standards.Units.ftInToCm(ft, inch || 0); }
    else { const h = +root.querySelector('#f-height').value; if (h) draft.heightCm = h; }
    const w = +root.querySelector('#f-weight').value; if (w) draft.preWeightKg = u.weight === 'lb' ? Standards.Units.lbToKg(w) : w;
    const a = +root.querySelector('#f-age').value; if (a) draft.age = a;
  }

  UI.Views.onboarding = { render, mount };
})();
