/* Public Clarity project ID. This file is shared by both website pages. */
(() => {
 'use strict';
 const projectId = 'ywqq9e8u1f';
 const storageKey = 'derech-analytics-consent-v1';
 const production = ['derech-hakelev.com', 'www.derech-hakelev.com'].includes(location.hostname);
 let consent = null;
 let started = false;
 try { consent = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }

 const listeners = new Set();
 let showNotice;
 const snapshot = () => ({analytics: consent === 'granted', externalMedia: consent === 'granted'});
 window.DERECH_PRIVACY = Object.freeze({
  getPreferences: snapshot,
  subscribe(listener) {
   if (typeof listener !== 'function') return () => {};
   listeners.add(listener);
   return () => listeners.delete(listener);
  },
  openPreferences() { showNotice?.(); },
  trackEvent(name, params = {}) {
   // Only fixed measurement events from our router; never forward arbitrary data.
   const names = new Set(['contact_click', 'product_details_open', 'finder_start', 'finder_complete', 'canva_game_open', 'memory_game_complete']);
   if (!names.has(name)) return;
   const products = new Set(['solutions', 'resilience', 'drive', 'world', 'thoughts', 'emotions', 'derech', 'workbook', 'escape']);
   const buttons = new Set(['header_whatsapp', 'therapy_whatsapp', 'testimonials_whatsapp', 'benefits_whatsapp', 'hosen_whatsapp', 'contact_whatsapp', 'contact_phone', 'contact_email', 'content_whatsapp', 'content_phone', 'content_email', 'footer_whatsapp', 'footer_phone', 'footer_email', 'bundle_order', 'bundle_whatsapp', 'pack_offer_contact', 'floating_whatsapp', 'finder_whatsapp', 'finder_bundle', 'floating_bundle_offer']);
   let suffix = '';
   if (name === 'contact_click') {
    if (buttons.has(params.button_id)) suffix = '_' + params.button_id;
    else {
     const match = String(params.button_id || '').match(/^(catalog_order|product_top_order|product_bottom_order|product_top|product_bottom|finder_product)_(\w+)$/);
     if (!match || !products.has(match[2])) return;
     suffix = '_' + match[0];
    }
   } else if (name === 'product_details_open') {
    if (!products.has(params.product_id)) return;
    suffix = '_' + params.product_id;
   } else if (name === 'canva_game_open' || name === 'memory_game_complete') {
    if (!['dogs_trivia', 'resilience_trivia', 'thinking_trivia', 'solutions_memory'].includes(params.game_id)) return;
    suffix = '_' + params.game_id;
   }
   event(name + suffix);
  }
 });
 function notify() {
  for (const listener of listeners) {
   try { listener(snapshot()); } catch { /* One consumer must not prevent withdrawal. */ }
  }
  document.dispatchEvent(new CustomEvent('derech:privacy-change', {detail: snapshot()}));
 }


 function start() {
  // Local previews never send visitor data to the live project.
  if (!production || consent !== 'granted') return;
  window.clarity = window.clarity || function () {
   (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  // Queue the storage decision before loading Clarity, including on first visit.
  window.clarity('consentv2', {analytics_Storage: consent === 'granted' ? 'granted' : 'denied', ad_Storage: 'denied'});
  if (started) return;
  started = true;
  window.clarity('set', 'site_page', document.body.dataset.page === 'product' ? 'product' : /^\/pages\/games\/(?:index\.html)?$/.test(location.pathname) ? 'games' : location.pathname === '/' || location.pathname === '/index.html' ? 'home' : 'information');
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + projectId;
  document.head.append(script);
 }

 function clearMeasurementCookies() {
  // Only our first-party Clarity cookies are in scope; remote history is unaffected.
  const domains = new Set(['', location.hostname, '.' + location.hostname]);
  if (production) {
   domains.add('derech-hakelev.com');
   domains.add('.derech-hakelev.com');
  }
  const paths = new Set(['/']);
  const segments = (location.pathname || '/').split('/').filter(Boolean);
  let path = '';
  for (const segment of segments) {
   path += '/' + segment;
   paths.add(path);
   paths.add(path + '/');
  }
  for (const name of ['_clck', '_clsk']) {
   for (const domain of domains) {
    for (const cookiePath of paths) {
     try {
      document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + cookiePath + (domain ? '; domain=' + domain : '');
     } catch { /* A blocked cookie store must not prevent stopping the recorder. */ }
    }
   }
  }
 }


 function event(name) {
  if (started && consent === 'granted') window.clarity('event', name);
 }

 document.addEventListener('DOMContentLoaded', () => {
  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'העדפות מדידה');
  panel.innerHTML = '<p>כדי לספק חוויית גלישה טובה יותר, אנו משתמשים בטכנולוגיות כמו עוגיות (Cookies) למדידת השימוש באתר ולשיפורו. המדידה תתחיל רק לאחר אישורכם. ניתן לבטל את ההסכמה בתחתית האתר.</p><div class="analytics-actions"><button type="button" data-consent="granted">אישור</button></div>';
  panel.hidden = consent === 'granted';
  document.body.append(panel);
  const preferences = document.createElement('button');
  preferences.type = 'button';
  preferences.className = 'analytics-preferences';
  preferences.textContent = consent === 'granted' ? 'ביטול הסכמה למדידה' : 'העדפות פרטיות ומדידה';
  showNotice = () => {
   panel.hidden = false;
   panel.querySelector('button').focus({preventScroll: true});
  };
  preferences.addEventListener('click', () => {
   if (consent === 'granted') { choose('denied'); return; }
   showNotice();
  });
  document.querySelector('.site-footer')?.append(preferences);
  function choose(value) {
   const wasGranted = consent === 'granted';
   consent = value;
   try { localStorage.setItem(storageKey, consent); } catch {
    // A full store must not restore an older approval after withdrawal and reload.
    if (consent !== 'granted') { try { localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ } }
   }
   panel.hidden = consent === 'granted';
   preferences.textContent = consent === 'granted' ? 'ביטול הסכמה למדידה' : 'העדפות פרטיות ומדידה';
   notify();
   if (consent === 'granted') start();
   else if (wasGranted) {
    if (started) {
     window.clarity('consentv2', {analytics_Storage: 'denied', ad_Storage: 'denied'});
     window.clarity('consent', false);
    }
    clearMeasurementCookies();
    // Reload without the recorder, preserving the current address.
    if (started) location.reload();
   }
  }
  panel.addEventListener('click', e => {
   const button = e.target.closest('[data-consent]');
   if (button) choose(button.dataset.consent);
  });
  start();

  // Delegation also covers catalog cards generated by scripts.js.
  // Use fixed action/product IDs; never send link query strings or message text.
  document.addEventListener('click', e => {
   const control = e.target.closest('a, button');
   if (!control) return;
   const product = control.closest('.game-card')?.id.replace(/^game-/, '');
   if (control.matches('.gallery .prev, .gallery .next')) event('gallery_manual_' + (product || 'home'));
   if (control.matches('.card-link')) event('game_preview_' + product);
   if (control.matches('#restart-game')) event('sample_game_restart');
   if (control.tagName !== 'A') return;
   const url = new URL(control.href, location.href);
   if (['www.facebook.com', 'www.instagram.com', 'www.tiktok.com'].includes(url.hostname)) event('social_' + url.hostname.split('.')[1]);
  });
 });
})();
