/* GraphComment is requested only when a reader opens the comment area. */
(() => {
 'use strict';
 const section = document.querySelector('[data-article-comments]');
 if (!section) return;
 const button = section.querySelector('[data-comments-load]');
 const status = section.querySelector('[data-comments-status]');
 let target = section.querySelector('[data-comments-widget]');
 if (!button || !status || !target) return;

 const siteId = (section.getAttribute('data-comments-site') || '').trim();
 const url = section.getAttribute('data-comments-url') || '';
 const slug = section.getAttribute('data-comments-slug') || '';
 const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
 const route = url.match(/^https:\/\/derech-hakelev\.com\/(?:pages\/)?articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
 button.disabled = true;
 target.hidden = true;
 if (section.getAttribute('data-comments-preview') === 'true') {
  button.hidden = true;
  status.textContent = 'תגובות אינן זמינות בתצוגת הבדיקה.';
  return;
 }
 if (!/^[a-z0-9_-]{1,100}$/iu.test(siteId)
  || /^(?:demo|demo-gc|example|placeholder|shortname|your-site|your-shortname)$/iu.test(siteId)
  || !route || route[1] !== slug || url !== canonical || target.getAttribute('id') !== 'graphcomment') {
  button.hidden = true;
  status.textContent = 'התגובות עדיין לא זמינות.';
  return;
 }

 let state = 'idle';
 let attempt = 0;
 let script = null;
 let timeout = null;
 let callbackObserved = false;
 let frameReady = false;
 const label = button.textContent;
 button.hidden = false;
 button.disabled = false;

 function flags(loading, ready) {
  section.setAttribute('data-comments-loading', String(loading));
  section.setAttribute('data-comments-ready', String(ready));
 }

 function clearDeadline() {
  if (timeout !== null) clearTimeout(timeout);
  timeout = null;
 }

 function currentFrame() {
  const frame = target.querySelector('iframe');
  if (!frame) return null;
  try {
   const source = new URL(frame.getAttribute('src'));
   // The standard SDK builds its iframe from https://graphcomment.com/front/.
   return source.origin === 'https://graphcomment.com' && source.pathname === '/front/' ? frame : null;
  } catch { return null; }
 }

 function failed(token) {
  if (token !== attempt || state !== 'loading') return;
  attempt++;
  state = 'idle';
  callbackObserved = frameReady = false;
  clearDeadline();
  flags(false, false);
  // The SDK has no public destroy API and may finish an asynchronous mount later.
  // Detach its old target so that a retry cannot inherit a late, duplicate iframe.
  const replacement = target.cloneNode(false);
  replacement.hidden = true;
  target.replaceWith(replacement);
  target = replacement;
  if (script) {
   script.onload = script.onerror = null;
   script.remove();
   script = null;
  }
  button.hidden = false;
  button.disabled = false;
  button.textContent = 'ניסיון נוסף';
  status.textContent = 'לא הצלחנו לטעון את התגובות. אפשר לנסות שוב.';
 }

 function ready(token) {
  if (token !== attempt || state !== 'loading' || !callbackObserved || !frameReady) return;
  const frame = currentFrame();
  if (!frame) return;
  state = 'ready';
  clearDeadline();
  flags(false, true);
  frame.setAttribute('title', 'תגובות למאמר');
  const moveFocus = document.activeElement === button;
  button.hidden = true;
  button.disabled = true;
  button.textContent = label;
  status.textContent = 'אזור התגובות נפתח.';
  if (typeof window.__semio__gcSetLang === 'function') {
   try { window.__semio__gcSetLang('he'); } catch { /* The account language remains the fallback. */ }
  }
  if (moveFocus) frame.focus();
 }

 // Correlate the vendor's global ready callback with this attempt's actual iframe.
 // No comment-submission messages, comment content or author information are used.
 window.addEventListener('message', event => {
  if (state !== 'loading' || event.origin !== 'https://graphcomment.com') return;
  const frame = currentFrame();
  if (!frame || event.source !== frame.contentWindow) return;
  let message;
  try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; }
  catch { return; }
  if (!message || message.name !== 'gc-ready') return;
  frameReady = true;
  ready(attempt);
 });

 function initialize(token) {
  if (token !== attempt || state !== 'loading') return;
  if (typeof window.__semio__gc_graphlogin !== 'function') {
   failed(token);
   return;
  }
  try {
   window.__semio__gc_graphlogin({
    graphcommentId: siteId,
    behaviour: {
     uid: 'derech-article:' + slug,
     url,
     readonly: false,
     sort: 'oldest',
     countPerPage: 10
    }
   });
  } catch { failed(token); }
 }

 button.addEventListener('click', () => {
  if (state !== 'idle') return;
  state = 'loading';
  const token = ++attempt;
  callbackObserved = frameReady = false;
  flags(true, false);
  button.disabled = true;
  status.textContent = 'טוענים את התגובות…';
  target.hidden = false;
  target.setAttribute('dir', 'rtl');
  target.setAttribute('lang', 'he');
  const loaded = () => {
   if (token !== attempt || state !== 'loading') return;
   callbackObserved = true;
   ready(token);
  };
  // The guide uses onGcLoaded; the current SDK resolves the prefixed alias.
  window.onGcLoaded = window.__semio__onGcLoaded = loaded;
  timeout = setTimeout(() => failed(token), 20000);
  if (typeof window.__semio__gc_graphlogin === 'function') {
   initialize(token);
   return;
  }
  script = document.createElement('script');
  script.src = 'https://integration.graphcomment.com/gc_graphlogin.js';
  script.async = script.defer = true;
  script.referrerPolicy = 'no-referrer';
  script.onload = () => initialize(token);
  script.onerror = () => failed(token);
  try { document.head.append(script); }
  catch { failed(token); }
 });
})();
