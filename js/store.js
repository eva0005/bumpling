/* ==========================================================================
   Store — local-first persistence (PRD §7.3: local-only mode by default).
   Everything lives in localStorage under one key; export/import/delete are
   first-class. Internal units are always metric (kg / cm / mmol/L / kcal).
   ========================================================================== */
(function (global) {
  'use strict';
  const KEY = 'pregjourney.v1';

  const defaults = () => ({
    version: 1,
    onboarded: false,
    privacyAccepted: false,
    settings: {
      lang: I18N.detect(),
      country: 'US',
      region: 'US',
      units: { weight: 'kg', height: 'cm', glucose: 'mmol', energy: 'kcal' },
      hideWeightNumbers: false,
      localOnly: true,
      analytics: false,
      textScale: 'normal',
      weighDay: 1,
      gdmMode: false,
      hospitalPhone: '',
      lossMode: false,
      reminderDays: 3,
      notify: false,
      // 小芽 AI (v1.2) — provider credentials live only on this device and are stripped from exports.
      ai: { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', baseUrl: '', consent: false, shareContext: true, demo: false },
    },
    profile: {
      lmp: null, edd: null, heightCm: null, preWeightKg: null, age: null, multiple: false,
      conditions: [], orders: [],
    },
    weights: [],      // {date:'YYYY-MM-DD', kg}
    meals: [],        // {date, meal:'breakfast'|..., foodId, grams, ts} — or AI/custom entries: {date, meal, name, grams, n:{kcal,protein,carb,fat,fibre,...}, src:'photo'|'import', ts}
    workouts: [],     // {date, type, minutes, ts, src?}
    aiChats: [],      // 小芽 AI conversation: {id, role:'user'|'ai', ts, text, thumbs?:[dataURL], hadPhoto?, data?:{verdict,title,tips,sources,seekCare}, demo?, error?}
    imports: [],      // fingerprints of images already imported: {hash, ts}
    bp: [],           // {ts, sys, dia}
    glucose: [],      // {ts, type:'fasting'|'pp1'|'pp2', mmol}
    symptoms: [],     // {ts, tags:[], note}
    kicks: [],        // {start, end, count}
    contractions: [], // {start, end}
    checkups: { done: {}, removed: {}, custom: [], scheduled: {} }, // custom: {id, week, title, note}; scheduled: {id: {date, time, place}}
    notified: {},     // {'<id>|<date>': ts} reminders already shown
    tasks: {},        // {'YYYY-MM-DD': {taskId: true}}
    customTasks: [],  // {id, title, repeat:'daily'|'once', date}
    quoteOffset: 0,   // user-requested shuffle of the daily quote
    exerciseScreen: null, // {ts, flags:[]}
    family: { code: null, perms: { week: true, checkup: true, alerts: true, weight: false } },
    weeklyGoalStreak: 0,
  });

  let state = null;
  const listeners = new Set();

  function deepMerge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') {
      const out = Object.assign({}, base);
      if (over && typeof over === 'object') {
        for (const k of Object.keys(over)) out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
      }
      return out;
    }
    return over === undefined ? base : over;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? deepMerge(defaults(), JSON.parse(raw)) : defaults();
    } catch (e) {
      console.warn('Store: failed to load, starting fresh', e);
      state = defaults();
    }
    return state;
  }
  let saveFailed = false;
  function save() {
    let ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      ok = false; console.warn('Store: save failed', e);
      // Quota exceeded: drop AI chat thumbnails (the only bulky payload), then retry once.
      try {
        let freed = false;
        for (const m of (state.aiChats || [])) if (m.thumbs && m.thumbs.length) { m.thumbs = []; m.hadPhoto = true; freed = true; }
        if (freed) { localStorage.setItem(KEY, JSON.stringify(state)); ok = true; }
      } catch (e2) { /* still failing */ }
    }
    if (!ok && !saveFailed && global.UI && global.UI.toast) { try { global.UI.toast(global.t('store.full'), 'danger'); } catch (e) { /* ignore */ } }
    saveFailed = !ok;
    listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
    return ok;
  }
  // Rough size of the persisted blob (bytes), for the settings screen.
  function usage() { const raw = localStorage.getItem(KEY) || ''; try { const b = new Blob([raw]); if (typeof b.size === 'number') return b.size; } catch (e) { /* fall through */ } return raw.length; }
  function update(fn) { fn(state); save(); return state; }

  const todayStr = (d = new Date()) => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  global.Store = {
    load, save, update, usage,
    get saveFailed() { return saveFailed; },
    get state() { return state || load(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    todayStr,
    exportJSON() {
      // Never export AI credentials — they belong to this device only.
      const copy = JSON.parse(JSON.stringify(state));
      if (copy.settings && copy.settings.ai) copy.settings.ai.apiKey = '';
      return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString(), app: 'Bumpling' }, copy), null, 2);
    },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.settings || !data.profile) throw new Error('invalid');
      const keepKey = state && state.settings && state.settings.ai ? state.settings.ai.apiKey : '';
      state = deepMerge(defaults(), data);
      if (keepKey && !state.settings.ai.apiKey) state.settings.ai.apiKey = keepKey; // exports never carry the key
      save();
    },
    wipe() {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      state = defaults();
      save();
    },
    uid() { return Math.random().toString(36).slice(2, 10); },
  };
})(window);
