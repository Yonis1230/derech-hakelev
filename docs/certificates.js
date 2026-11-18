/* Native modal: keyboard focus stays inside, Escape closes it. No third parties. */
(() => {
 'use strict';
 const trigger = document.querySelector('[data-certificates-open]');
 const dialog = document.getElementById('certificates-dialog');
 if (!trigger || !dialog || typeof dialog.showModal !== 'function' || dialog.dataset.ready) return;
 dialog.dataset.ready = 'true';
 const close = dialog.querySelector('[data-certificates-close]');
 trigger.hidden = false;
 trigger.addEventListener('click', () => {
  if (dialog.open) return;
  dialog.querySelectorAll('img[data-certificate-src]').forEach(photo => {
   if (photo.hasAttribute('src')) return;
   photo.addEventListener('error', () => {
    photo.hidden = true;
    const status = photo.closest('li').querySelector('[data-certificate-status]');
    status.textContent = 'לא ניתן לטעון את התמונה כרגע. אפשר לנסות לפתוח את התעודה בגודל מלא.';
   }, {once: true});
   photo.src = photo.dataset.certificateSrc;
  });
  dialog.showModal();
  document.body.classList.add('certificates-open');
  trigger.setAttribute('aria-expanded', 'true');
  dialog.scrollTop = 0;
  close.focus({preventScroll: true});
 });
 close.addEventListener('click', () => dialog.close());
 dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
 });
 dialog.addEventListener('close', () => {
  document.body.classList.remove('certificates-open');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.focus({preventScroll: true});
 });
})();
