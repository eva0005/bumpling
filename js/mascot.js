/* ==========================================================================
   Mascot — 「小芽 / Bumpling」, the companion sprite (and the brand character).
   A soft seed-shaped spirit with a sprouting leaf. Pure inline SVG so it scales,
   themes, and animates (bob+tilt / breathe / blink / glance / wave / leaf sway)
   with zero asset weight. Tap it to make it react.
   Moods: 'happy' (default) · 'cheer' · 'calm' · 'sleepy' · 'care'
   ========================================================================== */
(function (global) {
  'use strict';

  const NAME = { zh: '小芽', en: 'Bumpling' };

  function mascot(opts = {}) {
    const { size = 96, mood = 'happy', cls = '', animate = true, title } = opts;
    const closed = mood === 'sleepy' || mood === 'care';
    const eyes = closed
      ? `<g class="m-look"><path class="m-eye" d="M43 65 q5 -5 10 0"/><path class="m-eye" d="M67 65 q5 -5 10 0"/></g>`
      : `<g class="m-look"><g class="m-eyes"><circle class="m-eye-dot" cx="48" cy="64" r="3.8"/><circle class="m-eye-dot" cx="72" cy="64" r="3.8"/><circle cx="49.4" cy="62.4" r="1.25" fill="#fff"/><circle cx="73.4" cy="62.4" r="1.25" fill="#fff"/><circle cx="46.8" cy="65.6" r=".6" fill="#fff" opacity=".8"/><circle cx="70.8" cy="65.6" r=".6" fill="#fff" opacity=".8"/></g></g>`;
    const mouth = mood === 'cheer'
      ? `<path class="m-mouth" d="M51 76 q9 11 18 0 z" style="fill:hsl(5 62% 48%);stroke:none"/><path d="M55.5 80.5 q4.5 3.5 9 0 q-4.5 -1.5 -9 0 z" style="fill:hsl(5 80% 70%)"/>`
      : mood === 'care' || mood === 'calm'
        ? `<path class="m-mouth" d="M54 79 q6 4 12 0"/>`
        : mood === 'sleepy'
          ? `<ellipse class="m-mouth" cx="60" cy="79.5" rx="2.6" ry="3.2" style="fill:hsl(5 40% 40%);stroke:none"/>`
          : `<path class="m-mouth" d="M51 77 q9 9 18 0"/>`;
    const arms = mood === 'cheer'
      ? `<path class="m-arm m-arm-l" d="M27 70 q-10 -5 -8 -17"/><path class="m-arm m-arm-r" d="M93 70 q10 -5 8 -17"/>`
      : `<path class="m-arm m-arm-l" d="M26 78 q-7 3 -5 11"/><path class="m-arm m-arm-r" d="M94 78 q7 3 5 11"/>`;
    const extras = mood === 'cheer'
      ? `<g class="m-sparkle"><path d="M22 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="hsl(40 90% 70%)"/><path d="M98 24 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="hsl(18 78% 72%)"/><circle cx="104" cy="52" r="2" fill="hsl(150 42% 60%)"/></g>`
      : mood === 'sleepy'
        ? `<g class="m-zz" font-family="Manrope, system-ui, sans-serif" font-weight="800" fill="hsl(166 34% 36%)"><text class="m-z1" x="88" y="40" font-size="12">z</text><text class="m-z2" x="98" y="30" font-size="9">z</text></g>`
        : `<g class="m-sparkle m-sparkle-poke"><path d="M22 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="hsl(40 90% 70%)"/><path d="M98 24 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="hsl(18 78% 72%)"/></g>`;
    return `<svg class="mascot ${cls} ${animate ? 'is-animated' : ''} mood-${mood}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${title || NAME[I18N.lang] || NAME.en}">
      <ellipse class="m-shadow" cx="60" cy="110" rx="22" ry="4"/>
      <g class="m-float">
        <g class="m-sprout">
          <path class="m-stem" d="M60 28 C 60 22, 61 18, 63 13"/>
          <path class="m-leaf m-leaf-l" d="M60 19 C 50 20, 44 14, 44 8 C 51 7, 58 11, 60 19 Z"/>
          <path class="m-leaf m-leaf-r" d="M63 15 C 66 7, 74 4, 80 6 C 79 13, 72 17, 63 15 Z"/>
          <path class="m-leaf-vein" d="M47 9 C 52 11, 56 14, 59 18"/>
        </g>
        <g class="m-breathe">
          <path class="m-body" d="M60 26 C 37 26, 22 44, 22 68 C 22 92, 39 106, 60 106 C 81 106, 98 92, 98 68 C 98 44, 83 26, 60 26 Z"/>
          ${arms}
          <path class="m-shine" d="M39 48 C 39 40, 45 34, 52 33 C 46 37, 43 42, 42 50 Z"/>
          <circle class="m-cheek" cx="40" cy="73" r="4.5"/><circle class="m-cheek" cx="80" cy="73" r="4.5"/>
          ${eyes}
          ${mouth}
        </g>
        ${extras}
      </g>
    </svg>`;
  }

  // App icon: happy Bumpling on a deep-green tile. Keep in sync with /icon.svg (favicon + manifest).
  function appIcon(size = 44) {
    const id = 'ag' + Math.random().toString(36).slice(2, 7);
    return `<svg class="app-icon" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f4d45"/><stop offset="1" stop-color="#2f6f63"/></linearGradient></defs><rect width="120" height="120" rx="28" fill="url(#${id})"/><g transform="translate(4.8 8) scale(0.92)"><path d="M60 28 C 60 22, 61 18, 63 13" fill="none" stroke="#5fae8e" stroke-width="3.4" stroke-linecap="round"/><path d="M60 19 C 50 20, 44 14, 44 8 C 51 7, 58 11, 60 19 Z" fill="#5fae8e"/><path d="M63 15 C 66 7, 74 4, 80 6 C 79 13, 72 17, 63 15 Z" fill="#8fd3b6"/><path d="M47 9 C 52 11, 56 14, 59 18" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/><path d="M60 26 C 37 26, 22 44, 22 68 C 22 92, 39 106, 60 106 C 81 106, 98 92, 98 68 C 98 44, 83 26, 60 26 Z" fill="#b4e0cf"/><path d="M26 78 q-7 3 -5 11" fill="none" stroke="#8fcbb2" stroke-width="6" stroke-linecap="round"/><path d="M94 78 q7 3 5 11" fill="none" stroke="#8fcbb2" stroke-width="6" stroke-linecap="round"/><path d="M39 48 C 39 40, 45 34, 52 33 C 46 37, 43 42, 42 50 Z" fill="#ffffff" fill-opacity=".55"/><circle cx="40" cy="73" r="4.5" fill="#f0a085" opacity=".6"/><circle cx="80" cy="73" r="4.5" fill="#f0a085" opacity=".6"/><circle cx="48" cy="64" r="3.8" fill="#1b2a28"/><circle cx="72" cy="64" r="3.8" fill="#1b2a28"/><circle cx="49.4" cy="62.4" r="1.25" fill="#fff"/><circle cx="73.4" cy="62.4" r="1.25" fill="#fff"/><path d="M51 77 q9 9 18 0" fill="none" stroke="#1b2a28" stroke-width="2.6" stroke-linecap="round"/></g></svg>`;
  }

  // Companion message for today — picks the most relevant thing to say
  function say(state) {
    const g = Engine.gestAge(state.profile);
    if (state.settings.lossMode) return { mood: 'care', text: t('mascot.care') };
    const urgent = Engine.alerts(state).find(a => a.level === 'urgent');
    if (urgent) return { mood: 'calm', text: t('mascot.urgent') };
    const up = Engine.upcomingReminders(state)[0];
    if (up && up.daysUntil === 0) return { mood: 'cheer', text: t('mascot.visit.today', { t: up.title }) };
    const today = Store.todayStr();
    const h = new Date().getHours();
    const gs = Engine.gainStatus(state);
    if (gs.status === 'in' && state.weights.some(w => w.date === today)) return { mood: 'cheer', text: t('mascot.weight.in') };
    if (h >= 21 || h < 5) return { mood: 'sleepy', text: t('mascot.night') };
    if (g && g.weeks >= 28 && !state.kicks.some(k => k.end && Store.todayStr(new Date(k.end)) === today)) return { mood: 'happy', text: t('mascot.kicks') };
    if (!state.meals.some(m => m.date === today) && h >= 12) return { mood: 'happy', text: t('mascot.meals') };
    if (up && up.daysUntil > 0) return { mood: 'happy', text: t('mascot.visit.soon', { n: up.daysUntil, t: up.title }) };
    const wk = Content.weekInfo(g ? g.weeks : 4);
    return { mood: 'happy', text: t('mascot.week', { fruit: UI.L(wk.fruit) }) };
  }

  // Reaction when tapped
  const POKES = ['mascot.poke.1', 'mascot.poke.2', 'mascot.poke.3', 'mascot.poke.4', 'mascot.poke.5'];
  function poke() { return t(POKES[Math.floor(Math.random() * POKES.length)]); }

  global.Mascot = { NAME, mascot, appIcon, say, poke };
})(window);
