/* Sharing starts only after a reader chooses a button. No tracking is used. */
(() => {
 'use strict';

 document.querySelectorAll('[data-article-share]').forEach(section => {
  const copy = section.querySelector('[data-share-copy]');
  const native = section.querySelector('[data-share-native]');
  const status = section.querySelector('[data-share-status]');
  const fallback = section.querySelector('[data-share-fallback]');
  const input = section.querySelector('[data-share-input]');
  if (copy) copy.hidden = true;
  if (native) native.hidden = true;
  if (!copy || !native || !status || !fallback || !input
   || section.getAttribute('data-share-preview') === 'true') return;

  const url = section.getAttribute('data-share-url') || '';
  const title = (section.getAttribute('data-share-title') || '').trim();
  // Never share a browsing URL, query, fragment, draft URL or another origin.
  if (!/^https:\/\/derech-hakelev\.com\/pages\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url)
   || !title) return;

  const payload = {title, text: title, url};
  input.value = url;
  input.readOnly = true;
  copy.type = native.type = 'button';
  copy.hidden = false;

  function resetStatus() {
   status.textContent = '';
   fallback.hidden = true;
  }

  function manualCopy(message) {
   fallback.hidden = false;
   status.textContent = message;
   input.focus();
   input.select();
  }

  copy.addEventListener('click', async () => {
   resetStatus();
   copy.disabled = true;
   try {
    if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    status.textContent = 'הקישור הועתק';
   } catch {
    manualCopy('לא ניתן להעתיק אוטומטית. העתיקו את הקישור מהשדה.');
   } finally {
    copy.disabled = false;
   }
  });

  let nativeAvailable = typeof navigator.share === 'function';
  if (nativeAvailable && typeof navigator.canShare === 'function') {
   try { nativeAvailable = navigator.canShare(payload); }
   catch { nativeAvailable = false; }
  }
  if (!nativeAvailable) return;
  native.hidden = false;
  native.addEventListener('click', async () => {
   resetStatus();
   native.disabled = true;
   try {
    await navigator.share(payload);
    status.textContent = 'אפשרויות השיתוף נפתחו';
   } catch (error) {
    if (error?.name !== 'AbortError') {
     manualCopy('אפשר לשתף באמצעות העתקת הקישור מהשדה.');
    }
   } finally {
    native.disabled = false;
   }
  });
 });
})();
