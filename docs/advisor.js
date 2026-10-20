import {QUESTIONS, recommendGames} from './advisor-data.js?v=20261020-multiple';

let dialog;
let content;
let progress;
let backButton;
let base = '';
let catalog = [];
let trigger;
let restoreFocus = true;
let step = 0;
let answers = {};
let drafts = {};

function element(tag, className, text) {
 const node = document.createElement(tag);
 if (className) node.className = className;
 if (text) node.textContent = text;
 return node;
}

function buildDialog() {
 dialog = document.createElement('dialog');
 dialog.className = 'game-advisor';
 dialog.setAttribute('aria-labelledby', 'game-advisor-title');
 dialog.setAttribute('data-clarity-mask', 'true');
 dialog.innerHTML = '<header class="game-advisor-header"><div><span class="eyebrow">בוחרים בדרך שלכם</span><h2 id="game-advisor-title">נמצא משחק למפגש הבא</h2></div><button type="button" class="game-advisor-close" aria-label="סגירת העזרה בבחירת משחק">×</button></header><p class="game-advisor-intro">ארבע שאלות קצרות שיעזרו לבחור מתוך המשחקים והכלים של דרך הכלב.</p><p class="game-advisor-progress" aria-live="polite"></p><div class="game-advisor-content"></div><nav class="game-advisor-nav" aria-label="ניווט בשאלון"><button type="button" class="game-advisor-back">חזרה לשאלה הקודמת</button><button type="button" class="game-advisor-reset">התחלה מחדש</button></nav>';
 content = dialog.querySelector('.game-advisor-content');
 progress = dialog.querySelector('.game-advisor-progress');
 backButton = dialog.querySelector('.game-advisor-back');
 dialog.querySelector('.game-advisor-close').addEventListener('click', () => dialog.close());
 backButton.addEventListener('click', () => { if (step > 0) { step--; render(); } });
 dialog.querySelector('.game-advisor-reset').addEventListener('click', () => { answers = {}; drafts = {}; step = 0; render(); });
 dialog.addEventListener('close', () => {
  document.body.classList.remove('game-advisor-open');
  if (restoreFocus && trigger?.isConnected) trigger.focus({preventScroll: true});
 });
 document.body.append(dialog);
}

function resultLink(product) {
 const link = element('a', 'button', 'לפרטים ולהזמנה ←');
 link.href = base + 'pages/games/index.html#game-' + product.id;
 link.addEventListener('click', event => {
  const target = document.getElementById('game-' + product.id);
  const details = document.getElementById('details-' + product.id);
  restoreFocus = false;
  dialog.close();
  if (target && details) {
   event.preventDefault();
   if (details.hidden) target.querySelector('.detail-toggle').click();
   history.pushState(null, '', link.href);
   target.setAttribute('tabindex', '-1');
   target.focus({preventScroll: true});
   target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
  }
 });
 return link;
}

function helpLink() {
 const link = element('a', 'game-advisor-help', 'אפשר גם להתייעץ איתי בוואטסאפ ↗');
 link.href = document.querySelector('.header-contact').href;
 return link;
}

function renderResults() {
 progress.textContent = 'סיימנו — אלה האפשרויות שכדאי להכיר';
 const heading = element('h3', '', 'משחקים שיכולים להתאים לבחירות שלכם');
 heading.tabIndex = -1;
 content.append(heading);
 const selected = QUESTIONS.map(question => {
  const value = answers[question.id];
  const values = Array.isArray(value) ? value : [value];
  return question.options.filter(item => values.includes(item.value)).map(item => item.label).join(', ');
 }).filter(Boolean);
 content.append(element('p', 'game-advisor-selection', selected.join(' · ')));
 const results = recommendGames(answers, catalog);
 if (!results.length) {
  content.append(element('p', 'game-advisor-empty', 'לא מצאתי כרגע הצעה שמתאימה לבחירות האלה. אפשר לשנות חלק מהבחירות או להתייעץ איתי, ואעזור למצוא כיוון.'));
 } else {
  const list = element('div', 'game-advisor-results');
  for (const {product, reason, ageNote} of results) {
   const card = element('article', 'game-advisor-result');
   card.append(element('h4', '', product.name));
   card.append(element('p', '', reason));
   if (ageNote) card.append(element('p', 'game-advisor-age', ageNote));
   const bottom = element('div', 'game-advisor-result-actions');
   bottom.append(element('span', 'price', product.price + ' ₪'));
   bottom.append(resultLink(product));
   card.append(bottom);
   list.append(card);
  }
  content.append(list);
 }
 content.append(helpLink());
 heading.focus({preventScroll: true});
}

function render() {
 content.replaceChildren();
 backButton.hidden = step === 0;
 dialog.scrollTop = 0;
 if (step === QUESTIONS.length) { renderResults(); return; }
 const question = QUESTIONS[step];
 progress.textContent = 'שאלה ' + (step + 1) + ' מתוך ' + QUESTIONS.length;
 const fieldset = element('fieldset', 'game-advisor-question');
 const legend = element('legend', '', question.title);
 legend.tabIndex = -1;
 fieldset.append(legend);
 const hint = element('p', 'game-advisor-hint', question.hint || (question.multiple ? 'אפשר לבחור יותר מתשובה אחת, ואז ללחוץ על ״המשך״.' : 'בחרו את האפשרות שמתאימה לכם.'));
 hint.id = 'game-advisor-hint';
 fieldset.setAttribute('aria-describedby', hint.id);
 fieldset.append(hint);
 const saved = drafts[question.id] ?? answers[question.id];
 const selected = Array.isArray(saved) ? [...saved] : saved ? [saved] : [];
 const choices = [];
 const options = element('div', 'game-advisor-options');
 const next = element('button', 'button game-advisor-next', step === QUESTIONS.length - 1 ? 'הצגת ההצעות ←' : 'המשך ←');
 next.type = 'button';
 function values() { return choices.filter(({input}) => input.checked).map(({input}) => input.value); }
 function syncChoices() {
  choices.forEach(({input, label}) => label.setAttribute('data-selected', String(input.checked)));
  next.disabled = !values().length;
 }
 for (const option of question.options) {
  const label = element('label', 'game-advisor-option');
  const input = document.createElement('input');
  input.type = question.multiple ? 'checkbox' : 'radio';
  input.name = 'advisor-' + question.id;
  input.value = option.value;
  input.checked = selected.includes(option.value);
  input.addEventListener('change', () => {
   if (input.checked && (!question.multiple || (question.id === 'age' && option.value === 'unsure'))) {
    choices.forEach(choice => { if (choice.input !== input) choice.input.checked = false; });
   } else if (input.checked && question.id === 'age') {
    choices.forEach(choice => { if (choice.input.value === 'unsure') choice.input.checked = false; });
   }
   const chosen = values();
   drafts[question.id] = question.multiple ? chosen : chosen[0];
   syncChoices();
  });
  label.append(input, element('span', '', option.label));
  choices.push({input, label});
  options.append(label);
 }
 next.addEventListener('click', () => {
  const chosen = values();
  if (!chosen.length) return;
  const previous = answers[question.id];
  const previousValues = Array.isArray(previous) ? previous : previous ? [previous] : [];
  const changed = chosen.length !== previousValues.length || chosen.some(value => !previousValues.includes(value));
  answers[question.id] = question.multiple ? [...chosen] : chosen[0];
  delete drafts[question.id];
  if (changed) for (const following of QUESTIONS.slice(step + 1)) { delete answers[following.id]; delete drafts[following.id]; }
  step++;
  render();
 });
 syncChoices();
 fieldset.append(options);
 fieldset.append(next);
 content.append(fieldset);
 legend.focus({preventScroll: true});
}

export function openGameAdvisor(options) {
 base = options.base || '';
 catalog = options.catalog || [];
 trigger = options.trigger;
 restoreFocus = true;
 if (!dialog) buildDialog();
 if (!dialog.open) dialog.showModal();
 document.body.classList.add('game-advisor-open');
 render();
}
