/* ==========================================================================
   Photos — local-only photo attachments (PRD §7.3 local-only mode).
   Records in Store keep only a photo id; the image bytes live in IndexedDB
   on the same device. Upload/attach is automatic: pick or shoot a photo and
   the thumbnail appears in diet / exercise / AI history with no extra step.
   Full images are downscaled (max 1280px JPEG) before storage; thumbnails
   (max 320px) power the history lists. Nothing is ever sent anywhere except
   when the user explicitly asks 小芽AI to analyse a photo (js/ai.js).
   ========================================================================== */
(function (global) {
  'use strict';
  const DB_NAME = 'bumpling-photos.v1';
  const STORE = 'photos';
  const FULL_MAX = 1280, THUMB_MAX = 320;

  let dbPromise = null;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((res, rej) => {
        let rq;
        try { rq = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
        rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE, { keyPath: 'id' }); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error || new Error('indexedDB unavailable'));
      });
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  async function putRecord(rec) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(rec);
      t.oncomplete = () => res(rec.id);
      t.onerror = () => rej(t.error);
    });
  }
  async function getRecord(id) {
    const d = await db();
    return reqP(d.transaction(STORE).objectStore(STORE).get(id));
  }

  // Downscale/encode any image File/Blob to a JPEG blob of bounded size.
  function shrink(source, maxDim, quality) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(source);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('encode failed')); }, 'image/jpeg', quality);
        } catch (e) { URL.revokeObjectURL(url); rej(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
      img.src = url;
    });
  }

  // Attach a photo: returns a stable id for Store records. Throws on failure.
  async function add(file) {
    if (!file) throw new Error('no file');
    const full = await shrink(file, FULL_MAX, 0.82);
    const thumb = await shrink(full, THUMB_MAX, 0.75);
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await putRecord({ id, blob: full, thumb, ts: Date.now() });
    return id;
  }

  async function blobOf(id, which) {
    if (!id) return null;
    try {
      const rec = await getRecord(id);
      return rec ? (rec[which] || rec.blob) : null;
    } catch (e) { return null; }
  }

  const thumb = id => blobOf(id, 'thumb');
  const full = id => blobOf(id, 'blob');

  // dataURL for AI vision requests (re-downscaled to keep payloads small).
  async function dataURL(id, maxDim = 1024) {
    let b = await blobOf(id, 'blob');
    if (!b) return null;
    if (maxDim) { try { b = await shrink(b, maxDim, 0.8); } catch (e) { /* fall back to stored blob */ } }
    return await new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => res(null);
      r.readAsDataURL(b);
    });
  }

  async function remove(id) {
    if (!id) return;
    try {
      const d = await db();
      const t = d.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
    } catch (e) { /* ignore */ }
  }

  // --- Automatic display ------------------------------------------------------
  // <img data-photo="id"> placeholders get their thumbnail injected once the
  // async read resolves. Object URLs are revoked on the next hydration.
  let live = [];
  function revokeLive() { live.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ } }); live = []; }
  async function hydrate(root) {
    revokeLive();
    if (!root || !root.querySelectorAll) return;
    const imgs = root.querySelectorAll('img[data-photo]');
    for (const img of imgs) {
      const b = await thumb(img.dataset.photo);
      if (!b) { img.style.display = 'none'; continue; }
      try {
        const u = URL.createObjectURL(b);
        live.push(u);
        img.src = u;
        img.classList.add('loaded');
      } catch (e) { /* ignore */ }
    }
  }

  // Full-screen viewer for one photo id (tap a thumbnail to open).
  function viewer(id) {
    const bd = document.createElement('div');
    bd.className = 'photo-viewer';
    bd.innerHTML = '<div class="pv-inner"><img alt=""><p class="pv-cap"></p></div><button class="pv-close" aria-label="close">×</button>';
    bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('.pv-close')) { bd.remove(); } });
    document.body.appendChild(bd);
    full(id).then(b => {
      if (!b) { bd.remove(); UI.toast(t('photo.notfound'), 'danger'); return; }
      const u = URL.createObjectURL(b);
      const img = bd.querySelector('img');
      img.src = u;
      img.onload = () => { try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ } };
      bd.querySelector('.pv-cap').textContent = t('photo.privacy');
    }).catch(() => bd.remove());
  }

  // Shared photo-picker for sheets: markup + wiring. onChange(photoId|null).
  function pickerHTML(inputId, label, capture) {
    return `<div class="photo-pick-row" data-photo-pick="${UI.esc(inputId)}">
      <label class="photo-pick" for="${UI.esc(inputId)}">${UI.icon('camera')}<span>${UI.esc(label)}</span></label>
      <div class="photo-preview" data-preview-for="${UI.esc(inputId)}" hidden></div>
      <input type="file" accept="image/*" id="${UI.esc(inputId)}" class="sr-only"${capture ? ' capture="environment"' : ''}>
    </div>`;
  }
  function bindPicker(scope, inputId, onChange) {
    const input = scope.querySelector('#' + CSS.escape(inputId));
    const preview = scope.querySelector(`[data-preview-for="${inputId}"]`);
    if (!input || !preview) return;
    const show = async id => {
      if (!id) { preview.hidden = true; preview.innerHTML = ''; onChange(null); return; }
      preview.hidden = false;
      const b = await thumb(id);
      preview.innerHTML = `<div class="photo-thumb">${b ? `<img alt="">` : ''}<button type="button" class="photo-x" aria-label="${UI.esc(t('photo.remove'))}">×</button></div>`;
      if (b) { const u = URL.createObjectURL(b); live.push(u); const img = preview.querySelector('img'); if (img) img.src = u; }
      preview.querySelector('.photo-x').addEventListener('click', () => show(null));
      onChange(id);
    };
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.value = ''; // allow re-picking the same file later
      if (!f) return;
      preview.hidden = false;
      preview.innerHTML = `<div class="photo-thumb loading"></div>`;
      let id = null;
      try { id = await add(f); } catch (e) { id = null; }
      if (!id) { preview.hidden = true; preview.innerHTML = ''; UI.toast(t('photo.fail'), 'danger'); onChange(null); return; }
      await show(id);
    });
  }

  global.Photos = { add, thumb, full, dataURL, remove, hydrate, viewer, pickerHTML, bindPicker };
})(window);
