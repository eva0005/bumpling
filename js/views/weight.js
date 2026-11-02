/* Weight — log, gain curve with recommended band, status, deviation/surge alerts (PRD §6.2) */
(function () {
  'use strict';
  const { esc, icon, fmtWeek, fmtWeight, fmtDelta, weightToKg, fmtRelDay, stdBadge, sourceNote, toast } = UI;

  function chart(st) {
    const { settings, profile } = st;
    const W = 340, H = 220, padL = 34, padR = 12, padT = 14, padB = 26;
    const ws = Engine.sortedWeights(st);
    const pts = ws.map(e => ({ w: Engine.weekOfDate(profile, e.date), g: e.kg - profile.preWeightKg, e })).filter(p => p.w >= 0 && p.w <= 42);
    const band = [];
    for (let w = 0; w <= 40; w += 1) { const b = Engine.gainBand(settings, profile, w); if (b && !b.none) band.push({ w, low: b.low, high: b.high }); }
    const toUnit = kg => settings.units.weight === 'lb' ? Standards.Units.kgToLb(kg) : kg;
    const maxBand = band.length ? band[band.length - 1].high : 16;
    const yMax = Math.ceil(Math.max(toUnit(maxBand) * 1.15, ...pts.map(p => toUnit(p.g) + 1), toUnit(2)));
    const yMin = Math.min(0, Math.floor(Math.min(...pts.map(p => toUnit(p.g)), 0)) - 1);
    const x = w => padL + (w / 40) * (W - padL - padR);
    const y = v => padT + (1 - (toUnit(v) - yMin) / (yMax - yMin)) * (H - padT - padB);
    const g = Engine.gestAge(profile);
    const hide = settings.hideWeightNumbers;

    const bandPath = band.length ? `M${band.map(b => `${x(b.w).toFixed(1)},${y(b.high).toFixed(1)}`).join(' L')} L${band.slice().reverse().map(b => `${x(b.w).toFixed(1)},${y(b.low).toFixed(1)}`).join(' L')} Z` : '';
    const lineTop = band.length ? `M${band.map(b => `${x(b.w).toFixed(1)},${y(b.high).toFixed(1)}`).join(' L')}` : '';
    const lineBot = band.length ? `M${band.map(b => `${x(b.w).toFixed(1)},${y(b.low).toFixed(1)}`).join(' L')}` : '';
    const userLine = pts.length > 1 ? `M${pts.map(p => `${x(p.w).toFixed(1)},${y(p.g).toFixed(1)}`).join(' L')}` : '';
    const yTicks = []; const step = (yMax - yMin) > 20 ? 5 : 2;
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);
    const xTicks = [0, 10, 20, 30, 40];
    const outOf = p => { const b = Engine.gainBand(settings, profile, p.w); return b && !b.none && (p.g > b.high || p.g < b.low); };

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('w.chart'))}">
      ${yTicks.map(v => `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${(padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB)).toFixed(1)}" y2="${(padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB)).toFixed(1)}"/><text class="axis" x="${padL - 6}" y="${(padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB) + 3).toFixed(1)}" text-anchor="end">${hide ? '' : (v > 0 ? '+' : '') + v}</text>`).join('')}
      ${xTicks.map(w => `<text class="axis" x="${x(w)}" y="${H - 8}" text-anchor="middle">${w}${I18N.lang === 'zh' ? '周' : 'w'}</text>`).join('')}
      ${bandPath ? `<path class="band" d="${bandPath}"/><path class="band-line" d="${lineTop}"/><path class="band-line" d="${lineBot}"/>` : ''}
      ${g ? `<line class="now" x1="${x(Math.min(40, g.days / 7))}" x2="${x(Math.min(40, g.days / 7))}" y1="${padT}" y2="${H - padB}"/>` : ''}
      ${userLine ? `<path class="line" d="${userLine}"/>` : ''}
      ${pts.map(p => `<circle class="pt ${outOf(p) ? 'out' : ''}" cx="${x(p.w).toFixed(1)}" cy="${y(p.g).toFixed(1)}" r="4"><title>${esc(fmtRelDay(p.e.date))}: ${esc(fmtDelta(p.g))}</title></circle>`).join('')}
    </svg>`;
  }

  function render() {
    const st = Store.state;
    const { settings, profile } = st;
    const g = Engine.gestAge(profile);
    const gs = Engine.gainStatus(st);
    const rate = Engine.weeklyRate(st);
    const last = Engine.latestWeight(st);
    const bandNow = g ? Engine.gainBand(settings, profile, g.days / 7) : null;
    const b = Engine.bmi(profile.heightCm, profile.preWeightKg);
    const hide = settings.hideWeightNumbers;
    const ws = Engine.sortedWeights(st).slice().reverse();
    const unit = t('units.' + settings.units.weight);
    const alerts = Engine.alerts(st).filter(a => ['surge', 'devhigh', 'devlow'].includes(a.id));
    const region = Standards.region(settings.region);
    const statusCls = gs.status === 'in' ? 'ok' : gs.status === 'na' ? '' : 'warn';

    return `${UI.topbar(t('w.title'), false, stdBadge(true))}
      ${alerts.length ? `<section class="stack mb-2">${alerts.map(UI.alertCard).join('')}</section>` : ''}
      <section class="card">
        <div class="row between mb-2"><span class="chip ${statusCls}">${esc(t('w.status.' + gs.status))}</span><button class="btn sm primary" data-act="log" id="btn-log-weight">${icon('plus')}${esc(t('w.log'))}</button></div>
        <div class="stats-row">
          <div class="stat"><div class="v">${hide ? '•••' : (last ? esc(fmtWeight(last.kg, false)) : '—')}<small>${hide ? '' : esc(unit)}</small></div><div class="l">${esc(t('w.current'))}</div></div>
          <div class="stat"><div class="v">${hide ? '•••' : (gs.status !== 'na' ? esc(fmtDelta(gs.gain, false)) : '—')}<small>${hide ? '' : esc(unit)}</small></div><div class="l">${esc(t('w.gain'))}</div></div>
          <div class="stat"><div class="v" style="font-size:1.3rem;padding-top:6px">${bandNow && !bandNow.none ? esc(fmtWeight(bandNow.low, false)) + '–' + esc(fmtWeight(bandNow.high, false)) : '—'}<small>${esc(unit)}</small></div><div class="l">${esc(t('w.band'))}</div></div>
        </div>
        ${gs.status !== 'na' ? `<p class="small muted mt-2">${esc(t('w.status.' + gs.status + '.d'))}</p>` : `<p class="small muted mt-2">${esc(t('w.empty'))}</p>`}
      </section>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('w.chart'))}</h2><span class="xs subtle">${esc(t('w.chart.legend.std', { std: t('region.' + settings.region) }))}</span></div>
        ${chart(st)}
        <div class="row wrap mt-2 xs subtle"><span class="row" style="gap:6px"><i style="width:14px;height:10px;background:hsl(146 45% 60% / .35);border-radius:3px;display:inline-block"></i>${esc(t('w.chart.band'))}</span><span class="row" style="gap:6px"><i style="width:14px;height:3px;background:var(--primary);border-radius:3px;display:inline-block"></i>${esc(t('w.chart.you'))}</span><span class="row" style="gap:6px"><i style="width:14px;height:0;border-top:1px dashed var(--accent);display:inline-block"></i>${esc(t('g.now'))}</span></div>
        <div class="row between mt-2"><span class="small">${esc(t('w.hide'))}</span><button class="switch" role="switch" aria-checked="${hide}" data-act="toggle-hide" id="sw-hide"></button></div>
        ${bandNow && !bandNow.none ? `<div class="notice mt-2">${esc(t('w.total'))}: <b>${esc(fmtWeight(bandNow.total[0], false))}–${esc(fmtWeight(bandNow.total[1]))}</b> · ${esc(t('w.weeklyRate', { low: fmtWeight(bandNow.rate.low, false), high: fmtWeight(bandNow.rate.high, false), u: unit }))}<br><span class="xs">${esc(t('w.bmi'))} ${b ? b.toFixed(1) : '—'} · ${esc(t('bmi.' + bandNow.cat))}${profile.multiple ? ' · ' + esc(t('onb.body.twins')) : ''}</span></div>` : (profile.multiple ? `<div class="notice mt-2">${esc(t('w.twin.under'))}</div>` : '')}
        ${profile.multiple && bandNow && !bandNow.none ? `<div class="notice mt-2">${esc(t('w.multiple.note'))}</div>` : ''}
        ${region.noteKey ? `<div class="notice mt-2">${esc(t(region.noteKey))}</div>` : ''}
        ${sourceNote(region.gwgSourceKey)}
      </section>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('w.rate'))}</h2><span class="bold ${rate && rate.delta > 1 ? '' : 'muted'}" style="${rate && rate.delta > 1 ? 'color:var(--accent)' : ''}">${rate ? (hide ? '•••' : esc(fmtDelta(rate.delta))) : '—'}</span></div>
        <div class="row between"><div><div class="small bold">${esc(t('w.reminder'))}</div><div class="xs subtle">${esc(t('w.tip'))}</div></div></div>
        <div class="seg block mt-2" role="radiogroup" aria-label="${esc(t('w.reminder.day'))}">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="${settings.weighDay === d ? 'active' : ''}" data-day="${d}" role="radio" aria-checked="${settings.weighDay === d}">${esc(t('w.days.' + d))}</button>`).join('')}</div>
      </section>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('w.history'))}</h2><span class="subtle">${esc(t('w.prepreg'))} ${hide ? '•••' : esc(fmtWeight(profile.preWeightKg))}</span></div>
        ${ws.length ? `<div class="list">${ws.slice(0, 30).map(e => { const w = Engine.gestAge(profile, Engine.parseDate(e.date)); return `<div class="list-item"><div class="body"><div class="title">${hide ? '•••' : esc(fmtWeight(e.kg))}</div><div class="sub">${esc(fmtRelDay(e.date))} · ${esc(fmtWeek(w))}</div></div><div class="trail"><span>${hide ? '' : esc(fmtDelta(e.kg - profile.preWeightKg))}</span><button class="btn icon ghost" data-del="${e.date}" aria-label="${esc(t('c.delete'))}">${icon('trash')}</button></div></div>`; }).join('')}</div>` : `<div class="empty"><div style="display:flex;justify-content:center;margin-bottom:6px">${Mascot.mascot({ size: 72, mood: 'calm' })}</div>${esc(t('w.empty'))}</div>`}
      </section>`;
  }

  function logSheet() {
    const st = Store.state;
    const unit = t('units.' + st.settings.units.weight);
    const last = Engine.latestWeight(st);
    const def = last ? fmtWeight(last.kg, false) : fmtWeight(st.profile.preWeightKg, false);
    UI.sheet({
      title: t('w.log'),
      body: `<div class="stack"><div class="field"><label for="w-date">${esc(t('w.add.date'))}</label><input class="input" type="date" id="w-date" value="${Store.todayStr()}" max="${Store.todayStr()}"></div>
        <div class="field"><label for="w-val">${esc(t('w.add.value'))}</label><div class="input-group"><input class="input" type="number" step="0.1" inputmode="decimal" id="w-val" value="${def}"><span class="unit">${esc(unit)}</span></div><span class="hint">${esc(t('w.tip'))}</span></div></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" data-save id="w-save">${esc(t('c.save'))}</button>`,
      onMount(s, close) {
        s.querySelector('#w-val').select();
        s.querySelector('[data-save]').addEventListener('click', () => {
          const date = s.querySelector('#w-date').value; const v = +s.querySelector('#w-val').value;
          const kg = weightToKg(v);
          if (!date || !v || kg < 30 || kg > 200) { toast(t('w.err'), 'danger'); return; }
          Store.update(x => { x.weights = x.weights.filter(e => e.date !== date); x.weights.push({ date, kg: Math.round(kg * 100) / 100 }); });
          close(); toast(t('c.saved'), 'ok'); UI.render();
        });
      },
    });
  }

  function mount(root) {
    root.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'log') logSheet();
      else if (b.dataset.act === 'toggle-hide') { Store.update(s => { s.settings.hideWeightNumbers = !s.settings.hideWeightNumbers; }); UI.render(); }
      else if (b.dataset.day !== undefined) { Store.update(s => { s.settings.weighDay = +b.dataset.day; }); UI.render(); }
      else if (b.dataset.del) { if (await UI.confirm(t('c.delete') + '?', { danger: true, okText: t('c.delete') })) { Store.update(s => { s.weights = s.weights.filter(x => x.date !== b.dataset.del); }); UI.render(); } }
    });
  }

  UI.Views.weight = { render, mount };
})();
