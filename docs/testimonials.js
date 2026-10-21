(() => {
 'use strict';

 function init() {
  const section = document.getElementById('therapy-testimonials');
  if (!section) return;
  const stage = section.querySelector('.testimonials-stage');
  const previous = section.querySelector('[data-testimonials-prev]');
  const next = section.querySelector('[data-testimonials-next]');
  const pause = section.querySelector('[data-testimonials-pause]');
  const status = section.querySelector('[data-testimonials-status]');
  const items = (Array.isArray(window.DERECH_TESTIMONIALS) ? window.DERECH_TESTIMONIALS : []).filter(item =>
   item && ((typeof item.quote === 'string' && item.quote.trim()) || item.image)
  );
  if (!stage || !previous || !next || !pause || !status || !items.length) {
   section.hidden = true;
   return;
  }

  const base = document.body.dataset.base || '';
  const mobile = window.matchMedia('(max-width: 760px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pageSize = mobile.matches ? 1 : 3;
  let index = 0;
  let requestedIndex = 0;
  let visible = false;
  let hovered = false;
  let focusWithin = false;
  let playing = !reducedMotion.matches;
  let explicitResume = false;
  let timer;
  let fadeOut;
  let fadeIn;
  let transition = 0;
  let changing = false;
  let manualChange = false;
  let viewer;
  let viewerImage;
  let viewerCaption;
  let viewerText;
  let viewerStatus;
  let zoom;
  let returnFocus;

  section.setAttribute('data-clarity-mask', 'true');
  section.hidden = false;
  stage.setAttribute('aria-live', 'off');
  [previous, next, pause].forEach(button => { button.type = 'button'; });
  previous.setAttribute('aria-label', 'ההמלצות הקודמות');
  next.setAttribute('aria-label', 'ההמלצות הבאות');

  function wrap(value) { return (value + items.length) % items.length; }
  function blockedByDialog() {
   return document.body.classList.contains('game-advisor-open') ||
    document.body.classList.contains('testimonial-viewer-open') || Boolean(document.querySelector('dialog[open]'));
  }
  function canAutoplay() {
   const pauseOverride = explicitResume && document.activeElement === pause;
   return playing && visible && ((!hovered && !focusWithin) || pauseOverride) && !document.hidden &&
    items.length > pageSize && !blockedByDialog();
  }
  function cancelChange() {
   transition++;
   clearTimeout(fadeOut);
   clearTimeout(fadeIn);
   changing = false;
   requestedIndex = index;
   stage.classList.remove('is-changing');
  }
  function syncTimer() {
   clearInterval(timer);
   if (changing && !manualChange && !canAutoplay()) cancelChange();
   if (changing || !canAutoplay()) return;
   timer = setInterval(() => {
    if (!canAutoplay()) { syncTimer(); return; }
    move(1, false);
   }, 10000);
  }
  function labelPause() {
   pause.textContent = playing ? 'השהיה Ⅱ' : 'הפעלה ▶';
   pause.setAttribute('aria-label', playing ? 'השהיית המעבר האוטומטי בין ההמלצות' : 'הפעלת המעבר האוטומטי בין ההמלצות');
   pause.setAttribute('aria-pressed', String(!playing));
   [previous, next, pause].forEach(button => { button.disabled = items.length <= pageSize; });
  }

  function buildViewer() {
   viewer = document.createElement('dialog');
   viewer.className = 'testimonial-viewer';
   viewer.setAttribute('data-clarity-mask', 'true');
   const close = document.createElement('button');
   close.type = 'button';
   close.className = 'testimonial-viewer-close';
   close.textContent = '×';
   close.setAttribute('aria-label', 'סגירת ההמלצה המקורית');
   close.autofocus = true;
   close.addEventListener('click', () => viewer.close());
   viewerImage = document.createElement('img');
   viewerImage.className = 'testimonial-viewer-image';
   viewerImage.decoding = 'async';
   const media = document.createElement('div');
   media.className = 'testimonial-viewer-media';
   media.append(viewerImage);
   zoom = document.createElement('button');
   zoom.type = 'button';
   zoom.className = 'testimonial-viewer-zoom';
   function resetZoom() {
    viewerImage.classList.remove('is-zoomed');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = 'תצוגה בגודל המקורי';
   }
   zoom.addEventListener('click', () => {
    if (viewerImage.classList.contains('is-zoomed')) resetZoom();
    else {
     viewerImage.classList.add('is-zoomed');
     zoom.setAttribute('aria-pressed', 'true');
     zoom.textContent = 'התאמה למסך';
    }
   });
   resetZoom();
   viewerCaption = document.createElement('p');
   viewerCaption.className = 'testimonial-viewer-caption';
   viewerText = document.createElement('p');
   viewerText.className = 'testimonial-viewer-transcript';
   viewerStatus = document.createElement('p');
   viewerStatus.className = 'testimonial-viewer-status';
   viewerStatus.setAttribute('role', 'status');
   viewerImage.addEventListener('load', () => { viewerStatus.textContent = ''; });
   viewerImage.addEventListener('error', () => {
    if (viewer.open) viewerStatus.textContent = 'לא הצלחתי לטעון את התמונה. אפשר לסגור ולקרוא את ההמלצה באתר.';
   });
   const tools = document.createElement('div');
   tools.className = 'testimonial-viewer-tools';
   tools.append(close, zoom);
   viewer.append(tools, viewerCaption, media, viewerText, viewerStatus);
   viewer.addEventListener('close', () => {
    viewerImage.removeAttribute('src');
    resetZoom();
    document.body.classList.remove('testimonial-viewer-open');
    const target = returnFocus?.isConnected ? returnFocus : pause;
    returnFocus = null;
    target.focus({preventScroll: true});
    syncTimer();
   });
   document.body.append(viewer);
  }

  function openViewer(item, button) {
   if (!item.image) return;
   if (!viewer) buildViewer();
   returnFocus = button;
   viewer.setAttribute('aria-label', item.label ? 'המלצה מקורית — ' + item.label : 'המלצה מקורית');
   viewerCaption.textContent = item.label || '';
   viewerText.textContent = item.fullText || '';
   viewerText.hidden = !item.fullText;
   viewerStatus.textContent = '';
   viewerImage.alt = 'צילום ההמלצה המלאה' + (item.label ? ' — ' + item.label : '') + (!item.fullText && item.quote ? '. ' + item.quote : '');
   if (item.width) viewerImage.width = item.width;
   if (item.height) viewerImage.height = item.height;
   document.body.classList.add('testimonial-viewer-open');
   syncTimer();
   if (!viewer.open) viewer.showModal();
   viewerImage.src = base + item.image;
  }

  function card(item, itemIndex) {
   const article = document.createElement('article');
   article.className = 'testimonial-card';
   if (stage.getAttribute('role') === 'list') article.setAttribute('role', 'listitem');
   if (item.image) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'testimonial-open';
    button.dataset.testimonialIndex = String(itemIndex);
    button.setAttribute('aria-label', 'פתיחת ההמלצה המקורית' + (item.label ? ' — ' + item.label : ''));
    const openLabel = document.createElement('span');
    openLabel.className = 'testimonial-open-label';
    openLabel.textContent = 'לקריאת ההמלצה המלאה ↗';
    if (item.thumbnail) {
     const photo = document.createElement('img');
     photo.className = 'testimonial-photo';
     photo.alt = '';
     photo.loading = 'lazy';
     photo.decoding = 'async';
     if (item.width) photo.width = item.width;
     if (item.height) photo.height = item.height;
     photo.addEventListener('error', () => {
      openLabel.textContent = 'לקריאת ההמלצה';
      button.replaceChildren(openLabel);
     });
     photo.src = base + item.thumbnail;
     button.append(photo);
    }
    button.append(openLabel);
    button.addEventListener('click', () => openViewer(item, button));
    article.append(button);
   }
   if (typeof item.quote === 'string' && item.quote) {
    const quote = document.createElement('blockquote');
    quote.className = 'testimonial-quote';
    quote.textContent = item.quote;
    article.append(quote);
   }
   if (item.label) {
    const label = document.createElement('small');
    label.className = 'testimonial-source';
    label.textContent = item.label;
    article.append(label);
   }
   return article;
  }

  function render(start, userInitiated) {
   const count = Math.min(pageSize, items.length);
   const indices = Array.from({length: count}, (_, offset) => wrap(start + offset));
   stage.replaceChildren(...indices.map(itemIndex => card(items[itemIndex], itemIndex)));
   index = start;
   status.setAttribute('aria-live', userInitiated ? 'polite' : 'off');
   status.dir = 'ltr';
   status.textContent = (count === 1 ? String(start + 1) : indices[count - 1] >= start
    ? (start + 1) + '–' + (indices[count - 1] + 1) : indices.map(value => value + 1).join(', ')) + ' / ' + items.length;
  }

  function move(direction, userInitiated) {
   if (items.length <= pageSize) return;
   requestedIndex = wrap(requestedIndex + direction * pageSize);
   const token = ++transition;
   const destination = requestedIndex;
   clearTimeout(fadeOut);
   clearTimeout(fadeIn);
   clearInterval(timer);
   changing = true;
   manualChange = userInitiated;
   function commit() {
    if (token !== transition) return;
    render(destination, userInitiated);
    stage.classList.remove('is-changing');
    if (reducedMotion.matches) { changing = false; syncTimer(); return; }
    fadeIn = setTimeout(() => {
     if (token !== transition) return;
     changing = false;
     syncTimer();
    }, 90);
   }
   if (reducedMotion.matches) commit();
   else { stage.classList.add('is-changing'); fadeOut = setTimeout(commit, 90); }
  }

  previous.addEventListener('click', () => move(-1, true));
  next.addEventListener('click', () => move(1, true));
  pause.addEventListener('click', () => { playing = !playing; explicitResume = playing; labelPause(); syncTimer(); });
  section.addEventListener('mouseenter', () => { hovered = true; explicitResume = false; syncTimer(); });
  section.addEventListener('mouseleave', () => { hovered = false; syncTimer(); });
  section.addEventListener('focusin', event => { focusWithin = true; if (event.target !== pause) explicitResume = false; syncTimer(); });
  section.addEventListener('focusout', () => queueMicrotask(() => {
   focusWithin = section.contains(document.activeElement);
   syncTimer();
  }));
  document.addEventListener('visibilitychange', syncTimer);
  function resize() {
   pageSize = mobile.matches ? 1 : 3;
   cancelChange();
   render(index, false);
   labelPause();
   syncTimer();
  }
  if (mobile.addEventListener) mobile.addEventListener('change', resize);
  else window.addEventListener('resize', resize);
  if ('MutationObserver' in window) {
   const observer = new MutationObserver(records => {
    if (records.some(record => record.target === document.body || record.target.tagName === 'DIALOG')) syncTimer();
   });
   observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['class', 'open']});
  }
  render(0, false);
  labelPause();
  if ('IntersectionObserver' in window) {
   const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncTimer(); });
   observer.observe(section);
  } else { visible = true; syncTimer(); }
  const fragment = '#' + section.id;
  if (window.location?.hash === fragment) requestAnimationFrame(() => {
   if (window.location?.hash === fragment) section.scrollIntoView({block: 'start'});
  });
 }

 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
 else init();
})();
