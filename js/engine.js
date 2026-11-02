/* ==========================================================================
   Engine — gestational age, BMI, GWG band, nutrition targets, alerts.
   Pure functions over Store.state + Standards. No DOM here.
   ========================================================================== */
(function (global) {
  'use strict';
  const DAY = 86400000;
  const T = Standards.THRESHOLDS;

  const parseDate = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = d => Store.todayStr(d);
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const diffDays = (a, b) => Math.floor((a.setHours ? a : new Date(a)).setHours(0, 0, 0, 0) / DAY) - Math.floor(new Date(b).setHours(0, 0, 0, 0) / DAY);

  function lmpDate(profile) {
    if (profile.lmp) return parseDate(profile.lmp);
    if (profile.edd) return addDays(parseDate(profile.edd), -280);
    return null;
  }
  function eddDate(profile) {
    if (profile.edd) return parseDate(profile.edd);
    if (profile.lmp) return addDays(parseDate(profile.lmp), 280);
    return null;
  }
  // Gestational age on a given date
  function gestAge(profile, date = new Date()) {
    const lmp = lmpDate(profile);
    if (!lmp) return null;
    const days = diffDays(new Date(date), lmp);
    const weeks = Math.floor(days / 7);
    const rem = days - weeks * 7;
    const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
    return { days, weeks, rem, trimester, edd: eddDate(profile), daysLeft: 280 - days };
  }
  function weekOfDate(profile, dateStr) { const g = gestAge(profile, parseDate(dateStr)); return g ? g.days / 7 : null; }

  const bmi = (hCm, wKg) => (hCm && wKg) ? wKg / Math.pow(hCm / 100, 2) : null;

  // Recommended cumulative gain band at (fractional) week w.
  // Linear 0→T1 range over weeks 0–13, then linear T1→total over 13–40.
  function gainBand(settings, profile, w) {
    const b = bmi(profile.heightCm, profile.preWeightKg);
    if (!b) return null;
    const cat = Standards.bmiCategory(b, settings.region);
    const tbl = Standards.gwgTable(settings.region, cat, profile.multiple);
    if (!tbl) return { cat, none: true };
    const wk = Math.max(0, Math.min(42, w));
    const lerp = (a, b2, t) => a + (b2 - a) * t;
    let low, high;
    if (wk <= 13) { low = lerp(0, tbl.t1[0], wk / 13); high = lerp(0, tbl.t1[1], wk / 13); }
    else { const t = Math.min(1, (wk - 13) / 27); low = lerp(tbl.t1[0], tbl.total[0], t); high = lerp(tbl.t1[1], tbl.total[1], t); }
    return { cat, low, high, total: tbl.total, rate: tbl.rate, t1: tbl.t1 };
  }

  function sortedWeights(state) { return state.weights.slice().sort((a, b) => a.date < b.date ? -1 : 1); }
  function latestWeight(state) { const ws = sortedWeights(state); return ws.length ? ws[ws.length - 1] : null; }

  function gainStatus(state, date = new Date()) {
    const { settings, profile } = state;
    const ws = sortedWeights(state);
    const g = gestAge(profile, date);
    if (!ws.length || !g || !profile.preWeightKg) return { status: 'na' };
    const last = ws[ws.length - 1];
    const w = weekOfDate(profile, last.date);
    const band = gainBand(settings, profile, w);
    const gain = last.kg - profile.preWeightKg;
    if (!band || band.none) return { status: 'na', gain, band };
    const status = gain > band.high + 0.001 ? 'high' : gain < band.low - 0.001 ? 'low' : 'in';
    return { status, gain, band, last, week: w };
  }

  // Weight change over the last 7 days (kg), using nearest entries
  function weeklyRate(state) {
    const ws = sortedWeights(state);
    if (ws.length < 2) return null;
    const last = ws[ws.length - 1];
    const target = addDays(parseDate(last.date), -7);
    let best = null, bestDiff = Infinity;
    for (const e of ws.slice(0, -1)) {
      const d = Math.abs(diffDays(parseDate(e.date), target));
      if (d < bestDiff) { bestDiff = d; best = e; }
    }
    if (!best || bestDiff > 4) return null;
    const span = diffDays(parseDate(last.date), parseDate(best.date));
    if (span <= 0) return null;
    return { delta: (last.kg - best.kg) * 7 / span, from: best, to: last };
  }

  // Out of band for N consecutive weekly checkpoints (PRD 6.2 deviation alert)
  function deviation(state) {
    const { settings, profile } = state;
    const ws = sortedWeights(state);
    if (ws.length < 2 || !profile.preWeightKg) return null;
    const perWeek = new Map();
    for (const e of ws) {
      const w = Math.floor(weekOfDate(profile, e.date));
      perWeek.set(w, e); // last entry of each week wins
    }
    const weeks = Array.from(perWeek.keys()).sort((a, b) => a - b);
    if (weeks.length < T.deviationWeeks) return null;
    const lastWeeks = weeks.slice(-T.deviationWeeks);
    if (lastWeeks[lastWeeks.length - 1] - lastWeeks[0] !== T.deviationWeeks - 1) return null; // must be consecutive
    const dirs = lastWeeks.map(w => {
      const e = perWeek.get(w);
      const band = gainBand(settings, profile, weekOfDate(profile, e.date));
      if (!band || band.none) return 'na';
      const gain = e.kg - profile.preWeightKg;
      return gain > band.high ? 'high' : gain < band.low ? 'low' : 'in';
    });
    if (dirs.every(d => d === 'high')) return 'high';
    if (dirs.every(d => d === 'low')) return 'low';
    return null;
  }

  // --- Nutrition -------------------------------------------------------------
  // Mifflin-St Jeor × 1.4 (light activity) as base; trimester increment from region pack
  function energyTarget(state, date = new Date()) {
    const { settings, profile } = state;
    const g = gestAge(profile, date);
    const r = Standards.region(settings.region);
    const wKg = profile.preWeightKg || 58, hCm = profile.heightCm || 162, age = profile.age || 30;
    const bmr = 10 * wKg + 6.25 * hCm - 5 * age - 161;
    const base = Math.round(bmr * 1.4 / 10) * 10;
    const tri = g ? g.trimester : 1;
    let extra = r.nutrition.energyExtra[tri - 1];
    if (profile.multiple && tri > 1) extra += 150;
    return { base, extra, total: base + extra, trimester: tri };
  }
  function nutrientTargets(state, date = new Date()) {
    const { settings } = state;
    const g = gestAge(state.profile, date);
    const n = Standards.region(settings.region).nutrition;
    const i = (g ? g.trimester : 1) - 1;
    const e = energyTarget(state, date);
    return {
      kcal: e.total, protein: n.protein[i], carb: Math.round(e.total * 0.5 / 4), fat: Math.round(e.total * 0.3 / 9),
      folate: n.folate[i], iron: n.iron[i], calcium: n.calcium[i], iodine: n.iodine[i], dha: n.dha[i], caffeineMax: n.caffeineMax,
      sourceKey: n.sourceKey,
    };
  }
  function dayIntake(state, dateStr) {
    const sum = { kcal: 0, protein: 0, carb: 0, fat: 0, folate: 0, iron: 0, calcium: 0, iodine: 0, dha: 0, caffeine: 0 };
    for (const m of state.meals) {
      if (m.date !== dateStr) continue;
      const food = Content.FOODS.find(f => f.id === m.foodId);
      if (!food) continue;
      const n = Content.foodNutrients(food, m.grams);
      for (const k in sum) sum[k] += n[k] || 0;
    }
    return sum;
  }

  // --- Exercise ---------------------------------------------------------------
  function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = (x.getDay() + 6) % 7; return addDays(x, -day); }
  function weekMinutes(state, d = new Date()) {
    const start = fmtDate(weekStart(d)), end = fmtDate(addDays(weekStart(d), 6));
    return state.workouts.filter(w => w.date >= start && w.date <= end).reduce((s, w) => s + w.minutes, 0);
  }
  function exerciseLocked(state) {
    const p = state.profile;
    if ((p.orders || []).includes('bedrest') || (p.orders || []).includes('noexercise')) return 'orders';
    const s = state.exerciseScreen;
    if (!s) return 'unscreened';
    if (s.flags && s.flags.length) return 'flags';
    return null;
  }

  // --- Prenatal calendar ------------------------------------------------------
  function checkupList(state) {
    const { settings, profile, checkups } = state;
    const r = Standards.region(settings.region);
    const g = gestAge(profile);
    const items = [];
    for (const c of r.calendar) {
      if (checkups.removed[c.id]) continue;
      items.push({ id: c.id, from: c.from, to: c.to, title: t(c.title), note: c.note ? t(c.note) : '', custom: false });
    }
    for (const c of checkups.custom) items.push({ id: c.id, from: c.week, to: c.week, title: c.title, note: c.note || '', custom: true });
    const lmp = lmpDate(profile);
    const today = Store.todayStr();
    for (const it of items) {
      it.done = !!checkups.done[it.id];
      it.startDate = lmp ? addDays(lmp, it.from * 7) : null;
      it.endDate = lmp ? addDays(lmp, it.to * 7 + 6) : null;
      const sch = (checkups.scheduled || {})[it.id];
      it.scheduled = sch || null;
      it.dueDate = sch ? parseDate(sch.date) : it.startDate;      // concrete appointment wins
      it.dueStr = it.dueDate ? fmtDate(it.dueDate) : null;
      it.daysUntil = it.dueDate ? diffDays(it.dueDate, new Date()) : null;
      if (it.done) it.state = 'done';
      else if (sch) it.state = sch.date < today ? 'past' : (sch.date === today ? 'current' : 'upcoming');
      else if (g) it.state = g.weeks > it.to ? 'past' : (g.weeks >= it.from ? 'current' : 'upcoming');
    }
    items.sort((a, b) => (a.dueDate && b.dueDate ? a.dueDate - b.dueDate : a.from - b.from) || a.from - b.from || a.to - b.to);
    return items;
  }
  function nextCheckup(state) {
    const list = checkupList(state).filter(i => !i.done && i.state !== 'past');
    return list.length ? list[0] : null;
  }
  // Visits due within the reminder window (today … +reminderDays), not done
  function upcomingReminders(state) {
    const lead = state.settings.reminderDays == null ? 3 : state.settings.reminderDays;
    return checkupList(state).filter(i => !i.done && i.daysUntil != null && i.daysUntil >= 0 && i.daysUntil <= lead);
  }
  function checkupsOnDate(state, dateStr) {
    return checkupList(state).filter(i => i.dueStr === dateStr || (!i.scheduled && i.startDate && i.endDate && dateStr >= fmtDate(i.startDate) && dateStr <= fmtDate(i.endDate)));
  }
  // iCalendar export with VALARM so phone/desktop calendars fire the reminders (no backend needed)
  function checkupsICS(state) {
    const lead = state.settings.reminderDays == null ? 3 : state.settings.reminderDays;
    const esc = v => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const ymd = d => fmtDate(d).replace(/-/g, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bumpling//Prenatal Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(t('g.calendar'))];
    for (const it of checkupList(state)) {
      if (it.done || !it.dueDate) continue;
      lines.push('BEGIN:VEVENT', 'UID:' + it.id + '@pregjourney', 'DTSTAMP:' + stamp);
      if (it.scheduled && it.scheduled.time) {
        const [hh, mm] = it.scheduled.time.split(':');
        const start = new Date(it.dueDate); start.setHours(+hh, +mm, 0, 0);
        const end = new Date(start.getTime() + 60 * 60000);
        const f = d => ymd(d) + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
        lines.push('DTSTART:' + f(start), 'DTEND:' + f(end));
      } else {
        lines.push('DTSTART;VALUE=DATE:' + ymd(it.dueDate), 'DTEND;VALUE=DATE:' + ymd(addDays(it.dueDate, 1)));
      }
      const week = it.from === it.to ? it.from : it.from + '–' + it.to;
      lines.push('SUMMARY:' + esc(t('app.name') + ' · ' + it.title), 'DESCRIPTION:' + esc((it.note ? it.note + '\n' : '') + t('week.only', { w: week })));
      if (it.scheduled && it.scheduled.place) lines.push('LOCATION:' + esc(it.scheduled.place));
      lines.push('BEGIN:VALARM', 'TRIGGER:-P' + lead + 'D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(it.title), 'END:VALARM');
      lines.push('BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(it.title), 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  // --- Alerts (PRD §6.6) --------------------------------------------------------
  function alerts(state) {
    const out = [];
    if (state.settings.lossMode) return out;
    const now = Date.now();
    const within = (ts, h) => now - ts < h * 3600000;

    // Symptoms: bleeding / fluid in last 24h
    const sym = state.symptoms.filter(s => within(s.ts, 24) && (s.tags.includes('bleeding') || s.tags.includes('fluid')));
    if (sym.length) out.push({ id: 'sym', level: 'urgent', t: 'al.sym.t', d: 'al.sym.d', actions: ['call'] });

    // Kicks: last session in 24h with <10 in 2h
    const k = state.kicks.slice().sort((a, b) => b.start - a.start)[0];
    if (k && k.end && within(k.end, 24) && k.count < T.kicksMinPer2h && (k.end - k.start) >= 2 * 3600000 - 60000) {
      out.push({ id: 'kicks', level: 'urgent', t: 'al.kicks.t', d: 'al.kicks.d', actions: ['call'] });
    }
    // BP: last reading in 48h ≥ 140/90
    const bp = state.bp.slice().sort((a, b) => b.ts - a.ts)[0];
    if (bp && within(bp.ts, 48) && (bp.sys >= T.bp.sys || bp.dia >= T.bp.dia)) {
      out.push({ id: 'bp', level: 'urgent', t: 'al.bp.t', d: 'al.bp.d', actions: ['call'] });
    }
    // Weight surge > 1 kg/week
    const rate = weeklyRate(state);
    const edemaRecent = state.symptoms.some(s => within(s.ts, 72) && s.tags.includes('edema'));
    if (rate && rate.delta > T.weeklyGainSurge && within(parseDate(rate.to.date).getTime(), 24 * 10)) {
      out.push({ id: 'surge', level: edemaRecent ? 'urgent' : 'watch', t: 'al.surge.t', d: 'al.surge.d', actions: ['bp'] });
    }
    // Deviation 2 consecutive weeks
    const dev = deviation(state);
    if (dev === 'high') out.push({ id: 'devhigh', level: 'watch', t: 'al.dev.high.t', d: 'al.dev.high.d', actions: ['diet', 'weight'] });
    if (dev === 'low') out.push({ id: 'devlow', level: 'watch', t: 'al.dev.low.t', d: 'al.dev.low.d', actions: ['diet', 'weight'] });
    // Post-meal glucose: 2 of last 3 PP readings above target
    const pp = state.glucose.filter(g => g.type !== 'fasting').sort((a, b) => b.ts - a.ts).slice(0, 3);
    if (pp.length >= 2) {
      const high = pp.filter(g => g.mmol >= (g.type === 'pp1' ? T.glucose.pp1h : T.glucose.pp2h)).length;
      if (high >= 2 && !state.settings.gdmMode) out.push({ id: 'glu', level: 'watch', t: 'al.glu.t', d: 'al.glu.d', actions: ['gdm'] });
    }
    // Caffeine today
    const intake = dayIntake(state, Store.todayStr());
    if (intake.caffeine > nutrientTargets(state).caffeineMax) out.push({ id: 'caff', level: 'watch', t: 'al.caff.t', d: 'al.caff.d', actions: [] });
    return out;
  }

  // --- Contractions: 5-1-1 detection ---------------------------------------------
  function contractionStats(state) {
    const list = state.contractions.filter(c => c.end).sort((a, b) => a.start - b.start);
    const hourAgo = Date.now() - 3600000;
    const recent = list.filter(c => c.start >= hourAgo);
    if (!recent.length) return { count: 0, recent };
    const durations = recent.map(c => (c.end - c.start) / 1000);
    const intervals = [];
    for (let i = 1; i < recent.length; i++) intervals.push((recent[i].start - recent[i - 1].start) / 60000);
    const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    const avgDur = avg(durations), avgInt = avg(intervals);
    const regular = recent.length >= 6 && avgInt > 0 && avgInt <= 6 && avgDur >= 45;
    return { count: recent.length, avgDur, avgInt, regular, recent };
  }

  // --- Weekly report summary -----------------------------------------------------
  function report(state) {
    const g = gestAge(state.profile);
    const gs = gainStatus(state);
    const days = []; for (let i = 0; i < 7; i++) days.push(fmtDate(addDays(new Date(), -i)));
    const intakes = days.map(d => dayIntake(state, d)).filter(x => x.kcal > 0);
    const avg = {}; const targets = nutrientTargets(state);
    for (const k of Object.keys(targets)) if (typeof targets[k] === 'number' && k !== 'caffeineMax') avg[k] = intakes.length ? intakes.reduce((s, x) => s + (x[k] || 0), 0) / intakes.length : 0;
    return { g, gs, avg, targets, intakeDays: intakes.length, exerciseMin: weekMinutes(state), alerts: alerts(state),
      bp: state.bp.slice().sort((a, b) => b.ts - a.ts)[0], glucose: state.glucose.slice().sort((a, b) => b.ts - a.ts).slice(0, 3) };
  }

  global.Engine = {
    DAY, parseDate, fmtDate, addDays, diffDays, lmpDate, eddDate, gestAge, weekOfDate, bmi, gainBand,
    sortedWeights, latestWeight, gainStatus, weeklyRate, deviation,
    energyTarget, nutrientTargets, dayIntake, weekStart, weekMinutes, exerciseLocked,
    checkupList, nextCheckup, upcomingReminders, checkupsOnDate, checkupsICS, alerts, contractionStats, report,
  };
})(window);
