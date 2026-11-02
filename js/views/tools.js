/* Health tools — BP, glucose (regional units), symptoms, regional emergency help (PRD §6.6, §5.5) */
(function () {
  'use strict';
  const { esc, icon, fmtGlucose, glucoseToMmol, toast } = UI;
  const SYM = ['edema', 'bleeding', 'fluid', 'headache', 'dizzy', 'blur', 'nausea', 'back', 'kicks', 'contractions', 'heartburn', 'insomnia', 'constipation', 'cramp'];
  const TH = Standards.THRESHOLDS;
  let draftSym = [];

  function render(params) {
    const sub = params[0] || 'overview';
    const st = Store.state;
    const country = Standards.country(st.settings.country);
    if (sub === 'sos') return sos(st, country);
    if (sub === 'bp') return bp(st);
    if (sub === 'glucose') return glucose(st);
    if (sub === 'symptoms') return symptoms(st);
    const lastBp = st.bp.slice().sort((a, b) => b.ts - a.ts)[0];
    const lastGlu = st.glucose.slice().sort((a, b) => b.ts - a.ts)[0];
    const lastSym = st.symptoms.slice().sort((a, b) => b.ts - a.ts)[0];
    return `${UI.topbar(t('t.title'))}
      <button class="sos" data-go="#/tools/sos" id="btn-sos"><span class="ic">${icon('phone')}</span><div><b>${esc(t('t.sos'))}</b><span>${country.flag} ${esc(t('t.sos.call', { n: country.emergency }))}</span></div></button>
      <section class="card mt-3"><div class="list">
        <a class="list-item" href="#/tools/bp"><div class="lead">${icon('heart')}</div><div class="body"><div class="title">${esc(t('t.bp'))}</div><div class="sub">${lastBp ? `${lastBp.sys}/${lastBp.dia} mmHg · ${esc(UI.fmtDate(lastBp.ts))}` : esc(t('t.empty'))}</div></div>${icon('chevR', 'chev')}</a>
        <a class="list-item" href="#/tools/glucose"><div class="lead">${icon('drop')}</div><div class="body"><div class="title">${esc(t('t.glucose'))}</div><div class="sub">${lastGlu ? `${esc(fmtGlucose(lastGlu.mmol))} · ${esc(t('t.glu.' + lastGlu.type))}` : esc(t('t.empty'))}</div></div>${icon('chevR', 'chev')}</a>
        <a class="list-item" href="#/tools/symptoms"><div class="lead">${icon('pulse')}</div><div class="body"><div class="title">${esc(t('t.symptoms'))}</div><div class="sub">${lastSym ? lastSym.tags.map(x => t('t.sym.' + x)).join(', ') + ' · ' + UI.fmtDate(lastSym.ts) : esc(t('t.empty'))}</div></div>${icon('chevR', 'chev')}</a>
        <a class="list-item" href="#/kicks"><div class="lead">${icon('footprints')}</div><div class="body"><div class="title">${esc(t('g.kicks'))}</div></div>${icon('chevR', 'chev')}</a>
        <a class="list-item" href="#/contractions"><div class="lead">${icon('timer')}</div><div class="body"><div class="title">${esc(t('g.contractions'))}</div></div>${icon('chevR', 'chev')}</a>
      </div></section>
      <p class="disclaimer">${esc(t('al.disclaimer'))}</p>`;
  }

  function sos(st, country) {
    return `${UI.topbar(t('t.sos'))}
      <a class="sos" href="tel:${country.emergency}" id="sos-call" style="text-decoration:none"><span class="ic">${icon('phone')}</span><div><b>${esc(t('t.sos.call', { n: country.emergency }))}</b><span>${country.flag} ${esc(t('t.sos.d', { c: t(country.nameKey) }))}</span></div></a>
      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('t.sos.hospital'))}</h2><button class="btn sm ghost" data-act="set-hospital">${icon('edit')}${esc(t('c.edit'))}</button></div>
        ${st.settings.hospitalPhone ? `<a class="btn secondary block lg" href="tel:${esc(st.settings.hospitalPhone)}">${icon('phone')}${esc(st.settings.hospitalPhone)}</a>` : `<button class="btn secondary block" data-act="set-hospital">${esc(t('t.sos.hospital.set'))}</button>`}
      </section>
      <section class="card mt-3 flat" style="background:var(--danger-soft)"><div class="bold" style="color:var(--danger)">${esc(t('t.sos.when'))}</div></section>
      <p class="disclaimer">${esc(t('al.disclaimer'))}</p>`;
  }

  function bp(st) {
    const list = st.bp.slice().sort((a, b) => b.ts - a.ts).slice(0, 20);
    return `${UI.topbar(t('t.bp'))}
      <section class="card"><div class="grid-2"><div class="field"><label for="bp-sys">${esc(t('t.bp.sys'))}</label><div class="input-group"><input class="input" id="bp-sys" type="number" inputmode="numeric" placeholder="115"><span class="unit">mmHg</span></div></div><div class="field"><label for="bp-dia">${esc(t('t.bp.dia'))}</label><div class="input-group"><input class="input" id="bp-dia" type="number" inputmode="numeric" placeholder="75"><span class="unit">mmHg</span></div></div></div>
        <button class="btn primary block mt-2" data-act="save-bp" id="btn-save-bp">${esc(t('t.bp.log'))}</button><p class="xs subtle mt-1">${esc(t('t.bp.target'))}</p></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('t.history'))}</h2></div>${list.length ? `<div class="list">${list.map(b => { const hi = b.sys >= TH.bp.sys || b.dia >= TH.bp.dia; return `<div class="list-item"><div class="body"><div class="title num">${b.sys}/${b.dia} <span class="xs muted">mmHg</span></div><div class="sub">${esc(UI.fmtDate(b.ts))} ${esc(UI.fmtTime(b.ts))}</div></div><span class="chip ${hi ? 'danger' : 'ok'}">${esc(hi ? t('t.high') : t('t.normal'))}</span><button class="btn icon ghost" data-del-bp="${b.ts}" aria-label="${esc(t('c.delete'))}">${icon('trash')}</button></div>`; }).join('')}</div>` : `<p class="small muted">${esc(t('t.empty'))}</p>`}</section>`;
  }

  function glucose(st) {
    const list = st.glucose.slice().sort((a, b) => b.ts - a.ts).slice(0, 20);
    const u = t('units.' + st.settings.units.glucose);
    const cv = v => fmtGlucose(v, false);
    return `${UI.topbar(t('t.glucose'))}
      <section class="card"><div class="field"><label for="glu-type">${esc(t('t.glu.type'))}</label><div class="seg block" id="glu-type">${['fasting', 'pp1', 'pp2'].map((k, i) => `<button class="${i === 0 ? 'active' : ''}" data-glutype="${k}">${esc(t('t.glu.' + k))}</button>`).join('')}</div></div>
        <div class="field mt-2"><label for="glu-val">${esc(t('t.glucose'))}</label><div class="input-group"><input class="input" id="glu-val" type="number" step="${st.settings.units.glucose === 'mgdl' ? '1' : '0.1'}" inputmode="decimal" placeholder="${st.settings.units.glucose === 'mgdl' ? '90' : '5.0'}"><span class="unit">${esc(u)}</span></div></div>
        <button class="btn primary block mt-2" data-act="save-glu" id="btn-save-glu">${esc(t('t.glu.log'))}</button>
        <p class="xs subtle mt-1">${esc(t('t.glu.target', { f: cv(TH.glucose.fasting), p1: cv(TH.glucose.pp1h), p2: cv(TH.glucose.pp2h), u }))}</p></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('t.history'))}</h2></div>${list.length ? `<div class="list">${list.map(g => { const lim = g.type === 'fasting' ? TH.glucose.fasting : g.type === 'pp1' ? TH.glucose.pp1h : TH.glucose.pp2h; const hi = g.mmol >= lim; return `<div class="list-item"><div class="body"><div class="title num">${esc(fmtGlucose(g.mmol))}</div><div class="sub">${esc(t('t.glu.' + g.type))} · ${esc(UI.fmtDate(g.ts))} ${esc(UI.fmtTime(g.ts))}</div></div><span class="chip ${hi ? 'danger' : 'ok'}">${esc(hi ? t('t.high') : t('t.normal'))}</span><button class="btn icon ghost" data-del-glu="${g.ts}" aria-label="${esc(t('c.delete'))}">${icon('trash')}</button></div>`; }).join('')}</div>` : `<p class="small muted">${esc(t('t.empty'))}</p>`}</section>`;
  }

  function symptoms(st) {
    const list = st.symptoms.slice().sort((a, b) => b.ts - a.ts).slice(0, 20);
    return `${UI.topbar(t('t.symptoms'))}
      <section class="card"><div class="chips">${SYM.map(s => `<button class="chip selectable ${draftSym.includes(s) ? 'selected' : ''} ${['bleeding', 'fluid', 'kicks', 'blur'].includes(s) && draftSym.includes(s) ? 'danger' : ''}" data-sym="${s}">${esc(t('t.sym.' + s))}</button>`).join('')}</div>
        <div class="field mt-2"><label for="sym-note">${esc(t('t.sym.note'))}</label><input class="input" id="sym-note" placeholder="${esc(t('t.sym.note'))}"></div>
        <button class="btn primary block mt-2" data-act="save-sym" id="btn-save-sym" ${draftSym.length ? '' : 'disabled'}>${esc(t('t.sym.log'))}</button></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('t.history'))}</h2></div>${list.length ? `<div class="list">${list.map(s => `<div class="list-item"><div class="body"><div class="title">${s.tags.map(x => esc(t('t.sym.' + x))).join(', ')}</div><div class="sub">${esc(UI.fmtDate(s.ts))} ${esc(UI.fmtTime(s.ts))}${s.note ? ' · ' + esc(s.note) : ''}</div></div><button class="btn icon ghost" data-del-sym="${s.ts}" aria-label="${esc(t('c.delete'))}">${icon('trash')}</button></div>`).join('')}</div>` : `<p class="small muted">${esc(t('t.empty'))}</p>`}</section>`;
  }

  function hospitalSheet() {
    UI.sheet({ title: t('t.sos.hospital.set'), body: `<div class="field"><input class="input" id="hosp" type="tel" placeholder="${esc(t('t.sos.hospital.ph'))}" value="${esc(Store.state.settings.hospitalPhone)}"></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" data-save>${esc(t('c.save'))}</button>`,
      onMount(s, close) { s.querySelector('[data-save]').addEventListener('click', () => { Store.update(x => { x.settings.hospitalPhone = s.querySelector('#hosp').value.trim(); }); close(); UI.render(); }); } });
  }

  function mount(root) {
    let gluType = 'fasting';
    root.addEventListener('click', e => {
      const go = e.target.closest('[data-go]'); if (go) { UI.go(go.dataset.go); return; }
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.act === 'set-hospital') hospitalSheet();
      else if (d.act === 'save-bp') {
        const sys = +root.querySelector('#bp-sys').value, dia = +root.querySelector('#bp-dia').value;
        if (sys < 60 || sys > 260 || dia < 30 || dia > 160) { toast(t('t.err'), 'danger'); return; }
        Store.update(s => { s.bp.push({ ts: Date.now(), sys, dia }); });
        if (sys >= TH.bp.sys || dia >= TH.bp.dia) UI.sheet({ title: t('al.bp.t'), body: UI.alertCard({ level: 'urgent', t: 'al.bp.t', d: 'al.bp.d', actions: ['call'] }), actions: `<button class="btn secondary" data-close>${esc(t('c.close'))}</button>` });
        else toast(t('c.saved'), 'ok');
        UI.render();
      }
      else if (d.glutype) { gluType = d.glutype; root.querySelectorAll('[data-glutype]').forEach(x => x.classList.toggle('active', x === b)); }
      else if (d.act === 'save-glu') {
        const v = +root.querySelector('#glu-val').value; if (!v) { toast(t('t.err'), 'danger'); return; }
        const mmol = Math.round(glucoseToMmol(v) * 100) / 100; if (mmol < 1 || mmol > 35) { toast(t('t.err'), 'danger'); return; }
        Store.update(s => { s.glucose.push({ ts: Date.now(), type: gluType, mmol }); }); toast(t('c.saved'), 'ok'); UI.render();
      }
      else if (d.sym) { const i = draftSym.indexOf(d.sym); i >= 0 ? draftSym.splice(i, 1) : draftSym.push(d.sym); UI.render(); }
      else if (d.act === 'save-sym') {
        const note = root.querySelector('#sym-note').value.trim(); const tags = draftSym.slice(); draftSym = [];
        Store.update(s => { s.symptoms.push({ ts: Date.now(), tags, note }); });
        if (tags.includes('bleeding') || tags.includes('fluid') || tags.includes('kicks')) UI.sheet({ title: t('al.sym.t'), body: UI.alertCard({ level: 'urgent', t: tags.includes('kicks') && !tags.includes('bleeding') && !tags.includes('fluid') ? 'al.kicks.t' : 'al.sym.t', d: tags.includes('kicks') && !tags.includes('bleeding') && !tags.includes('fluid') ? 'k.low.d' : 'al.sym.d', actions: ['call'] }), actions: `<button class="btn secondary" data-close>${esc(t('c.close'))}</button>` });
        else toast(t('c.saved'), 'ok');
        UI.render();
      }
      else if (d.delBp) { Store.update(s => { s.bp = s.bp.filter(x => String(x.ts) !== d.delBp); }); UI.render(); }
      else if (d.delGlu) { Store.update(s => { s.glucose = s.glucose.filter(x => String(x.ts) !== d.delGlu); }); UI.render(); }
      else if (d.delSym) { Store.update(s => { s.symptoms = s.symptoms.filter(x => String(x.ts) !== d.delSym); }); UI.render(); }
    });
  }
  UI.Views.tools = { render, mount };
})();
