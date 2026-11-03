/* Home — week card, today's tasks, baby, alerts, next visit, quick actions (PRD §4). Includes care mode (§6.10). */
(function () {
  'use strict';
  const { esc, icon, L, fmtWeek, fmtWeight, fmtDelta, fmtDate, stdBadge, alertCard, toast } = UI;

  function greeting() { const h = new Date().getHours(); return t(h < 11 ? 'home.hi.morning' : h < 18 ? 'home.hi.day' : 'home.hi.evening'); }

  function tasksFor(st, g) {
    const list = [{ id: 'weight', href: '#/weight' }, { id: 'folate', href: null }, { id: 'diet', href: '#/diet' }, { id: 'water', href: null }];
    if (!Engine.exerciseLocked(st)) list.push({ id: 'exercise', href: '#/exercise' });
    if (g && g.weeks >= 28) list.push({ id: 'kicks', href: '#/kicks' });
    if (g && g.trimester === 3 || (st.profile.conditions || []).includes('hypertension')) list.push({ id: 'bp', href: '#/tools/bp' });
    const today = Store.todayStr();
    for (const c of (st.customTasks || [])) {
      if (c.repeat === 'daily' || c.date === today) list.push({ id: c.id, href: null, custom: true, title: c.title, repeat: c.repeat });
    }
    const done = st.tasks[today] || {};
    // auto-complete from data
    const auto = {
      weight: st.weights.some(w => w.date === today),
      diet: st.meals.some(m => m.date === today),
      exercise: st.workouts.some(w => w.date === today),
      kicks: st.kicks.some(k => k.end && Store.todayStr(new Date(k.end)) === today),
      bp: st.bp.some(b => Store.todayStr(new Date(b.ts)) === today),
    };
    return list.map(x => Object.assign(x, { done: !!done[x.id] || !!auto[x.id] }));
  }

  function render() {
    const st = Store.state;
    if (st.settings.lossMode) return renderLoss(st);
    const g = Engine.gestAge(st.profile);
    const wk = Content.weekInfo(g ? g.weeks : 4);
    const alerts = Engine.alerts(st);
    const tasks = tasksFor(st, g);
    const gs = Engine.gainStatus(st);
    const next = Engine.nextCheckup(st);
    const pct = g ? Math.min(100, Math.max(0, g.days / 280 * 100)) : 0;
    const tri = g ? (g.weeks >= 37 ? 'post' : g.trimester) : 1;
    const hide = st.settings.hideWeightNumbers;
    const country = Standards.country(st.settings.country);

    return `
      <header class="topbar" style="padding-bottom:10px">${Mascot.appIcon(36)}<div class="grow"><div class="eyebrow">${esc(greeting())}</div><h1 style="font-size:1.25rem">${esc(t('app.name'))}</h1></div>
        <a class="btn icon secondary" href="#/tools/sos" aria-label="${esc(t('t.sos'))}" style="color:var(--danger)">${icon('phone')}</a></header>

      <section class="hero" aria-label="${esc(t('c.gestWeek', { w: fmtWeek(g) }))}">
        <div class="row between" style="align-items:flex-start">
          <div><div class="meta">${esc(t('home.tri.' + tri))}</div><div class="week">${fmtWeek(g, { html: true })}</div></div>
          ${stdBadge()}
        </div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="trimesters"><span>T1</span><span>T2</span><span>T3</span><span>40w</span></div>
        <div class="row between mt-2 meta"><span>${g && g.daysLeft >= 0 ? esc(t('home.daysLeft', { n: g.daysLeft })) : esc(t('home.overdue', { n: g ? -g.daysLeft : 0 }))}</span><span>${esc(t('home.edd', { d: fmtDate(g && g.edd) }))}</span></div>
      </section>

      ${(() => { const m = Mascot.say(st); return `<section class="companion mt-3" aria-label="${esc(t('mascot.name'))}" data-mood="${m.mood}"><button class="mascot-btn" data-act="poke" aria-label="${esc(t('mascot.name'))}" style="border:0;background:none;padding:0">${Mascot.mascot({ size: 72, mood: m.mood })}</button><div class="bubble"><div class="who">${esc(t('mascot.name'))}</div><div class="say">${esc(m.text)}</div></div></section>`; })()}

      ${(() => { const up = Engine.upcomingReminders(st); if (!up.length) return ''; const u = up[0]; const msg = u.daysUntil === 0 ? t('g.rem.banner.today', { t: u.title }) : u.daysUntil === 1 ? t('g.rem.banner.tomorrow', { t: u.title }) : t('g.rem.banner.soon', { n: u.daysUntil, t: u.title }); return `<a class="alert info mt-3" href="#/calendar" style="text-decoration:none;color:inherit"><div class="ic">${icon('calendar')}</div><div class="grow"><div class="t">${esc(msg)}</div><div class="d">${u.scheduled ? esc(UI.fmtDate(u.dueDate, { month: 'short', day: 'numeric', weekday: 'short' }) + (u.scheduled.time ? ' ' + u.scheduled.time : '') + (u.scheduled.place ? ' · ' + u.scheduled.place : '')) : esc(t('g.cal.window', { w: t('week.only', { w: u.from === u.to ? u.from : u.from + '–' + u.to }) }))}${up.length > 1 ? ` · +${up.length - 1}` : ''}</div></div>${icon('chevR', 'chev')}</a>`; })()}

      ${alerts.length ? `<section class="mt-3 stack" aria-label="${esc(t('home.alerts'))}">${alerts.map(alertCard).join('')}<p class="disclaimer">${esc(t('al.disclaimer'))}</p></section>` : ''}

      ${(() => { const q = Content.quoteOfDay(st.quoteOffset || 0); return `<section class="card mt-3 quote" aria-label="${esc(t('home.quote'))}">
        <div class="row between"><span class="eyebrow">${esc(t('home.quote'))}</span><button class="btn sm ghost" data-act="next-quote" aria-label="${esc(t('home.quote.next'))}">${icon('refresh')}${esc(t('home.quote.next'))}</button></div>
        <blockquote class="quote-text">${esc(L(q))}</blockquote>
        <div class="quote-src">— ${esc(L(q.src))}</div></section>`; })()}

      <nav class="quick mt-3" aria-label="Quick actions">
        <button data-go="#/ai"><span class="ic coral">${icon('sparkle')}</span>${esc(t('home.quick.ai'))}</button>
        <button data-go="#/calendar"><span class="ic">${icon('calendar')}</span>${esc(t('home.quick.calendar'))}</button>
        <button data-go="#/exercise"><span class="ic sky">${icon('activity')}</span>${esc(t('home.quick.exercise'))}</button>
        <button data-go="#/tools"><span class="ic sun">${icon('pulse')}</span>${esc(t('home.quick.tools'))}</button>
        <button data-go="#/kicks"><span class="ic coral">${icon('footprints')}</span>${esc(t('home.quick.kicks'))}</button>
        <button data-go="#/contractions"><span class="ic">${icon('timer')}</span>${esc(t('home.quick.contractions'))}</button>
        <button data-go="#/tools/sos"><span class="ic" style="background:var(--danger-soft);color:var(--danger)">${icon('phone')}</span>${esc(t('home.quick.sos'))}</button>
      </nav>

      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('home.tasks'))}</h2><span class="subtle">${tasks.filter(x => x.done).length}/${tasks.length}</span></div>
        ${tasks.every(x => x.done) ? `<p class="muted">${esc(t('home.tasks.done'))}</p>` : ''}
        <div>${tasks.map(x => { const label = x.custom ? x.title : t('task.' + x.id); return `<div class="task ${x.done ? 'done' : ''}"><button class="check" data-task="${x.id}" aria-pressed="${x.done}" aria-label="${esc(label)}">${x.done ? icon('check') : ''}</button><span class="label">${esc(label)}${x.custom && x.repeat === 'daily' ? ` <span class="chip xs" style="padding:2px 8px">${esc(t('home.task.daily'))}</span>` : ''}</span>${x.href && !x.done ? `<a class="go" href="${x.href}">${esc(t('c.start'))} ›</a>` : ''}${x.custom ? `<button class="btn icon ghost sm" data-deltask="${x.id}" aria-label="${esc(t('c.delete'))}" style="width:32px;min-height:32px;color:var(--ink-3)">${icon('x')}</button>` : ''}</div>`; }).join('')}</div>
        <button class="btn soft sm mt-2" data-act="add-task" id="btn-add-task">${icon('plus')}${esc(t('home.task.add'))}</button>
      </section>

      <section class="card mt-3 pressable" data-go="#/weight" role="link" tabindex="0">
        <div class="card-head"><h2 class="card-title">${esc(t('home.weight.card'))}</h2>${gs.status !== 'na' ? `<span class="chip ${gs.status === 'in' ? 'ok' : 'warn'}">${esc(t('w.status.' + gs.status))}</span>` : ''}</div>
        ${gs.status === 'na' ? `<div class="row between"><span class="muted">${esc(t('home.weight.none'))}</span><span class="bold" style="color:var(--primary)">${esc(t('home.weight.log'))} ›</span></div>`
          : `<div class="row between"><div class="stat"><div class="v">${hide ? '•••' : esc(fmtDelta(gs.gain, false))}<small>${hide ? '' : esc(t('units.' + st.settings.units.weight))}</small></div><div class="l">${esc(t('w.gain'))}</div></div>
             <div class="col" style="text-align:right"><span class="small muted">${esc(t('home.weight.band', { low: fmtWeight(gs.band.low, false), high: fmtWeight(gs.band.high) }))}</span><span class="xs subtle">${esc(t('w.chart.legend.std', { std: t('region.' + st.settings.region) }))}</span></div></div>`}
      </section>

      <section class="card mt-3 pressable" data-go="#/week/${wk.week}" role="link" tabindex="0">
        <div class="card-head"><h2 class="card-title">${esc(t('home.baby'))}</h2><span class="subtle">${esc(t('g.week', { n: wk.week }))} ›</span></div>
        <div class="baby"><div class="fruit" aria-hidden="true">${wk.emoji}</div><div><div class="bold">${esc(t('home.baby.like', { fruit: L(wk.fruit) }))}</div><div class="size">${esc(t('home.baby.size', { len: wk.len, wt: wk.wt }))}</div><p class="small muted mt-1">${esc(L(wk.milestone))}</p></div></div>
      </section>

      <section class="card mt-3 pressable" data-go="#/calendar" role="link" tabindex="0">
        <div class="card-head"><h2 class="card-title">${esc(t('home.checkup.next'))}</h2>${icon('chevR', 'chev')}</div>
        ${next ? `<div class="row"><div class="list-item" style="padding:0;border:0"><div class="lead">${icon('calendar')}</div><div class="body"><div class="title">${esc(next.title)}</div><div class="sub">${next.daysUntil > 0 ? esc(t('home.checkup.in', { n: next.daysUntil, w: t('week.only', { w: next.from === next.to ? next.from : next.from + '–' + next.to }) })) : esc(t('home.checkup.now', { w: t('week.only', { w: next.from === next.to ? next.from : next.from + '–' + next.to }) }))}${next.scheduled ? ' · ' + esc(UI.fmtDate(next.dueDate, { month: 'short', day: 'numeric', weekday: 'short' }) + (next.scheduled.time ? ' ' + next.scheduled.time : '')) : ''}</div></div></div></div>` : `<p class="muted">${esc(t('home.checkup.none'))}</p>`}
      </section>

      <p class="disclaimer center mt-3">${country.flag} ${esc(t('t.sos.d', { c: t(country.nameKey) }))} ${country.emergency} · ${esc(t('m.disclaimer'))}</p>`;
  }

  function renderLoss(st) {
    const rid = st.settings.region;
    return `<header class="topbar"><h1>${esc(t('app.name'))}</h1></header>
      <section class="card tint stack-lg">
        <div style="display:flex;justify-content:center">${Mascot.mascot({ size: 110, mood: 'care' })}</div>
        <div><div class="eyebrow mb-1">${esc(t('m.loss.active'))}</div><h2 class="display" style="font-size:1.6rem">${esc(t('loss.t'))}</h2><p class="muted mt-1">${esc(t('loss.d'))}</p></div>
      </section>
      <section class="stack mt-3">${['r1', 'r2', 'r3', 'r4'].map(k => `<div class="card pad-sm"><div class="bold">${esc(t('loss.' + k))}</div><p class="small muted mt-1">${esc(t('loss.' + k + '.d'))}</p></div>`).join('')}
        <div class="card pad-sm"><div class="bold">${esc(t('loss.hotline'))}</div><p class="small muted mt-1">${esc(t('loss.hotline.' + rid))}</p></div>
        <a class="btn soft block" href="#/me">${esc(t('m.loss'))} · ${esc(t('m.title'))}</a>
      </section>`;
  }

  let pokeTimer = null;
  function pokeMascot(root) {
    const sec = root.querySelector('.companion'); if (!sec) return;
    const btn = sec.querySelector('.mascot-btn'), bubble = sec.querySelector('.bubble'), say = sec.querySelector('.say');
    const svg = btn.querySelector('svg');
    svg.classList.remove('poked'); void svg.getBoundingClientRect(); svg.classList.add('poked'); setTimeout(() => svg.classList.remove('poked'), 950);
    say.textContent = Mascot.poke(); bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    if (navigator.vibrate) navigator.vibrate(8);
    clearTimeout(pokeTimer);
    pokeTimer = setTimeout(() => { const m = Mascot.say(Store.state); if (say.isConnected) { say.textContent = m.text; bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop'); } }, 4000);
  }

  function addTaskSheet() {
    let repeat = 'once';
    UI.sheet({
      title: t('home.task.add'),
      body: `<div class="stack"><div class="field"><label for="task-title">${esc(t('home.task.title'))}</label><input class="input" id="task-title" maxlength="60" placeholder="${esc(t('home.task.title.ph'))}"></div>
        <div class="field"><label>${esc(t('home.task.repeat'))}</label><div class="seg block" id="task-repeat"><button class="active" data-rep="once">${esc(t('home.task.once'))}</button><button data-rep="daily">${esc(t('home.task.daily'))}</button></div></div></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" data-save id="task-save">${esc(t('c.save'))}</button>`,
      onMount(s, close) {
        s.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => { repeat = b.dataset.rep; s.querySelectorAll('[data-rep]').forEach(x => x.classList.toggle('active', x === b)); }));
        const save = () => {
          const title = s.querySelector('#task-title').value.trim();
          if (!title) { toast(t('home.task.err'), 'danger'); return; }
          Store.update(x => { x.customTasks = x.customTasks || []; x.customTasks.push({ id: 'ct-' + Store.uid(), title, repeat, date: Store.todayStr() }); });
          close(); toast(t('c.saved'), 'ok'); UI.render();
        };
        s.querySelector('[data-save]').addEventListener('click', save);
        s.querySelector('#task-title').addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
      },
    });
  }

  function mount(root) {
    root.addEventListener('click', e => {
      const task = e.target.closest('[data-task]');
      if (task) {
        const id = task.dataset.task; const today = Store.todayStr();
        Store.update(s => { s.tasks[today] = s.tasks[today] || {}; s.tasks[today][id] = !s.tasks[today][id]; });
        UI.render(); return;
      }
      const del = e.target.closest('[data-deltask]');
      if (del) { Store.update(s => { s.customTasks = (s.customTasks || []).filter(c => c.id !== del.dataset.deltask); }); UI.render(); return; }
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'add-task') { addTaskSheet(); return; }
      if (act && act.dataset.act === 'poke') { pokeMascot(root); return; }
      if (act && act.dataset.act === 'next-quote') { Store.update(s => { s.quoteOffset = (s.quoteOffset || 0) + 1; }); UI.render(); return; }
      const go = e.target.closest('[data-go]');
      if (go && !e.target.closest('a')) UI.go(go.dataset.go);
    });
    root.addEventListener('keydown', e => { const go = e.target.closest('[data-go]'); if (go && e.key === 'Enter') UI.go(go.dataset.go); });
  }

  UI.Views.home = { render, mount };
})();
