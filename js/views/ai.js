/* ==========================================================================
   小芽AI (Sprout AI) — pregnancy Q&A view. Text / voice / photo questions.
   LLM mode when the user connects an OpenAI-compatible service (Me → AI
   settings), built-in offline knowledge base otherwise. Tab bar stays fixed
   (需求4): the composer floats above it and the message list reserves space.
   ========================================================================== */
(function () {
  'use strict';
  const { esc, icon } = UI;
  let busy = false;
  let pendingPhoto = null; // photo id attached to the NEXT user message
  let rootEl = null;

  const fmt = s => UI.esc(String(s || ''))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');

  function bubble(m) {
    if (m.role === 'user') {
      return `<div class="msg user"><div class="msg-b">${m.photoId ? `<img class="msg-photo" data-photo="${m.photoId}" alt="${esc(t('ai.photo'))}">` : ''}${m.text ? `<p>${fmt(m.text)}</p>` : ''}</div></div>`;
    }
    return `<div class="msg ai"><div class="msg-b"><p>${fmt(m.text)}</p>
      <div class="msg-ops">${m.src ? `<span class="chip xs">${esc(t('ai.src'))} ${esc(m.src)}</span>` : ''}
      <button class="btn icon ghost sm" data-speak="${m.id}" aria-label="${esc(t('ai.read'))}">${icon('speaker')}</button></div></div></div>`;
  }

  function render() {
    const st = Store.state;
    const msgs = st.aiChat || [];
    const g = Engine.gestAge(st.profile);
    const online = AI.configured();
    const statusLine = g ? t('ai.paste.num', { kcal: Math.round(Engine.dayIntake(st, Store.todayStr()).kcal), target: Engine.nutrientTargets(st).kcal, min: Engine.weekMinutes(st) }) : '';
    const hello = `<div class="msg ai"><div class="msg-b"><p>${fmt(t('ai.hello'))}</p>${statusLine ? `<p class="xs subtle mt-1">${esc(t('ai.today'))}：${esc(statusLine)}</p>` : ''}</div></div>`;
    return `${UI.topbar(t('ai.title'), true, `<span class="chip xs ${online ? 'ok' : 'info'}">${esc(online ? t('ai.badge.on') : t('ai.badge.off'))}</span><a class="btn icon secondary" href="#/me/ai" aria-label="${esc(t('ai.cfg'))}">${icon('settings')}</a>`)}
      <div class="ai-disc"><div>${esc(t('ai.disc'))}</div><button class="btn ghost sm" data-act="ai-clear">${esc(t('ai.clear'))}</button></div>
      <div class="ai-msgs" id="ai-msgs">${hello}${msgs.map(bubble).join('')}${msgs.length === 0 ? `<div class="ai-suggest">${['ai.q1', 'ai.q2', 'ai.q3'].map(k => `<button class="chip selectable" data-suggest="${esc(t(k))}">${esc(t(k))}</button>`).join('')}</div>` : ''}${busy ? `<div class="msg ai"><div class="msg-b"><div class="ai-typing"><i></i><i></i><i></i><span>${esc(t('ai.thinking'))}</span></div></div></div>` : ''}</div>
      <div class="ai-composer">
        <div class="ai-attach" id="ai-attach" ${pendingPhoto ? '' : 'hidden'}></div>
        <div class="ai-row">
          <label class="btn icon secondary" for="ai-photo" aria-label="${esc(t('ai.photo'))}">${icon('camera')}</label>
          <input type="file" accept="image/*" id="ai-photo" class="sr-only">
          <button class="btn icon secondary" id="ai-mic" aria-label="${esc(t('ai.mic'))}">${icon('mic')}</button>
          <input class="input ai-in" id="ai-in" type="text" placeholder="${esc(t('ai.ph'))}" enterkeyhint="send" autocomplete="off">
          <button class="btn primary icon" id="ai-send" aria-label="${esc(t('ai.send'))}">${icon('send')}</button>
        </div>
      </div>`;
  }

  function scrollBottom() {
    const el = rootEl && rootEl.querySelector('#ai-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function renderAttach() {
    const wrap = rootEl.querySelector('#ai-attach');
    if (!wrap) return;
    if (!pendingPhoto) { wrap.hidden = true; wrap.innerHTML = ''; return; }
    wrap.hidden = false;
    wrap.innerHTML = `<div class="photo-thumb"><img alt=""></div><button class="btn icon ghost sm" data-act="ai-unattach" aria-label="${esc(t('photo.remove'))}">${icon('x')}</button>`;
    Photos.thumb(pendingPhoto).then(b => {
      const img = wrap.querySelector('img');
      if (img && b) { const u = URL.createObjectURL(b); img.src = u; setTimeout(() => { try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ } }, 4000); }
    });
  }

  // --- Sending -----------------------------------------------------------------
  async function send() {
    if (!rootEl) return;
    const input = rootEl.querySelector('#ai-in');
    const text = input ? input.value.trim() : '';
    if (busy) return;
    if (!text && !pendingPhoto) { UI.toast(t('ai.needtext'), 'danger'); return; }
    busy = true;
    const photoId = pendingPhoto;
    pendingPhoto = null;
    Store.update(s => { s.aiChat = s.aiChat || []; s.aiChat.push({ id: Store.uid(), role: 'user', text, ts: Date.now(), ...(photoId ? { photoId } : {}) }); if (s.aiChat.length > 60) s.aiChat = s.aiChat.slice(-60); });
    UI.render();
    await respond(text, photoId);
  }

  async function respond(text, photoId) {
    const st = Store.state;
    const history = (st.aiChat || []).slice(0, -1).slice(-8);
    let photoDataUrl = null;
    if (photoId && AI.configured()) { try { photoDataUrl = await Photos.dataURL(photoId, 1024); } catch (e) { /* proceed text-only */ } }
    let reply, src = null;
    try {
      if (AI.configured()) {
        reply = await AI.chatWithHistory(text, photoDataUrl, history);
      } else {
        const r = AI.offlineAnswer(text || t('ai.photo'));
        reply = (photoId ? t('ai.photo.off') + '\n\n' : '') + r.text;
        src = r.src;
      }
    } catch (e) {
      const r = AI.offlineAnswer(text || '');
      reply = t('ai.err', { e: (e && (e.message || e)) }) + '\n\n' + r.text;
      src = r.src;
    }
    Store.update(s => { s.aiChat.push({ id: Store.uid(), role: 'ai', text: reply, src, ts: Date.now() }); if (s.aiChat.length > 60) s.aiChat = s.aiChat.slice(-60); });
    busy = false;
    if (rootEl && rootEl.isConnected) UI.render();
  }

  // --- Voice input (Web Speech API) ----------------------------------------------
  let rec = null, listening = false;
  function updateMicUI() {
    if (!rootEl) return;
    const mic = rootEl.querySelector('#ai-mic');
    const input = rootEl.querySelector('#ai-in');
    if (mic) mic.classList.toggle('listening', listening);
    if (input) input.placeholder = listening ? t('ai.listening') : t('ai.ph');
  }
  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { UI.toast(t('ai.no.sr'), 'danger'); return; }
    if (listening) { try { rec && rec.stop(); } catch (e) { /* ignore */ } return; }
    rec = new SR();
    rec.lang = I18N.lang === 'zh' ? 'zh-CN' : 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      const input = rootEl && rootEl.querySelector('#ai-in');
      if (input) input.value = (finalText + interim).trim();
    };
    rec.onend = () => { listening = false; updateMicUI(); const v = rootEl && rootEl.querySelector('#ai-in'); if (v && v.value.trim()) send(); };
    rec.onerror = () => { listening = false; updateMicUI(); };
    try { rec.start(); listening = true; updateMicUI(); } catch (e) { UI.toast(t('ai.no.sr'), 'danger'); }
  }

  // --- Read aloud ------------------------------------------------------------------
  function speak(m) {
    if (!('speechSynthesis' in window)) { UI.toast(t('ai.no.tts'), 'danger'); return; }
    if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); return; }
    const u = new SpeechSynthesisUtterance(String(m.text).replace(/\*\*|\*|📌/g, ''));
    u.lang = I18N.lang === 'zh' ? 'zh-CN' : 'en-US';
    speechSynthesis.speak(u);
  }

  // --- Mount -----------------------------------------------------------------------
  function mount(root) {
    rootEl = root;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    Photos.hydrate(root);
    renderAttach();
    scrollBottom();
    const input = root.querySelector('#ai-in');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    root.querySelector('#ai-photo').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { pendingPhoto = await Photos.add(f); renderAttach(); }
      catch (err) { UI.toast(t('photo.fail'), 'danger'); }
    });
    root.querySelector('#ai-send').addEventListener('click', send);
    root.querySelector('#ai-mic').addEventListener('click', toggleMic);
    root.addEventListener('click', e => {
      const img = e.target.closest('img.msg-photo');
      if (img && img.dataset.photo) { Photos.viewer(img.dataset.photo); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.suggest) { const input2 = root.querySelector('#ai-in'); input2.value = b.dataset.suggest; send(); }
      else if (b.dataset.act === 'ai-unattach') { pendingPhoto = null; renderAttach(); }
      else if (b.dataset.act === 'ai-clear') UI.confirm(t('ai.clear.c'), { danger: true, okText: t('ai.clear') }).then(ok => { if (ok) { Store.update(s => { s.aiChat = []; }); pendingPhoto = null; UI.render(); } });
      else if (b.dataset.speak) { const m = (Store.state.aiChat || []).find(x => String(x.id) === b.dataset.speak); if (m) speak(m); }
    });
  }

  UI.Views.ai = { render, mount };
})();
