/* Me — profile, language, standard region, units, family sharing, privacy & data, care mode, report (PRD §4 "我的", §6.7, §6.8, §6.10, §7.3) */
(function () {
  'use strict';
  const { esc, icon, fmtWeek, fmtWeight, fmtHeight, fmtDate, regionName, toast } = UI;

  function render(params) {
    const sub = params[0];
    const st = Store.state;
    if (sub === 'region') return regionView(st);
    if (sub === 'units') return unitsView(st);
    if (sub === 'family') return familyView(st);
    if (sub === 'privacy') return privacyView(st);
    if (sub === 'loss') return lossView(st);
    if (sub === 'ai') return aiCfgView(st);
    const g = Engine.gestAge(st.profile);
    const p = st.profile;
    const row = (href, ic, title, sub2, id) => `<a class="list-item" href="${href}" id="${id || ''}"><div class="lead">${icon(ic)}</div><div class="body"><div class="title">${esc(title)}</div>${sub2 ? `<div class="sub ellipsis">${esc(sub2)}</div>` : ''}</div>${icon('chevR', 'chev')}</a>`;
    return `${UI.topbar(t('m.title'), false)}
      <section class="card tint">
        <div class="row between"><div><div class="eyebrow">${esc(t('m.profile'))}</div><div class="display" style="font-size:1.5rem">${esc(fmtWeek(g))}</div><div class="small muted">${esc(t('m.edd'))} ${esc(fmtDate(g && g.edd, { year: 'numeric', month: 'long', day: 'numeric' }))}</div></div><a class="btn sm secondary" href="#/onboarding/edit">${icon('edit')}${esc(t('m.edit'))}</a></div>
        <div class="grid-3 mt-2">${[[t('m.height'), fmtHeight(p.heightCm)], [t('m.preweight'), fmtWeight(p.preWeightKg)], [t('m.age'), p.age || '—']].map(([l, v]) => `<div><div class="xs subtle">${esc(l)}</div><div class="bold">${esc(v)}</div></div>`).join('')}</div>
      </section>
      <section class="card mt-3"><div class="list">
        ${row('#/me/region', 'globe', t('m.region'), regionName(st.settings.region) + ' · ' + t(Standards.country(st.settings.country).nameKey), 'me-region')}
        <div class="list-item"><div class="lead">${icon('text')}</div><div class="body"><div class="title">${esc(t('m.language'))}</div></div><div class="seg">${['zh', 'en'].map(l => `<button class="${st.settings.lang === l ? 'active' : ''}" data-lang="${l}">${esc(t('lang.' + l))}</button>`).join('')}</div></div>
        ${row('#/me/units', 'settings', t('m.units'), ['weight', 'height', 'glucose', 'energy'].map(k => t('units.' + st.settings.units[k])).join(' · '))}
        <div class="list-item"><div class="lead">${icon('text')}</div><div class="body"><div class="title">${esc(t('m.textsize'))}</div></div><div class="seg">${['normal', 'large', 'xlarge'].map(s => `<button class="${st.settings.textScale === s ? 'active' : ''}" data-scale="${s}" style="font-size:${s === 'normal' ? '.8rem' : s === 'large' ? '.95rem' : '1.1rem'}">A</button>`).join('')}</div></div>
      </div></section>
      <section class="card mt-3"><div class="list">
        ${row('#/exercise', 'activity', t('e.title'), Engine.exerciseLocked(st) ? t('e.locked.t') : t('e.goal'))}
        ${row('#/ai', 'sparkle', t('t.ai'), AI.configured() ? t('ai.badge.on') : t('ai.badge.off'))}
        ${row('#/tools', 'pulse', t('t.title'), t('t.bp') + ' · ' + t('t.glucose') + ' · ' + t('t.symptoms'))}
        ${row('#/calendar', 'calendar', t('g.calendar'), (function () { const n = Engine.nextCheckup(st); return n ? n.title + (n.daysUntil != null && n.daysUntil >= 0 ? ' · ' + t('home.checkup.in', { n: n.daysUntil, w: '' }).replace(/ ·\s*$/, '') : '') : t('home.checkup.none'); })())}
        ${row('#/report', 'file', t('m.report'), t('m.report.weekly') + ' · ' + t('m.report.print'))}
        ${row('#/me/family', 'users', t('m.family'), st.family.code ? t('m.family.code') + ' ' + st.family.code : '')}
      </div></section>
      <section class="card mt-3"><div class="list">
        ${row('#/me/privacy', 'shield', t('m.privacy'), st.settings.localOnly ? t('m.privacy.local') + ' · ' + t('c.on') : '')}
        ${row('#/me/loss', 'heart', t('m.loss'), st.settings.lossMode ? t('m.loss.active') : '')}
      </div></section>
      <section class="card mt-3 flat"><div class="bold small">${esc(t('m.review'))}</div><p class="xs muted mt-1">${esc(t('m.review.d'))}</p><p class="xs muted mt-2">${esc(t('m.disclaimer'))}</p><p class="xs subtle mt-2">${esc(t('m.version'))}</p></section>`;
  }

  function regionView(st) {
    return `${UI.topbar(t('m.region'))}
      <div class="notice primary mb-2">${esc(t('region.change.d'))}</div>
      <div class="choice-group">${Standards.COUNTRIES.map(c => `<button class="choice ${st.settings.country === c.code ? 'selected' : ''}" data-country="${c.code}"><span class="flag">${c.flag}</span><div class="grow"><div class="t">${esc(t(c.nameKey))}</div><div class="d">${esc(t('region.' + c.region))} · ${esc(t('region.' + c.region + '.src'))} · ${esc(t('t.sos'))} ${c.emergency}</div></div><span class="radio"></span></button>`).join('')}</div>
      <button class="btn ghost block mt-3" data-act="why-std">${icon('info')}${esc(t('region.why'))}</button>`;
  }
  function unitsView(st) {
    const opts = { weight: ['kg', 'lb'], height: ['cm', 'ftin'], glucose: ['mmol', 'mgdl'], energy: ['kcal', 'kJ'] };
    return `${UI.topbar(t('m.units'))}<section class="card"><div class="list">${Object.keys(opts).map(k => `<div class="list-item"><div class="body"><div class="title">${esc(t('m.units.' + k))}</div></div><div class="seg">${opts[k].map(u => `<button class="${st.settings.units[k] === u ? 'active' : ''}" data-unit="${k}" data-val="${u}">${esc(t('units.' + u))}</button>`).join('')}</div></div>`).join('')}</div></section>`;
  }
  function familyView(st) {
    const perms = ['week', 'checkup', 'alerts', 'weight'];
    return `${UI.topbar(t('m.family'))}
      <section class="card"><p class="small muted">${esc(t('m.family.lead'))}</p>
        ${st.family.code ? `<div class="card flat center mt-2"><div class="eyebrow">${esc(t('m.family.code'))}</div><div class="display mono" style="font-size:2rem;letter-spacing:.2em">${esc(st.family.code)}</div><button class="btn sm secondary mt-1" data-act="copy-code">${esc(t('c.copy'))}</button></div>` : `<button class="btn primary block mt-2" data-act="gen-code" id="btn-gen-code">${icon('users')}${esc(t('m.family.gen'))}</button>`}
        <div class="list mt-2">${perms.map(p => `<div class="list-item"><div class="body"><div class="title small">${esc(t('m.family.perm.' + p))}</div></div><button class="switch" role="switch" aria-checked="${!!st.family.perms[p]}" data-perm="${p}"></button></div>`).join('')}</div>
        <p class="xs subtle mt-2">${esc(t('m.family.soon'))}</p></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('m.family.push'))}</h2></div><ul class="stack" style="gap:8px">${[1, 2, 3, 4].map(i => `<li class="row small"><span style="color:var(--accent)">${icon('heart')}</span>${esc(t('m.family.help.' + i))}</li>`).join('')}</ul></section>`;
  }
  function privacyView(st) {
    const sw = (k, on) => `<button class="switch" role="switch" aria-checked="${on}" data-setting="${k}"></button>`;
    return `${UI.topbar(t('m.privacy'))}
      <section class="card"><div class="list">
        <div class="list-item"><div class="lead">${icon('lock')}</div><div class="body"><div class="title">${esc(t('m.privacy.local'))}</div><div class="sub" style="white-space:normal">${esc(t('m.privacy.local.d'))}</div></div>${sw('localOnly', st.settings.localOnly)}</div>
        <div class="list-item"><div class="lead">${icon('pulse')}</div><div class="body"><div class="title">${esc(t('m.privacy.analytics'))}</div><div class="sub" style="white-space:normal">${esc(t('m.privacy.analytics.d'))}</div></div>${sw('analytics', st.settings.analytics)}</div>
        <div class="list-item"><div class="lead">${icon('file')}</div><div class="body"><div class="title">${esc(t('m.privacy.transparency'))}</div><div class="sub" style="white-space:normal">${esc(t('m.privacy.transparency.d'))}</div></div></div>
      </div></section>
      <section class="card mt-3 stack"><button class="btn secondary block" data-act="export">${icon('download')}${esc(t('m.report.json'))}</button>
        <label class="btn secondary block" style="cursor:pointer">${icon('upload')}${esc(t('m.report.import'))}<input type="file" accept="application/json" id="import-file" class="sr-only"></label></section>
      <section class="card mt-3 flat" style="background:var(--danger-soft)"><div class="bold" style="color:var(--danger)">${esc(t('m.privacy.delete'))}</div><p class="small muted mt-1">${esc(t('m.privacy.delete.d'))}</p><button class="btn danger-soft block mt-2" data-act="wipe" id="btn-wipe">${icon('trash')}${esc(t('m.privacy.delete'))}</button></section>
      <div class="card flat mt-3 stack">${['p1', 'p2', 'p3', 'p4'].map(k => `<p class="xs muted">${esc(t('onb.privacy.' + k))}</p>`).join('')}</div>`;
  }
  function lossView(st) {
    return `${UI.topbar(t('m.loss'))}
      <section class="card tint"><p class="small">${esc(t('m.loss.lead'))}</p>
        ${st.settings.lossMode ? `<div class="notice primary mt-2">${esc(t('m.loss.active'))}</div><button class="btn secondary block mt-2" data-act="loss-off">${esc(t('m.loss.disable'))}</button>` : `<button class="btn secondary block mt-3" data-act="loss-on" id="btn-loss-on">${icon('heart')}${esc(t('m.loss.enable'))}</button>`}</section>`;
  }
  function aiCfgView(st) {
    const c = st.settings.ai || { endpoint: '', key: '', model: '' };
    return `${UI.topbar(t('ai.cfg'))}
      <section class="card">
        <div class="field"><label for="ai-endpoint">${esc(t('ai.cfg.endpoint'))}</label><input class="input" id="ai-endpoint" type="url" inputmode="url" placeholder="${esc(t('ai.cfg.ph.endpoint'))}" value="${esc(c.endpoint || '')}" autocomplete="off"></div>
        <div class="field mt-2"><label for="ai-key">${esc(t('ai.cfg.key'))}</label><input class="input" id="ai-key" type="password" autocomplete="new-password" placeholder="sk-…" value="${esc(c.key || '')}"></div>
        <div class="field mt-2"><label for="ai-model">${esc(t('ai.cfg.model'))}</label><input class="input" id="ai-model" type="text" placeholder="${esc(t('ai.cfg.ph.model'))}" value="${esc(c.model || '')}" autocomplete="off"></div>
        <button class="btn primary block mt-3" data-act="ai-save">${esc(t('c.save'))}</button>
        <button class="btn secondary block mt-2" data-act="ai-test">${icon('pulse')}${esc(t('ai.cfg.test'))}</button>
        <p class="xs subtle mt-2">${esc(t('ai.cfg.img'))}</p>
      </section>
      <div class="card flat mt-3"><p class="xs muted">${esc(t('ai.cfg.note'))}</p><p class="xs muted mt-2">${esc(t('ai.offline.tip'))}</p></div>`;
  }

  function download(name, text, type = 'application/json') {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function mount(root) {
    root.addEventListener('change', e => {
      if (e.target.id === 'import-file' && e.target.files[0]) {
        const r = new FileReader();
        r.onload = () => { try { Store.importJSON(r.result); I18N.set(Store.state.settings.lang); toast(t('m.report.import.ok'), 'ok'); UI.go('#/home'); } catch (err) { toast(t('m.report.import.err'), 'danger'); } };
        r.readAsText(e.target.files[0]);
      }
    });
    root.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.lang) { Store.update(s => { s.settings.lang = d.lang; }); I18N.set(d.lang); UI.render(); }
      else if (d.scale) { Store.update(s => { s.settings.textScale = d.scale; }); document.documentElement.dataset.scale = d.scale; UI.render(); }
      else if (d.country) {
        const c = Standards.country(d.country);
        if (c.region !== Store.state.settings.region && !(await UI.confirm(t('region.change.d'), { okText: t('c.confirm') }))) return;
        Store.update(s => { s.settings.country = c.code; s.settings.region = c.region; s.settings.units = Standards.defaultUnitsFor(c.code); s.checkups.removed = {}; });
        toast(t('c.saved'), 'ok'); UI.render();
      }
      else if (d.unit) { Store.update(s => { s.settings.units[d.unit] = d.val; }); UI.render(); }
      else if (d.act === 'gen-code') { Store.update(s => { s.family.code = Math.random().toString(36).slice(2, 8).toUpperCase(); }); UI.render(); }
      else if (d.act === 'copy-code') { try { await navigator.clipboard.writeText(Store.state.family.code); toast(t('c.copied'), 'ok'); } catch (err) { toast(Store.state.family.code); } }
      else if (d.perm) { Store.update(s => { s.family.perms[d.perm] = !s.family.perms[d.perm]; }); UI.render(); }
      else if (d.setting) { Store.update(s => { s.settings[d.setting] = !s.settings[d.setting]; }); UI.render(); }
      else if (d.act === 'export') download(`pregjourney-${Store.todayStr()}.json`, Store.exportJSON());
      else if (d.act === 'wipe') { if (await UI.confirm(t('m.privacy.delete.confirm'), { danger: true, okText: t('c.delete') })) { Store.wipe(); I18N.set(Store.state.settings.lang); UI.go('#/onboarding'); } }
      else if (d.act === 'loss-on') { if (await UI.confirm(t('m.loss.confirm'))) { Store.update(s => { s.settings.lossMode = true; }); UI.go('#/home'); } }
      else if (d.act === 'loss-off') { Store.update(s => { s.settings.lossMode = false; }); UI.go('#/home'); }
      else if (d.act === 'ai-save') {
        const endpoint = root.querySelector('#ai-endpoint').value.trim();
        const key = root.querySelector('#ai-key').value.trim();
        const model = root.querySelector('#ai-model').value.trim();
        Store.update(s => { s.settings.ai = { endpoint, key, model }; });
        toast(t('c.saved'), 'ok'); UI.render();
      }
      else if (d.act === 'ai-test') {
        const endpoint = root.querySelector('#ai-endpoint').value.trim();
        const key = root.querySelector('#ai-key').value.trim();
        const model = root.querySelector('#ai-model').value.trim();
        Store.update(s => { s.settings.ai = { endpoint, key, model }; });
        toast(t('ai.thinking'));
        try { await AI.test(); toast(t('ai.cfg.ok'), 'ok'); }
        catch (e) { toast(t('ai.err', { e: (e && (e.message || e)) }), 'danger'); }
        UI.render();
      }
    });
  }
  UI.Views.me = { render, mount };

  // ---------------- Printable weekly report (PRD §6.8) ----------------
  function renderReport() {
    const st = Store.state;
    const r = Engine.report(st);
    const hide = false; // report is for clinicians: always show numbers
    const p = st.profile;
    const b = Engine.bmi(p.heightCm, p.preWeightKg);
    const last = Engine.latestWeight(st);
    const nxt = r.gs.status === 'high' ? 'r.next.high' : r.gs.status === 'low' ? 'r.next.low' : 'r.next.in';
    const pct = (a, tgt) => tgt ? Math.round(a / tgt * 100) + '%' : '—';
    return `${UI.topbar(t('r.title'), true, `<button class="btn sm primary no-print" data-act="print" id="btn-print">${icon('print')}${esc(t('r.print'))}</button>`)}
      <p class="small muted mb-2">${esc(t('r.sub', { d: UI.fmtDateLong(new Date()), std: t('region.' + st.settings.region) }))}</p>
      <section class="card"><h2 class="card-title mb-1">${esc(t('r.profile'))}</h2>
        <table class="tri-table"><tr><td>${esc(t('c.gestWeek', { w: '' })).trim()}</td><td>${esc(fmtWeek(r.g))}</td></tr><tr><td>${esc(t('m.edd'))}</td><td>${esc(fmtDate(r.g && r.g.edd, { year: 'numeric', month: 'long', day: 'numeric' }))}</td></tr><tr><td>${esc(t('m.age'))}</td><td>${p.age || '—'}${p.age >= 35 ? ' · ≥35' : ''}</td></tr><tr><td>${esc(t('w.bmi'))}</td><td>${b ? b.toFixed(1) : '—'} · ${esc(t('bmi.' + Standards.bmiCategory(b || 22, st.settings.region)))}</td></tr><tr><td>${esc(t('onb.body.multiple'))}</td><td>${esc(p.multiple ? t('onb.body.twins') : t('onb.body.single'))}</td></tr>${(p.conditions || []).length ? `<tr><td>${esc(t('onb.health.title'))}</td><td>${p.conditions.map(c => esc(t('onb.health.' + c))).join(', ')}</td></tr>` : ''}</table></section>
      <section class="card mt-2"><h2 class="card-title mb-1">${esc(t('r.weight'))}</h2>
        ${last ? `<p class="small">${esc(t('r.gain.row', { pre: fmtWeight(p.preWeightKg), cur: fmtWeight(last.kg), gain: UI.fmtDelta(last.kg - p.preWeightKg) }))}</p>` : `<p class="small muted">${esc(t('w.empty'))}</p>`}
        ${r.gs.status !== 'na' ? `<p class="small mt-1"><span class="chip ${r.gs.status === 'in' ? 'ok' : 'warn'}">${esc(t('w.status.' + r.gs.status))}</span> <span class="muted">${esc(t('w.band'))} ${esc(fmtWeight(r.gs.band.low, false))}–${esc(fmtWeight(r.gs.band.high))} · ${esc(t('w.total'))} ${esc(fmtWeight(r.gs.band.total[0], false))}–${esc(fmtWeight(r.gs.band.total[1]))}</span></p>` : ''}
        ${UI.sourceNote(Standards.region(st.settings.region).gwgSourceKey)}</section>
      <section class="card mt-2"><h2 class="card-title mb-1">${esc(t('r.diet'))}</h2>
        ${r.intakeDays ? `<table class="tri-table"><tr><th></th><th>${esc(t('d.eaten'))}</th><th>${esc(t('d.target'))}</th><th>%</th></tr>${[['kcal', UI.fmtEnergy(r.avg.kcal), UI.fmtEnergy(r.targets.kcal)], ['protein', Math.round(r.avg.protein) + ' g', r.targets.protein + ' g'], ['folate', Math.round(r.avg.folate) + ' μg', r.targets.folate + ' μg'], ['iron', r.avg.iron.toFixed(1) + ' mg', r.targets.iron + ' mg'], ['calcium', Math.round(r.avg.calcium) + ' mg', r.targets.calcium + ' mg'], ['iodine', Math.round(r.avg.iodine) + ' μg', r.targets.iodine + ' μg'], ['dha', Math.round(r.avg.dha) + ' mg', r.targets.dha + ' mg']].map(([k, a, tg]) => `<tr><td>${esc(k === 'kcal' ? t('d.energy') : t('d.n.' + k))}</td><td>${esc(a)}</td><td>${esc(tg)}</td><td>${pct(r.avg[k], r.targets[k])}</td></tr>`).join('')}</table>` : `<p class="small muted">${esc(t('d.empty'))}</p>`}</section>
      <section class="card mt-2"><h2 class="card-title mb-1">${esc(t('r.exercise'))}</h2><p class="small">${r.exerciseMin} / ${Standards.THRESHOLDS.activityMinPerWeek} ${esc(t('c.min'))}${Engine.exerciseLocked(st) ? ' · ' + esc(t('e.locked.t')) : ''}</p></section>
      <section class="card mt-2"><h2 class="card-title mb-1">${esc(t('r.vitals'))}</h2><p class="small">${esc(t('t.bp'))}: ${r.bp ? `${r.bp.sys}/${r.bp.dia} mmHg (${UI.fmtDate(r.bp.ts)})` : '—'}</p><p class="small">${esc(t('t.glucose'))}: ${r.glucose.length ? r.glucose.map(g => `${UI.fmtGlucose(g.mmol)} ${t('t.glu.' + g.type)}`).join(' · ') : '—'}</p></section>
      <section class="card mt-2"><h2 class="card-title mb-1">${esc(t('r.alerts'))}</h2>${r.alerts.length ? `<ul class="stack" style="gap:4px">${r.alerts.map(a => `<li class="small">• <b>${esc(t(a.t))}</b> — ${esc(t(a.d))}</li>`).join('')}</ul>` : `<p class="small muted">${esc(t('home.noalerts'))}</p>`}</section>
      <section class="card mt-2 tint"><h2 class="card-title mb-1">${esc(t('r.next'))}</h2><p class="small">${esc(t(nxt))}</p></section>
      <p class="disclaimer">${esc(t('m.disclaimer'))}</p>`;
  }
  UI.Views.report = { render: renderReport, mount(root) { root.addEventListener('click', e => { if (e.target.closest('[data-act="print"]')) window.print(); }); } };
})();
