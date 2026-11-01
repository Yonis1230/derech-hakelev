/* Optional display controls. No external services or measurement are used. */
(() => {
 'use strict';
 const storageKey = 'derech-display-preferences-v1';
 const options = [
  {key: 'largeText', className: 'a11y-large-text', label: 'הגדלת טקסט'},
  {key: 'highContrast', className: 'a11y-high-contrast', label: 'ניגודיות גבוהה'},
  {key: 'highlightLinks', className: 'a11y-links', label: 'הדגשת קישורים'}
 ];

 function init() {
  if (document.getElementById('accessibility-trigger')) return;
  let preferences = Object.fromEntries(options.map(option => [option.key, false]));
  try {
   const saved = JSON.parse(localStorage.getItem(storageKey));
   if (saved && typeof saved === 'object' && !Array.isArray(saved)
    && Object.keys(saved).length === options.length
    && options.every(option => typeof saved[option.key] === 'boolean')) {
    preferences = Object.fromEntries(options.map(option => [option.key, saved[option.key]]));
   }
  } catch { /* Display controls also work without browser storage. */ }

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'accessibility-trigger';
  trigger.className = 'accessibility-trigger';
  trigger.setAttribute('aria-label', 'אפשרויות נגישות');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'accessibility-menu');
  trigger.setAttribute('aria-expanded', 'false');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'accessibility-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  head.setAttribute('cx', '12');
  head.setAttribute('cy', '4');
  head.setAttribute('r', '2');
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  body.setAttribute('d', 'M4 8l8 2 8-2M12 10v5m0 0-4 7m4-7 4 7');
  icon.append(head, body);
  trigger.append(icon);

  const dialog = document.createElement('dialog');
  dialog.id = 'accessibility-menu';
  dialog.className = 'accessibility-dialog';
  dialog.setAttribute('aria-labelledby', 'accessibility-title');
  dialog.setAttribute('data-clarity-mask', 'true');
  const heading = document.createElement('div');
  heading.className = 'accessibility-heading';
  const title = document.createElement('h2');
  title.id = 'accessibility-title';
  title.textContent = 'אפשרויות נגישות';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'accessibility-close';
  close.textContent = 'סגירה';
  heading.append(title, close);

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'accessibility-options';
  const legend = document.createElement('legend');
  legend.textContent = 'התאמת התצוגה';
  fieldset.append(legend);
  const inputs = new Map();
  for (const option of options) {
   const label = document.createElement('label');
   const input = document.createElement('input');
   input.type = 'checkbox';
   input.setAttribute('data-a11y-option', option.key);
   const text = document.createElement('span');
   text.textContent = option.label;
   label.append(input, text);
   fieldset.append(label);
   inputs.set(option.key, input);
   input.addEventListener('change', () => {
    preferences[option.key] = input.checked;
    apply();
    persist();
    status.textContent = option.label + (input.checked ? ' הופעלה.' : ' בוטלה.');
   });
  }

  const actions = document.createElement('div');
  actions.className = 'accessibility-actions';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'accessibility-reset';
  reset.textContent = 'איפוס התצוגה';
  const statement = document.createElement('a');
  statement.className = 'accessibility-statement';
  statement.href = (document.body.dataset.base || '') + 'pages/accessibility/';
  statement.textContent = 'נגישות באתר ויצירת קשר';
  actions.append(reset, statement);
  const status = document.createElement('p');
  status.className = 'accessibility-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  dialog.append(heading, fieldset, actions, status);
  document.body.append(trigger, dialog);

  function apply() {
   for (const option of options) {
    const enabled = preferences[option.key];
    document.body.classList.toggle(option.className, enabled);
    inputs.get(option.key).checked = enabled;
   }
  }
  function persist() {
   try { localStorage.setItem(storageKey, JSON.stringify(preferences)); }
   catch { /* The current page remains usable when storage is blocked or full. */ }
  }
  trigger.addEventListener('click', () => {
   if (dialog.open) return;
   status.textContent = '';
   dialog.showModal();
   trigger.setAttribute('aria-expanded', 'true');
   close.focus({preventScroll: true});
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
   trigger.setAttribute('aria-expanded', 'false');
   trigger.focus({preventScroll: true});
  });
  reset.addEventListener('click', () => {
   preferences = Object.fromEntries(options.map(option => [option.key, false]));
   apply();
   try { localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
   status.textContent = 'התצוגה חזרה להגדרות המקוריות.';
  });
  apply();
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
 else init();
})();
