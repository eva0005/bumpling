/* Week guide + prenatal calendar + kick counter + contraction timer (PRD §6.5) */
(function () {
  'use strict';
  const { esc, icon, L, fmtWeek, stdBadge, toast } = UI;

  // ---------------- Week guide ----------------
  function renderGuide(params) {
    const st = Store.state;
    const g = Engine.gestAge(st.profile);
    const now = g ? Math.max(4, Math.min(42, g.weeks)) : 8;
    const sel = Math.max(4, Math.min(42, +(params[0] || now)));
    const wk = Content.weekInfo(sel);
    const tri = sel < 14 ? 1 : sel < 28 ? 2 : 3;
    const T = Content.TRIMESTERS[tri];
    const cal = Engine.checkupList(st).filter(c => sel >= c.from && sel <= c.to);
    const weeks = []; for (let w = 4; w <= 42; w++) weeks.push(w);
    return `${UI.topbar(t('g.title'), false, stdBadge(true))}
      <div class="week-strip" id="week-strip">${weeks.map(w => `<a class="week-pill ${w === sel ? 'active' : ''} ${w === now ? 'now' : ''}" href="#/week/${w}" id="wk-${w}"><b>${w}</b><span>${w === now ? esc(t('g.now')) : esc(t('c.week'))}</span></a>`).join('')}</div>
      <section class="card mt-2">
        <div class="eyebrow mb-1">${esc(t('g.tri.' + tri))}</div>
        <div class="baby"><div class="fruit" aria-hidden="true">${wk.emoji}</div><div><h2 class="card-title">${esc(t('g.week', { n: sel }))}</h2><div class="size">${esc(t('home.baby.like', { fruit: L(wk.fruit) }))} · ${esc(t('g.len'))} ${wk.len} cm · ${esc(t('g.wt'))} ${wk.wt} g</div></div></div>
        <h3 class="mt-3 small bold">${esc(t('g.baby'))}</h3><p class="muted small">${esc(L(wk.milestone))}</p>
        <h3 class="mt-2 small bold">${esc(t('g.mom'))}</h3><p class="muted small">${esc(L(wk.tip))}</p>
      </section>
      ${cal.length ? `<section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('g.checkups'))}</h2><a class="link" href="#/calendar" style="font-size:.875rem;font-weight:600">${esc(t('g.calendar'))} ›</a></div><div class="list">${cal.map(c => `<div class="list-item"><div class="lead">${c.done ? icon('check') : icon('calendar')}</div><div class="body"><div class="title">${esc(c.title)}</div><div class="sub">${esc(t('week.only', { w: c.from === c.to ? c.from : c.from + '–' + c.to }))}${c.note ? ' · ' + esc(c.note) : ''}</div></div></div>`).join('')}</div></section>` : ''}
      <section class="card mt-3"><h2 class="card-title mb-2">${esc(t('g.issues'))}</h2><div class="chips">${L(T.issues).map(i => `<span class="chip">${esc(i)}</span>`).join('')}</div>
        <h3 class="mt-3 small bold mb-1">${esc(t('g.actions'))}</h3><ul class="stack" style="gap:8px">${L(T.actions).map(a => `<li class="row small" style="align-items:flex-start"><span style="color:var(--ok);flex:none">${icon('check')}</span><span>${esc(a)}</span></li>`).join('')}</ul></section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('g.tools'))}</h2></div>
        <div class="grid-2">
          <a class="card flat pad-sm pressable" href="#/kicks" style="text-decoration:none;color:inherit"><div class="row"><span class="ic" style="color:var(--accent)">${icon('footprints')}</span><div><div class="bold small">${esc(t('g.kicks'))}</div><div class="xs subtle">${g && g.weeks >= 28 ? esc(t('c.start')) : esc(t('g.kicks.locked'))}</div></div></div></a>
          <a class="card flat pad-sm pressable" href="#/contractions" style="text-decoration:none;color:inherit"><div class="row"><span class="ic" style="color:var(--primary)">${icon('timer')}</span><div><div class="bold small">${esc(t('g.contractions'))}</div><div class="xs subtle">${g && g.weeks >= 36 ? esc(t('c.start')) : esc(t('g.ctr.locked'))}</div></div></div></a>
        </div>
        <a class="btn soft block mt-2" href="#/calendar">${icon('calendar')}${esc(t('g.calendar'))}</a></section>`;
  }
  function mountGuide(root) {
    const a = root.querySelector('.week-pill.active'); if (a) a.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  UI.Views.guide = { render: renderGuide, mount: mountGuide };
  UI.Views.week = { render: renderGuide, mount: mountGuide };

  // ---------------- Prenatal calendar (list + month grid + scheduling + reminders) ----------------
  let calTab = 'list';
  let calMonth = null;   // Date (first of month) shown in grid
  let calDay = null;     // 'YYYY-MM-DD' selected in grid

  function weekLabel(c) { return t('week.only', { w: c.from === c.to ? c.from : c.from + '–' + c.to }); }

  function visitItem(c) {
    const date = c.scheduled ? `${UI.fmtDate(c.dueDate, { month: 'short', day: 'numeric', weekday: 'short' })}${c.scheduled.time ? ' ' + c.scheduled.time : ''}` : (c.startDate ? `${UI.fmtDate(c.startDate)}${c.to !== c.from ? ' – ' + UI.fmtDate(c.endDate) : ''}` : '');
    const soon = !c.done && c.daysUntil != null && c.daysUntil >= 0 && c.daysUntil <= (Store.state.settings.reminderDays || 3);
    return `<div class="tl-item ${c.state || ''}"><div class="row between wrap"><span class="when">${esc(weekLabel(c))} · ${esc(date)}</span><span class="row" style="gap:6px">${c.scheduled ? `<span class="chip info xs">${esc(t('g.cal.scheduled'))}</span>` : ''}${c.custom ? `<span class="chip xs">${esc(t('g.cal.custom'))}</span>` : ''}</span></div>
      <div class="what">${esc(c.title)} ${soon ? `<span class="chip accent xs">${esc(c.daysUntil === 0 ? t('c.today') : t('g.cal.reminder', { n: c.daysUntil }))}</span>` : ''}</div>
      ${c.note ? `<div class="why">${esc(c.note)}</div>` : ''}${c.scheduled && c.scheduled.place ? `<div class="why">📍 ${esc(c.scheduled.place)}</div>` : ''}
      <div class="ops wrap" style="flex-wrap:wrap">${c.done ? `<button class="btn sm secondary" data-undone="${c.id}">${icon('check')}${esc(t('g.cal.done'))}</button>` : `<button class="btn sm soft" data-done="${c.id}">${esc(t('g.cal.mark'))}</button>`}<button class="btn sm secondary" data-schedule="${c.id}">${icon('calendar')}${esc(c.scheduled ? t('c.edit') : t('g.cal.schedule'))}</button><button class="btn sm ghost" data-upload="${c.id}">${esc(t('g.cal.upload'))}</button><button class="btn sm ghost" data-remove="${c.id}" data-custom="${c.custom}" style="color:var(--ink-3)">${esc(t('c.remove'))}</button></div></div>`;
  }

  function monthGrid(st, items) {
    const today = Store.todayStr();
    if (!calMonth) { const d = new Date(); calMonth = new Date(d.getFullYear(), d.getMonth(), 1); }
    if (!calDay) calDay = today;
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    const byDay = {};
    for (const c of items) {
      if (c.done) continue;
      if (c.scheduled) { (byDay[c.dueStr] = byDay[c.dueStr] || []).push('booked'); }
      else if (c.startDate && c.endDate) { for (let d = new Date(c.startDate); d <= c.endDate; d = Engine.addDays(d, 1)) { const k = Store.todayStr(d); (byDay[k] = byDay[k] || []).push('window'); } }
    }
    const monthName = calMonth.toLocaleDateString(I18N.lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'long' });
    const dow = [1, 2, 3, 4, 5, 6, 0].map(d => t('w.days.' + d));
    const dayItems = Engine.checkupsOnDate(st, calDay);
    return `<div class="row between mb-2"><button class="btn icon secondary sm" data-month="-1" aria-label="prev">${icon('chevL')}</button><b>${esc(monthName)}</b><div class="row" style="gap:6px"><button class="btn sm ghost" data-month="0">${esc(t('g.cal.today'))}</button><button class="btn icon secondary sm" data-month="1" aria-label="next">${icon('chevR')}</button></div></div>
      <div class="cal-grid">${dow.map(d => `<div class="cal-dow">${esc(d)}</div>`).join('')}${cells.map(d => { if (!d) return '<div></div>'; const k = Store.todayStr(d); const marks = byDay[k] || []; const booked = marks.includes('booked'); return `<button class="cal-day ${k === today ? 'today' : ''} ${k === calDay ? 'sel' : ''} ${booked ? 'booked' : marks.length ? 'window' : ''}" data-day="${k}"><span>${d.getDate()}</span>${marks.length ? '<i></i>' : ''}</button>`; }).join('')}</div>
      <div class="mt-3"><div class="eyebrow mb-1">${esc(UI.fmtDate(calDay, { month: 'long', day: 'numeric', weekday: 'long' }))}</div>
        ${dayItems.length ? `<div class="timeline">${dayItems.map(visitItem).join('')}</div>` : `<p class="small muted">${esc(t('g.cal.noday'))}</p>`}
        <button class="btn secondary sm mt-1" data-act="add-visit" data-date="${calDay}">${icon('plus')}${esc(t('g.cal.add'))}</button></div>`;
  }

  function renderCalendar() {
    const st = Store.state;
    const items = Engine.checkupList(st);
    const std = t('region.' + st.settings.region);
    const lead = st.settings.reminderDays == null ? 3 : st.settings.reminderDays;
    const notifySupported = typeof Notification !== 'undefined';
    const denied = notifySupported && Notification.permission === 'denied';
    const upcoming = Engine.upcomingReminders(st);
    return `${UI.topbar(t('g.calendar'), true, stdBadge(true))}
      <p class="small muted mb-2">${esc(t('g.calendar.lead', { std }))}</p>
      ${upcoming.length ? `<div class="alert info mb-2"><div class="ic">${icon('calendar')}</div><div class="grow"><div class="t">${esc(upcoming[0].daysUntil === 0 ? t('g.rem.banner.today', { t: upcoming[0].title }) : upcoming[0].daysUntil === 1 ? t('g.rem.banner.tomorrow', { t: upcoming[0].title }) : t('g.rem.banner.soon', { n: upcoming[0].daysUntil, t: upcoming[0].title }))}</div>${upcoming.length > 1 ? `<div class="d">+${upcoming.length - 1}</div>` : ''}</div></div>` : ''}
      <div class="seg block mb-2" role="tablist"><button role="tab" class="${calTab === 'list' ? 'active' : ''}" data-caltab="list">${esc(t('g.cal.list'))}</button><button role="tab" class="${calTab === 'month' ? 'active' : ''}" data-caltab="month">${esc(t('g.cal.month'))}</button></div>
      <section class="card">
        ${calTab === 'month' ? monthGrid(st, items) : `<div class="timeline">${items.map(visitItem).join('')}</div>
        <div class="row mt-2" style="gap:8px"><button class="btn secondary grow" data-act="add-visit">${icon('plus')}${esc(t('g.cal.add'))}</button><button class="btn ghost" data-act="restore">${icon('refresh')}${esc(t('g.cal.restore'))}</button></div>`}
      </section>
      <section class="card mt-3">
        <div class="card-head"><h2 class="card-title">${esc(t('g.rem.title'))}</h2></div>
        <div class="row between"><span class="small bold">${esc(t('g.rem.lead'))}</span><div class="seg">${[1, 3, 7].map(n => `<button class="${lead === n ? 'active' : ''}" data-lead="${n}">${esc(t('g.rem.days', { n }))}</button>`).join('')}</div></div>
        <div class="row between mt-2"><div><div class="small bold">${esc(t('g.rem.notify'))}</div><div class="xs subtle">${esc(denied ? t('g.rem.denied') : t('g.rem.notify.d'))}</div></div><button class="switch" role="switch" aria-checked="${!!st.settings.notify && notifySupported && Notification.permission === 'granted'}" data-act="toggle-notify" ${!notifySupported || denied ? 'disabled' : ''}></button></div>
        <button class="btn primary block mt-3" data-act="export-ics" id="btn-export-ics">${icon('download')}${esc(t('g.rem.ics'))}</button>
        <p class="xs subtle mt-1">${esc(t('g.rem.ics.d', { n: lead }))}</p>
      </section>`;
  }

  function addVisitSheet(dateStr) {
    const g = Engine.gestAge(Store.state.profile);
    const wk = dateStr ? Math.round(Engine.weekOfDate(Store.state.profile, dateStr)) : (g ? Math.min(42, g.weeks + 1) : 12);
    UI.sheet({
      title: t('g.cal.add'),
      body: `<div class="stack"><div class="field"><label for="cv-title">${esc(t('g.cal.title.ph'))}</label><input class="input" id="cv-title" placeholder="${esc(t('g.cal.title.ph'))}"></div>
        <div class="grid-2"><div class="field"><label for="cv-date">${esc(t('g.cal.date'))}</label><input class="input" id="cv-date" type="date" value="${esc(dateStr || '')}"></div><div class="field"><label for="cv-time">${esc(t('g.cal.time'))}</label><input class="input" id="cv-time" type="time"></div></div>
        <div class="field"><label for="cv-week">${esc(t('g.cal.week'))}</label><input class="input" id="cv-week" type="number" min="4" max="42" value="${Math.max(4, Math.min(42, wk))}"></div>
        <div class="field"><label for="cv-note">${esc(t('g.cal.note.ph'))}</label><input class="input" id="cv-note" placeholder="${esc(t('g.cal.note.ph'))}"></div></div>`,
      actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn primary" data-save>${esc(t('c.save'))}</button>`,
      onMount(s, close) {
        s.querySelector('[data-save]').addEventListener('click', () => {
          const title = s.querySelector('#cv-title').value.trim(), week = +s.querySelector('#cv-week').value, note = s.querySelector('#cv-note').value.trim();
          const date = s.querySelector('#cv-date').value, time = s.querySelector('#cv-time').value;
          if (!title || !week) return;
          const id = 'c-' + Store.uid();
          Store.update(x => { x.checkups.custom.push({ id, week, title, note }); if (date) x.checkups.scheduled[id] = { date, time, place: '' }; });
          close(); UI.render();
        });
      },
    });
  }

  function scheduleSheet(id) {
    const st = Store.state;
    const c = Engine.checkupList(st).find(x => x.id === id); if (!c) return;
    const cur = c.scheduled || {};
    const def = cur.date || (c.startDate ? Store.todayStr(c.startDate) : Store.todayStr());
    UI.sheet({
      title: `${t('g.cal.schedule')} · ${c.title}`,
      body: `<div class="stack"><div class="notice">${esc(t('g.cal.window', { w: weekLabel(c) }))}${c.startDate ? ` · ${esc(UI.fmtDate(c.startDate))} – ${esc(UI.fmtDate(c.endDate))}` : ''}</div>
        <div class="grid-2"><div class="field"><label for="sc-date">${esc(t('g.cal.date'))}</label><input class="input" id="sc-date" type="date" value="${esc(def)}"></div><div class="field"><label for="sc-time">${esc(t('g.cal.time'))}</label><input class="input" id="sc-time" type="time" value="${esc(cur.time || '')}"></div></div>
        <div class="field"><label for="sc-place">${esc(t('g.cal.place'))}</label><input class="input" id="sc-place" value="${esc(cur.place || '')}" placeholder="${esc(t('g.cal.place'))}"></div></div>`,
      actions: `${c.scheduled ? `<button class="btn ghost" data-clear>${esc(t('g.cal.clear.date'))}</button>` : `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button>`}<button class="btn primary" data-save>${esc(t('c.save'))}</button>`,
      onMount(s, close) {
        s.querySelector('[data-save]').addEventListener('click', () => {
          const date = s.querySelector('#sc-date').value; if (!date) return;
          Store.update(x => { x.checkups.scheduled[id] = { date, time: s.querySelector('#sc-time').value, place: s.querySelector('#sc-place').value.trim() }; });
          close(); toast(t('c.saved'), 'ok'); UI.render();
        });
        const clr = s.querySelector('[data-clear]'); if (clr) clr.addEventListener('click', () => { Store.update(x => { delete x.checkups.scheduled[id]; }); close(); UI.render(); });
      },
    });
  }

  async function toggleNotify() {
    const st = Store.state;
    if (typeof Notification === 'undefined') return;
    if (st.settings.notify) { Store.update(s => { s.settings.notify = false; }); UI.render(); return; }
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; } }
    if (perm === 'granted') { Store.update(s => { s.settings.notify = true; }); Reminders.check(true); }
    else toast(t('g.rem.denied'), 'danger');
    UI.render();
  }

  function mountCalendar(root) {
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.done) Store.update(s => { s.checkups.done[d.done] = Date.now(); });
      else if (d.undone) Store.update(s => { delete s.checkups.done[d.undone]; });
      else if (d.remove) Store.update(s => { if (d.custom === 'true') s.checkups.custom = s.checkups.custom.filter(c => c.id !== d.remove); else s.checkups.removed[d.remove] = true; delete s.checkups.scheduled[d.remove]; });
      else if (d.upload) { toast(t('g.cal.upload.soon')); return; }
      else if (d.schedule) { scheduleSheet(d.schedule); return; }
      else if (d.caltab) calTab = d.caltab;
      else if (d.month !== undefined) { if (d.month === '0') { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); calDay = Store.todayStr(); } else calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + (+d.month), 1); }
      else if (d.day) calDay = d.day;
      else if (d.lead) Store.update(s => { s.settings.reminderDays = +d.lead; });
      else if (d.act === 'toggle-notify') { toggleNotify(); return; }
      else if (d.act === 'export-ics') { UI.download(`pregjourney-prenatal-${Store.todayStr()}.ics`, Engine.checkupsICS(Store.state), 'text/calendar'); return; }
      else if (d.act === 'add-visit') { addVisitSheet(d.date); return; }
      else if (d.act === 'restore') Store.update(s => { s.checkups.removed = {}; });
      else return;
      UI.render();
    });
  }
  UI.Views.calendar = { render: renderCalendar, mount: mountCalendar, setTab(tab) { calTab = tab; } };

  // ---------------- Reminders (in-app + browser notifications) ----------------
  const Reminders = {
    check(force) {
      const st = Store.state;
      if (st.settings.lossMode || !st.settings.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const today = Store.todayStr();
      for (const it of Engine.upcomingReminders(st)) {
        const key = `${it.id}|${today}`;
        if (st.notified[key] && !force) continue;
        try {
          const body = t('g.rem.notif.body', { t: it.title, d: it.daysUntil === 0 ? t('c.today') : UI.fmtDate(it.dueDate, { month: 'short', day: 'numeric', weekday: 'short' }) + (it.scheduled && it.scheduled.time ? ' ' + it.scheduled.time : '') });
          const n = new Notification(t('home.checkup.next'), { body, tag: key, icon: undefined });
          n.onclick = () => { try { window.focus(); } catch (e) { /* ignore */ } UI.go('#/calendar'); };
        } catch (e) { /* notifications unsupported in this context */ }
        Store.update(s => { s.notified[key] = Date.now(); });
      }
    },
  };
  window.Reminders = Reminders;

  // ---------------- Kick counter ----------------
  function renderKicks() {
    const st = Store.state;
    const g = Engine.gestAge(st.profile);
    const active = st.kicks.find(k => !k.end);
    const history = st.kicks.filter(k => k.end).sort((a, b) => b.start - a.start).slice(0, 10);
    const locked = g && g.weeks < 28;
    return `${UI.topbar(t('k.title'))}
      ${locked ? `<div class="notice mb-2">${esc(t('g.kicks.locked'))}</div>` : ''}
      <section class="card center">
        ${active ? `<div class="subtle small">${esc(t('k.elapsed'))} <span class="mono" id="kick-elapsed">${UI.fmtDuration(Date.now() - active.start)}</span></div>
          <button class="big-tap" data-act="kick" id="btn-kick" aria-label="${esc(t('k.tap'))}"><b>${active.count}</b><span>${esc(t('k.tap'))}</span></button>
          ${active.count >= 10 ? `<div class="notice primary mb-2">${esc(t('k.reached', { m: Math.round((Date.now() - active.start) / 60000) }))}</div>` : ''}
          <div class="row" style="gap:10px"><button class="btn secondary grow" data-act="discard">${esc(t('k.discard'))}</button><button class="btn primary grow" data-act="finish" id="btn-kick-finish">${esc(t('k.finish'))}</button></div>`
        : `<button class="big-tap teal" data-act="start" id="btn-kick-start"><span style="font-size:2.4rem">👣</span><span>${esc(t('k.start'))}</span></button>`}
        <p class="small muted mt-2" style="text-align:left">${esc(t('k.how'))}</p>
      </section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('k.history'))}</h2></div>
        ${history.length ? `<div class="list">${history.map(k => { const m = Math.round((k.end - k.start) / 60000); const low = k.count < 10 && m >= 119; return `<div class="list-item"><div class="lead" style="${low ? 'background:var(--danger-soft);color:var(--danger)' : 'background:var(--ok-soft);color:var(--ok)'}">${icon(low ? 'alert' : 'check')}</div><div class="body"><div class="title">${esc(t('k.session', { n: k.count, m }))}</div><div class="sub">${esc(UI.fmtDate(k.start))} ${esc(UI.fmtTime(k.start))}</div></div></div>`; }).join('')}</div>` : `<p class="small muted">${esc(t('k.empty'))}</p>`}
      </section>`;
  }
  function mountKicks(root) {
    UI.timer(() => { const a = Store.state.kicks.find(k => !k.end); const el = root.querySelector('#kick-elapsed'); if (a && el) el.textContent = UI.fmtDuration(Date.now() - a.start); }, 1000);
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'start') Store.update(s => { s.kicks.push({ start: Date.now(), end: null, count: 0 }); });
      else if (act === 'kick') { Store.update(s => { const a = s.kicks.find(k => !k.end); if (a) a.count++; }); if (navigator.vibrate) navigator.vibrate(10); }
      else if (act === 'discard') Store.update(s => { s.kicks = s.kicks.filter(k => k.end); });
      else if (act === 'finish') {
        let low = false;
        Store.update(s => { const a = s.kicks.find(k => !k.end); if (a) { a.end = Date.now(); low = a.count < 10 && (a.end - a.start) >= 2 * 3600000 - 60000; } });
        if (low) UI.sheet({ title: t('k.low.t'), body: `<div class="alert urgent"><div class="ic">${icon('alert')}</div><div><div class="t">${esc(t('k.low.t'))}</div><div class="d">${esc(t('k.low.d'))}</div></div></div>`, actions: `<button class="btn secondary" data-close>${esc(t('c.close'))}</button><a class="btn danger" href="#/tools/sos" data-close>${esc(t('al.act.call'))}</a>` });
        else toast(t('k.good'), 'ok');
      }
      else return;
      UI.render();
    });
  }
  UI.Views.kicks = { render: renderKicks, mount: mountKicks };

  // ---------------- Contraction timer ----------------
  function renderContractions() {
    const st = Store.state;
    const g = Engine.gestAge(st.profile);
    const active = st.contractions.find(c => !c.end);
    const stats = Engine.contractionStats(st);
    const list = st.contractions.filter(c => c.end).sort((a, b) => b.start - a.start).slice(0, 15);
    const locked = g && g.weeks < 36;
    return `${UI.topbar(t('ct.title'))}
      ${locked ? `<div class="notice mb-2">${esc(t('g.ctr.locked'))}</div>` : ''}
      ${stats.regular ? `<div class="alert urgent mb-2"><div class="ic">${icon('alert')}</div><div class="grow"><div class="t">${esc(t('ct.regular.t'))}</div><div class="d">${esc(t('ct.regular.d', { i: stats.avgInt.toFixed(1), d: Math.round(stats.avgDur) }))}</div><div class="actions"><a class="btn sm danger" href="#/tools/sos">${esc(t('al.act.call'))}</a></div></div></div>` : ''}
      <section class="card center">
        <button class="big-tap ${active ? '' : 'teal'}" data-act="${active ? 'stop' : 'start'}" id="btn-ctr"><b class="mono" id="ctr-elapsed" style="font-size:2.4rem">${active ? UI.fmtDuration(Date.now() - active.start) : '●'}</b><span>${esc(active ? t('ct.stop') : t('ct.start'))}</span></button>
        <div class="stats-row" style="text-align:left"><div class="stat"><div class="v" style="font-size:1.3rem">${stats.count}</div><div class="l">${esc(t('ct.count'))} · ${esc(t('ct.lasthour'))}</div></div><div class="stat"><div class="v" style="font-size:1.3rem">${stats.count ? Math.round(stats.avgDur) + 's' : '—'}</div><div class="l">${esc(t('ct.avgdur'))}</div></div><div class="stat"><div class="v" style="font-size:1.3rem">${stats.count > 1 ? stats.avgInt.toFixed(1) + 'm' : '—'}</div><div class="l">${esc(t('ct.avgint'))}</div></div></div>
        <p class="small muted mt-2" style="text-align:left">${esc(t('ct.how'))}</p>
      </section>
      <section class="card mt-3"><div class="card-head"><h2 class="card-title">${esc(t('ct.history'))}</h2>${list.length ? `<button class="btn sm ghost" data-act="clear">${esc(t('ct.clear'))}</button>` : ''}</div>
        ${list.length ? `<div class="list">${list.map((c, i) => { const prev = list[i + 1]; const interval = prev ? ((c.start - prev.start) / 60000).toFixed(1) : null; return `<div class="list-item"><div class="body"><div class="title">${esc(UI.fmtTime(c.start))}</div><div class="sub">${esc(t('ct.duration'))} ${Math.round((c.end - c.start) / 1000)}s${interval ? ` · ${esc(t('ct.interval'))} ${interval} ${esc(t('c.min'))}` : ''}</div></div></div>`; }).join('')}</div>` : `<p class="small muted">${esc(t('ct.empty'))}</p>`}
      </section>`;
  }
  function mountContractions(root) {
    UI.timer(() => { const a = Store.state.contractions.find(c => !c.end); const el = root.querySelector('#ctr-elapsed'); if (a && el) el.textContent = UI.fmtDuration(Date.now() - a.start); }, 1000);
    root.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'start') Store.update(s => { s.contractions.push({ start: Date.now(), end: null }); });
      else if (act === 'stop') Store.update(s => { const a = s.contractions.find(c => !c.end); if (a) a.end = Date.now(); });
      else if (act === 'clear') { if (!(await UI.confirm(t('ct.clear') + '?', { danger: true }))) return; Store.update(s => { s.contractions = []; }); }
      else return;
      UI.render();
    });
  }
  UI.Views.contractions = { render: renderContractions, mount: mountContractions };
})();
