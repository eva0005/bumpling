/* App bootstrap */
(function () {
  'use strict';
  function showFatal(msg) {
    const app = document.getElementById('app');
    if (app) app.innerHTML = '<div style="padding:24px;font-family:system-ui"><b>Bumpling could not start.</b><pre style="white-space:pre-wrap;font-size:12px;color:#a33">' + String(msg).replace(/</g, '&lt;') + '</pre></div>';
  }
  window.addEventListener('error', e => { if (!document.querySelector('#app main')) showFatal(e.message + (e.filename ? ' @ ' + e.filename + ':' + e.lineno : '')); });
  function boot() {
    try {
      const st = Store.load();
      I18N.set(st.settings.lang);
      document.documentElement.dataset.scale = st.settings.textScale || 'normal';
      UI.init();
      window.addEventListener('hashchange', UI.syncFromHash);
      UI.render();
      try { Reminders.check(); setInterval(() => Reminders.check(), 3600000); } catch (e) { /* ignore */ }
      window.addEventListener('storage', e => { if (e.key === 'pregjourney.v1') { Store.load(); I18N.set(Store.state.settings.lang); UI.render(); } });
      window.addEventListener('offline', () => UI.toast(t('pwa.offline')));
      setupViewport();
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => { /* optional */ });
      }
    } catch (e) { console.error(e); showFatal(e && (e.stack || e.message || e)); }
  }
  // Keyboard-aware layout (phones): `100dvh` does not shrink for the on-screen keyboard on iOS,
  // so the chat composer / sheet inputs would hide behind it. Follow visualViewport instead.
  function setupViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const fit = () => {
      raf = 0;
      const wide = window.matchMedia('(min-width: 560px)').matches;
      if (wide) { root.style.removeProperty('--vvh'); root.classList.remove('kb-open'); return; }
      const h = Math.round(vv.height);
      root.style.setProperty('--vvh', h + 'px');
      const kbOpen = window.innerHeight - h > 120;
      root.classList.toggle('kb-open', kbOpen);
      if (kbOpen) {
        // keep the layout viewport pinned and the focused field / chat bottom visible
        if (window.scrollY || vv.offsetTop) window.scrollTo(0, 0);
        const chat = document.getElementById('chat'); if (chat) chat.scrollTop = chat.scrollHeight;
        const ae = document.activeElement; if (ae && ae.scrollIntoView && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) { try { ae.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } }
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(fit); };
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('orientationchange', schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
