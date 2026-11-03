/* Exercise — safety screen & lock, weekly 150-min goal, courses by trimester, stop signals (PRD §6.4) */
(function () {
  'use strict';
  const { esc, icon, L, toast } = UI;
  const FLAGS = ['previa', 'cervix', 'preterm', 'htn', 'bleed', 'rom', 'anemia', 'multi'];
  const TYPES = ['walk', 'yoga', 'swim', 'kegel', 'stretch', 'pelvic', 'breath', 'strength', 'other'];
  let draftFlags = [];

  function render() {
    const st = Store.state;
    const lock = Engine.exerciseLocked(st);
    const g = Engine.gestAge(st.profile);
    const tri = g ? g.trimester : 1;
    if (lock === 'unscreened') return screen();
    if (lock) return `${UI.topbar(t('e.title'))}
      <section class="card tint"><div class="row"><div class="lead" style="width:44px;height:44px;border-radius:14px;background:var(--warn-soft);display:grid;place-items:center;color:hsl(30 90% 36%)">${icon('lock')}</div><div class="grow"><div class="bold">${esc(t('e.locked.t'))}</div></div></div><p class="small muted mt-2">${esc(t('e.locked.d'))}</p>
        ${lock === 'flags' ? `<button class="btn secondary block mt-3" data-act="rescreen">${esc(t('e.rescreen'))}</button>` : `<a class="btn secondary block mt-3" href="#/onboarding/edit">${esc(t('m.edit'))}</a>`}</section>
      <section class="card mt-3"><div class="bold" style="color:var(--danger)">${esc(t('e.stop.t'))}</div><p class="small muted mt-1">${esc(t('e.stop.d'))}</p></section>`;

    const mins = Engine.weekMinutes(st);
    const goal = Standards.THRESHOLDS.activityMinPerWeek;
    const start = Store.todayStr(Engine.weekStart());
    const recent = st.workouts.filter(w => w.date >= start).sort((a, b) => b.ts - a.ts);
    const courses = Content.COURSES[tri];
    return `${UI.topbar(t('e.title'))}
      <section class="card">
        <div class="row" style="gap:18px">${UI.ring(mins / goal, `${mins}`, `/ ${goal} ${t('c.min')}`)}
          <div class="grow"><div class="bold">${esc(t('e.weekly'))}</div><div class="small muted">${esc(t('e.goal'))}</div>
            <button class="btn primary mt-2" data-act="log" id="btn-log-ex">${icon('plus')}${esc(t('e.log'))}</button></div></div>
        ${mins >= goal ? `<div class="notice primary mt-2">🏅 ${esc(t('e.streak', { n: Math.max(1, st.weeklyGoalStreak || 1) }))}</div>` : ''}
      </section>
      <section class="card mt-3"><div class="row" style="align-items:flex-start"><span style="color:var(--primary)">${icon('info')}</span><div><div class="bold small">${esc(t('e.talk'))}</div><p class="small muted">${esc(t('e.talk.d'))}</p></div></div></section>
      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('e.courses'))}</h2><span class="chip">${esc(t('home.tri.' + tri))}</span></div>
        <div class="list">${courses.map(c => `<div class="list-item"><div class="lead">${icon('activity')}</div><div class="body"><div class="title">${esc(t('e.type.' + c.type))} · ${esc(t('e.course.min', { n: c.min }))}</div><div class="sub">${esc(L(c.d))}</div></div><button class="btn sm soft" data-quick="${c.type}" data-min="${c.min}">${esc(t('c.done'))}</button></div>`).join('')}</div>
        ${UI.sourceNote('e.src')}
      </section>
      <section class="card mt-3 flat" style="background:var(--danger-soft)"><div class="bold" style="color:var(--danger)">${esc(t('e.stop.t'))}</div><p class="small muted mt-1">${esc(t('e.stop.d'))}</p></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('e.history'))}</h2><button class="btn sm ghost" data-act="rescreen">${esc(t('e.rescreen'))}</button></div>
        ${recent.length ? `<div class="list">${recent.map(w => `<div class="list-item" ${w.photoId ? `data-photoview="${w.photoId}" role="button" tabindex="0" title="${esc(t('photo.privacy'))}"` : ''}>${w.photoId ? `<img class="meal-thumb" data-photo="${w.photoId}" alt="${esc(t('e.photo'))}">` : ''}<div class="body"><div class="title">${esc(t('e.type.' + w.type))}</div><div class="sub">${esc(UI.fmtRelDay(w.date))}</div></div><div class="trail"><span>${w.minutes} ${esc(t('c.min'))}</span><button class="btn icon ghost" data-del="${w.ts}" aria-label="${esc(t('c.delete'))}">${icon('trash')}</button></div></div>`).join('')}</div>` : `<p class="muted small">${esc(t('e.empty'))}</p>`}
      </section>`;
  }

  function screen() {
    return `${UI.topbar(t('e.title'))}
      <section class="card"><h2 class="card-title">${esc(t('e.screen.t'))}</h2><p class="small muted mt-1 mb-2">${esc(t('e.screen.lead'))}</p>
        <div class="choice-group">${FLAGS.map(f => `<button class="choice checkbox ${draftFlags.includes(f) ? 'selected' : ''}" data-flag="${f}"><span class="radio"></span><div class="t">${esc(t('e.s.' + f))}</div></button>`).join('')}
          <button class="choice checkbox ${!draftFlags.length ? 'selected' : ''}" data-flag="none"><span class="radio"></span><div class="t">${esc(t('e.s.none'))}</div></button></div>
        <button class="btn primary block mt-3" data-act="finish-screen" id="btn-screen-done">${esc(t('e.screen.done'))}</button>
        ${UI.sourceNote('e.src')}</section>`;
  }

  function logSheet(type = 'walk', minutes = 30) {
    UI.sheet({
      title: t('e.log'),
      body: `<div class="stack"><div class="field"><label for="ex-type">${esc(t('e.courses'))}</label><select class="input" id="ex-type">${TYPES.map(x => `<option value="${x}" ${x === type ? 'selected' : ''}>${esc(t('e.type.' + x))}</option>`).join('')}</select></div>
        <div class="field"><label for="ex-min">${esc(t('e.minutes'))}</label><input class="input" type="number" id="ex-min" inputmode="numeric" value="${minutes}" min="1" max="300"></div>
        <div class="row" style="gap:8px">${[15, 20, 30, 45, 60].map(m => `<button class="chip selectable" data-m="${m}">${m}</button>`).join('')}</div>
        <div class="field"><label for="ex-date">${esc(t('w.add.date'))}</label><input class="input" type="date" id="ex-date" value="${Store.todayStr()}" max="${Store.todayStr()}"></div>
        <div class="mt-2">${Photos.pickerHTML('ex-photo', t('photo.add'), true)}</div></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" data-save>${esc(t('c.save'))}</button>`,
      onMount(s, close) {
        let photoId = null;
        Photos.bindPicker(s, 'ex-photo', id => { photoId = id; });
        s.querySelectorAll('[data-m]').forEach(c => c.addEventListener('click', () => { s.querySelector('#ex-min').value = c.dataset.m; }));
        s.querySelector('[data-save]').addEventListener('click', () => {
          const m = +s.querySelector('#ex-min').value, ty = s.querySelector('#ex-type').value, date = s.querySelector('#ex-date').value;
          if (!m || !date) return;
          Store.update(x => { x.workouts.push(Object.assign({ date, type: ty, minutes: m, ts: Date.now() }, photoId ? { photoId } : {})); });
          close(); toast(t('e.logged', { n: m }), 'ok'); UI.render();
        });
      },
    });
  }

  function mount(root) {
    root.addEventListener('click', async e => {
      const pv = e.target.closest('[data-photoview]');
      if (pv && !e.target.closest('button')) { Photos.viewer(pv.dataset.photoview); return; }
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.flag) { if (d.flag === 'none') draftFlags = []; else { const i = draftFlags.indexOf(d.flag); i >= 0 ? draftFlags.splice(i, 1) : draftFlags.push(d.flag); } UI.render(); }
      else if (d.act === 'finish-screen') { Store.update(s => { s.exerciseScreen = { ts: Date.now(), flags: draftFlags.slice() }; }); draftFlags = []; UI.render(); }
      else if (d.act === 'rescreen') { draftFlags = (Store.state.exerciseScreen && Store.state.exerciseScreen.flags || []).slice(); Store.update(s => { s.exerciseScreen = null; }); UI.render(); }
      else if (d.act === 'log') logSheet();
      else if (d.quick) logSheet(d.quick, +d.min);
      else if (d.del) { Store.update(s => { s.workouts = s.workouts.filter(w => String(w.ts) !== d.del); }); UI.render(); }
    });
    Photos.hydrate(root);
  }
  UI.Views.exercise = { render, mount };
})();
