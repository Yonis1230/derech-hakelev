/* Reveal only authored article anchors when arriving from an article search. */
(() => {
 'use strict';

 function revealTarget() {
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); }
  catch { return; }
  if (!/^article-[a-z0-9-]+$/.test(id) || id.trim() !== id) return;

  const target = document.getElementById(id);
  if (!target || !target.classList.contains('article-anchor')) return;

  for (let parent = target.parentElement; parent; parent = parent.parentElement) {
   if (parent.tagName === 'DETAILS') parent.open = true;
  }
  target.focus({preventScroll: true});
  target.scrollIntoView({block: 'start', behavior: 'auto'});
 }

 window.addEventListener('hashchange', revealTarget);
 if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', revealTarget, {once: true});
 } else {
  revealTarget();
 }
})();
