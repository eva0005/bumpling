/* ==========================================================================
   UI toolkit — tiny helpers, icons, formatters, sheets, toasts, router.
   ========================================================================== */
(function (global) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = obj => (obj && typeof obj === 'object' && ('zh' in obj || 'en' in obj)) ? (obj[I18N.lang] || obj.en || obj.zh) : obj; // pick bilingual field

  // --- Icons (stroke, 24 viewBox) ---------------------------------------------
  const P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    scale: '<path d="M12 3v3"/><path d="M5 6h14l1 15H4z"/><path d="M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
    food: '<path d="M4 3v8a3 3 0 0 0 3 3v7"/><path d="M10 3v8a3 3 0 0 1-3 3"/><path d="M7 3v5"/><path d="M19 3c-2 0-4 3-4 7v3h4v8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    heart: '<path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z"/>',
    baby: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15c1.5 1.3 4.5 1.3 6 0"/><path d="M12 3c-1 1-1 2.5 0 3.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/>',
    drop: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>',
    pulse: '<path d="M3 12h3l2-5 4 10 3-7 1.5 2H21"/>',
    moon: '<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 6 5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    footprints: '<path d="M7 3c-2 0-3 2-3 4.5S5 12 7 12s3-2 3-4.5S9 3 7 3zM6 13h2v3a1 1 0 0 1-2 0zM17 9c-2 0-3 2-3 4.5s1 4.5 3 4.5 3-2 3-4.5S19 9 17 9zM16 19h2v2a1 1 0 0 1-2 0z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6M12 2v3"/>',
    print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
    text: '<path d="M4 6h16M12 6v14M8 20h8"/>',
    leaf: '<path d="M4 20C6 10 12 5 20 4c-1 8-6 14-16 16z"/><path d="M4 20c4-6 8-9 12-11"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13 7 4 4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4"/><path d="M20 4v7h-7M4 20v-7h7"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
    send: '<path d="M4 12 20 4l-4 16-4-7z"/><path d="M12 13 20 4"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 3 3 3-4 5 6"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6.3A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6A16 16 0 0 0 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    wand: '<path d="m4 20 11-11M13 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const icon = (name, cls = '') => `<svg class="ic-svg ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  // --- Formatters -------------------------------------------------------------
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function fmtWeek(g, opts = {}) {
    if (!g) return '—';
    const w = Math.max(0, g.weeks), d = Math.max(0, g.rem);
    if (I18N.lang === 'zh') return opts.html ? `${w}<sup>+${d}</sup> 周` : `${w}⁺${SUP[d]} 周`;
    return opts.html ? `${w}w <small>${d}d</small>` : `${w}w ${d}d`;
  }
  const settings = () => Store.state.settings;
  const r1 = n => Math.round(n * 10) / 10;
  const r0 = n => Math.round(n);

  const U = Standards.Units;
  function fmtWeight(kg, withUnit = true, digits = 1) {
    if (kg == null || isNaN(kg)) return '—';
    const u = settings().units.weight;
    const v = u === 'lb' ? U.kgToLb(kg) : kg;
    const s = v.toFixed(digits);
    return withUnit ? `${s} ${t('units.' + u)}` : s;
  }
  function fmtDelta(kg, withUnit = true) {
    if (kg == null || isNaN(kg)) return '—';
    const sign = kg > 0 ? '+' : '';
    return sign + fmtWeight(kg, withUnit);
  }
  function weightToKg(v) { return settings().units.weight === 'lb' ? U.lbToKg(v) : v; }
  function fmtHeight(cm) {
    if (!cm) return '—';
    if (settings().units.height === 'ftin') { const f = U.cmToFtIn(cm); return `${f.ft}′ ${Math.round(f.in)}″`; }
    return `${Math.round(cm)} cm`;
  }
  function fmtGlucose(mmol, withUnit = true) {
    const u = settings().units.glucose;
    const v = u === 'mgdl' ? U.mmolToMgdl(mmol).toFixed(0) : mmol.toFixed(1);
    return withUnit ? `${v} ${t('units.' + u)}` : v;
  }
  function glucoseToMmol(v) { return settings().units.glucose === 'mgdl' ? U.mgdlToMmol(v) : v; }
  function fmtEnergy(kcal, withUnit = true) {
    const u = settings().units.energy;
    const v = u === 'kJ' ? Math.round(U.kcalToKj(kcal)) : Math.round(kcal);
    return withUnit ? `${v} ${t('units.' + u)}` : String(v);
  }
  function fmtDate(d, opts) {
    if (!d) return '—';
    const date = typeof d === 'string' ? Engine.parseDate(d) : new Date(d);
    const loc = I18N.lang === 'zh' ? 'zh-CN' : (settings().country === 'US' ? 'en-US' : 'en-GB');
    return date.toLocaleDateString(loc, opts || { month: 'short', day: 'numeric' });
  }
  function fmtDateLong(d) { return fmtDate(d, { year: 'numeric', month: 'long', day: 'numeric' }); }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString(I18N.lang === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function fmtRelDay(dateStr) {
    const today = Store.todayStr();
    if (dateStr === today) return t('date.today');
    if (dateStr === Store.todayStr(Engine.addDays(new Date(), -1))) return t('date.yesterday');
    return fmtDate(dateStr);
  }
  function fmtDuration(ms) { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`; }
  const regionName = id => `${Standards.region(id).flag} ${t('region.' + id)}`;

  // --- Components -------------------------------------------------------------
  function stdBadge(onLight) {
    const id = settings().region;
    return `<button type="button" class="std-badge ${onLight ? 'on-light' : ''}" data-act="why-std" id="std-badge" aria-label="${esc(t('region.current'))}"><span class="flag">${Standards.region(id).flag}</span>${esc(t('region.current'))} · ${esc(t('region.' + id))}</button>`;
  }
  function sourceNote(key, extra) {
    return `<div class="source-note">${icon('shield')}<span>${esc(t(key))}${extra ? ' · ' + esc(extra) : ''} · ${esc(t('src.reviewed', { date: '2026-01' }))}</span></div>`;
  }
  function alertCard(a) {
    const acts = (a.actions || []).map(x => ({ bp: ['al.act.bp', '#/tools/bp'], call: ['al.act.call', '#/tools/sos'], diet: ['al.act.diet', '#/diet'], gdm: ['al.act.gdm', 'gdm'], weight: ['al.act.weight', '#/weight'] }[x])).filter(Boolean);
    return `<div class="alert ${a.level}" role="status">
      <div class="ic">${icon(a.level === 'urgent' ? 'alert' : 'info')}</div>
      <div class="grow">
        <div class="row between"><span class="t">${esc(t(a.t))}</span><span class="chip ${a.level === 'urgent' ? 'danger' : 'warn'} xs">${esc(t('al.level.' + a.level))}</span></div>
        <div class="d">${esc(t(a.d))}</div>
        ${acts.length ? `<div class="actions">${acts.map(([k, href]) => href === 'gdm' ? `<button class="btn sm secondary" data-act="enable-gdm">${esc(t(k))}</button>` : `<a class="btn sm secondary" href="${href}">${esc(t(k))}</a>`).join('')}</div>` : ''}
      </div></div>`;
  }
  function ring(pct, label, sub, cls = '') {
    const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
    return `<div class="ring ${cls}"><svg viewBox="0 0 112 112"><circle class="track" cx="56" cy="56" r="${r}"/><circle class="fill" cx="56" cy="56" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg><div class="c"><div><b>${label}</b><br><span>${sub}</span></div></div></div>`;
  }
  function topbar(title, back = true, right = '') {
    return `<header class="topbar">${back ? `<button class="back" data-act="back" aria-label="${esc(t('c.back'))}">${icon('chevL')}</button>` : ''}<h1>${esc(title)}</h1>${right}</header>`;
  }
  // Minimal, safe rich text for AI answers: escapes HTML first, then supports **bold**, "- " bullets and blank-line paragraphs.
  function mdLite(text) {
    const lines = String(text == null ? '' : text).replace(/\r/g, '').split('\n');
    let html = '', para = [], list = [];
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const flushP = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
    const flushL = () => { if (list.length) { html += `<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`; list = []; } };
    for (const raw of lines) {
      const line = raw.trim();
      const m = line.match(/^(?:[-*•]|\d+[.、)])\s+(.*)$/);
      if (m) { flushP(); list.push(m[1]); }
      else if (!line) { flushP(); flushL(); }
      else { flushL(); para.push(line.replace(/^#+\s*/, '')); }
    }
    flushP(); flushL();
    return html;
  }
  const spinner = (cls = '') => `<span class="spinner ${cls}" aria-hidden="true"></span>`;

  // --- Sheets / confirm / toast ------------------------------------------------
  function sheet({ title, body, actions, onMount, wide }) {
    const bd = document.createElement('div');
    bd.className = 'sheet-backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ''}><div class="grab"></div>${title ? `<h2>${esc(title)}</h2>` : ''}<div class="sheet-body">${body}</div>${actions ? `<div class="sheet-actions">${actions}</div>` : ''}</div>`;
    const close = () => { try { bd.dispatchEvent(new CustomEvent('sheet-close')); } catch (e) { /* ignore */ } bd.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    bd.addEventListener('click', e => { if (e.target === bd) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bd);
    const s = bd.querySelector('.sheet');
    if (onMount) onMount(s, close);
    s.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    const first = s.querySelector('input:not([type="file"]):not(.sr-only),select,textarea,button:not([data-close])');
    if (first && !wide) setTimeout(() => first.focus(), 50);
    return close;
  }
  function confirm(msg, { danger = false, okText } = {}) {
    return new Promise(res => {
      sheet({
        body: `<p style="font-size:1.05rem;line-height:1.5">${esc(msg)}</p>`,
        actions: `<button class="btn secondary" data-close>${esc(t('c.cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okText || t('c.confirm'))}</button>`,
        onMount(s, close) {
          s.querySelector('[data-ok]').addEventListener('click', () => { close(); res(true); });
          s.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => res(false)));
        },
      });
    });
  }
  let toastWrap;
  function toast(msg, kind = '') {
    if (!toastWrap || toastWrap.isConnected === false) { toastWrap = document.createElement('div'); toastWrap.className = 'toast-wrap'; document.body.appendChild(toastWrap); }
    const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg; el.setAttribute('role', 'status');
    toastWrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; setTimeout(() => el.remove(), 220); }, 2200);
  }
  function whyStandard() {
    const rid = settings().region;
    const note = Standards.region(rid).noteKey;
    sheet({
      title: t('why.title'),
      body: `<div class="stack"><div class="notice primary">${regionName(rid)} · ${esc(t('region.' + rid + '.src'))}</div>
        ${note ? `<div class="notice">${esc(t(note))}</div>` : ''}
        <p class="muted">${esc(t('why.p1'))}</p><p class="muted">${esc(t('why.p2'))}</p><p class="muted">${esc(t('why.p3'))}</p><p class="bold">${esc(t('why.p4'))}</p>
        <a class="btn soft block" href="#/me/region" data-close>${esc(t('m.region'))}</a></div>`,
    });
  }

  function download(name, text, type = 'application/octet-stream') {
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    } catch (e) { toast(String(e), 'danger'); }
  }

  // --- Router -------------------------------------------------------------------
  // In-memory route is the source of truth; location.hash is synced best-effort so the
  // app also works inside sandboxed iframes / previews where hash navigation may be blocked.
  const Views = {};
  const TAB_FOR = { home: 'home', weight: 'weight', diet: 'diet', guide: 'guide', me: 'me', calendar: 'guide', week: 'guide', kicks: 'guide', contractions: 'guide', exercise: 'home', tools: 'home', report: 'me', ai: 'home' };
  const NO_TAB = ['onboarding', 'report', 'ai']; // full-height screens without the tab bar
  let route = '#/home';
  const history_ = [];
  function readHash() { try { return location.hash || ''; } catch (e) { return ''; } }
  function writeHash(h) { try { if (location.hash !== h) location.hash = h; } catch (e) { /* ignore */ } }
  function parseRoute(r) {
    const h = (r || '#/home').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', params: parts.slice(1) };
  }
  function parseHash() { return parseRoute(route); }
  let currentView = null;
  const timers = [];
  function timer(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; }
  function render() {
    timers.splice(0).forEach(clearInterval);
    const st = Store.state;
    const app = document.getElementById('app');
    let { name, params } = parseRoute(route);
    if (!st.onboarded && name !== 'onboarding') { route = '#/onboarding'; name = 'onboarding'; params = []; writeHash(route); }
    else if (st.onboarded && name === 'onboarding' && params[0] !== 'edit') { route = '#/home'; name = 'home'; params = []; writeHash(route); }
    const view = Views[name] || Views.home;
    const prev = Views[currentView];
    if (prev && prev !== view && prev.unmount) { try { prev.unmount(); } catch (e) { console.warn(e); } }
    currentView = name;
    const noTab = NO_TAB.includes(name);
    try {
      // The app shell is a fixed-height flex column: <main> scrolls on its own and the tab bar is a
      // separate footer, so content can never be hidden behind it (and the bar never moves).
      app.innerHTML = `<main class="view ${noTab ? 'no-tab' : ''} view-${esc(name)}" id="view-${esc(name)}">${view.render(params)}</main>${noTab ? '' : tabbar(TAB_FOR[name] || name)}`;
      try { const m = app.querySelector('main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); } catch (e) { /* ignore */ }
      if (view.mount) view.mount(app.querySelector('main'), params);
    } catch (e) {
      console.error(e);
      app.innerHTML = `<main class="view no-tab"><div class="card"><b>Something went wrong rendering “${esc(name)}”.</b><pre style="white-space:pre-wrap;font-size:12px;margin-top:8px">${esc(e && (e.stack || e.message || e))}</pre><button class="btn secondary mt-2" data-go-home>Home</button></div></main>`;
      app.querySelector('[data-go-home]').addEventListener('click', () => go('#/home'));
    }
    try { document.title = `${t('app.name')} · ${app.querySelector('h1') ? app.querySelector('h1').textContent : ''}`; } catch (e) { /* ignore */ }
  }
  function tabbar(active) {
    const tabs = [['home', 'home'], ['weight', 'scale'], ['diet', 'food'], ['guide', 'calendar'], ['me', 'user']];
    const hasAlert = Engine.alerts(Store.state).some(a => a.level === 'urgent');
    return `<div class="tabbar-wrap"><nav class="tabbar" aria-label="Main">${tabs.map(([k, ic]) => `<a class="tab ${active === k ? 'active' : ''}" href="#/${k}" id="tab-${k}">${k === 'home' && hasAlert ? '<i class="dot"></i>' : ''}${icon(ic)}<span>${esc(t('tab.' + k))}</span></a>`).join('')}</nav></div>`;
  }
  function go(hash) {
    if (hash !== route) { history_.push(route); if (history_.length > 50) history_.shift(); }
    route = hash; writeHash(hash); render();
  }
  function back() { const prev = history_.pop(); route = prev || '#/home'; writeHash(route); render(); }
  function syncFromHash() { const h = readHash(); if (h && h !== route) { history_.push(route); route = h; render(); } }
  function init() { const h = readHash(); if (h && h.startsWith('#/')) route = h; }

  // Global delegated actions + internal link handling (no reliance on browser hash navigation)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#/"]');
    if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go(a.getAttribute('href')); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'back') { e.preventDefault(); back(); }
    else if (act === 'why-std') { e.preventDefault(); whyStandard(); }
    else if (act === 'enable-gdm') { Store.update(s => { s.settings.gdmMode = true; }); toast(t('c.saved'), 'ok'); render(); }
  });

  global.UI = { esc, L, icon, fmtWeek, fmtWeight, fmtDelta, weightToKg, fmtHeight, fmtGlucose, glucoseToMmol, fmtEnergy, fmtDate, fmtDateLong, fmtTime, fmtRelDay, fmtDuration, regionName,
    stdBadge, sourceNote, alertCard, ring, topbar, mdLite, spinner, sheet, confirm, toast, whyStandard, Views, render, go, back, syncFromHash, init, download, r1, r0, parseHash, timer, get currentView() { return currentView; } };
})(window);
