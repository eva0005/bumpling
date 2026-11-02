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
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => { /* optional */ });
      }
    } catch (e) { console.error(e); showFatal(e && (e.stack || e.message || e)); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
