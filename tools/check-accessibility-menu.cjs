/* DOM interaction checks; native focus trapping/Escape still need browser QA. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/accessibility.js'), 'utf8');
const storageKey = 'derech-display-preferences-v1';
const defaults = {largeText: false, highContrast: false, highlightLinks: false};

function fixture({saved, blockedStorage = false, readyState = 'complete', base = '../../', seed = {}} = {}) {
 const storage = new Map(Object.entries(seed));
 if (saved !== undefined) storage.set(storageKey, saved);
 const storageOperations = [];
 const requests = [];
 const denyRequest = (...args) => { requests.push(args); throw new Error('Unexpected provider request'); };
 class Element {
  constructor(tagName, ownerDocument) {
   this.tagName = tagName.toUpperCase();
   this.ownerDocument = ownerDocument;
   this.attributes = new Map();
   this.children = [];
   this.events = new Map();
   this.dataset = {};
   this.checked = false;
   this.open = false;
   const classes = new Set();
   this.classList = {
    contains: name => classes.has(name),
    add: name => classes.add(name),
    toggle(name, force) {
     const enabled = force === undefined ? !classes.has(name) : Boolean(force);
     if (enabled) classes.add(name); else classes.delete(name);
     return enabled;
    }
   };
  }
  append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(name, fn) { this.events.set(name, [...(this.events.get(name) || []), fn]); }
  emit(name) {
   const event = {type: name, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }};
   for (const fn of this.events.get(name) || []) fn(event);
   return event;
  }
  focus(options) { this.ownerDocument.activeElement = this; this.lastFocusOptions = options; }
  showModal() { assert.equal(this.open, false); this.open = true; this.modalOpenings = (this.modalOpenings || 0) + 1; }
  close() { if (!this.open) return; this.open = false; this.emit('close'); }
 }
 const document = {
  readyState,
  events: new Map(),
  createElement(tagName) { assert(!['SCRIPT', 'IFRAME', 'IMG'].includes(tagName.toUpperCase()), 'Menu must not introduce external resources'); return new Element(tagName, this); },
  createElementNS(namespace, tagName) { assert.equal(namespace, 'http://www.w3.org/2000/svg'); return new Element(tagName, this); },
  addEventListener(name, fn) { this.events.set(name, [...(this.events.get(name) || []), fn]); },
  getElementById(id) { return descendants(this.body).find(node => node.id === id) || null; }
 };
 document.body = new Element('body', document);
 document.body.dataset.base = base;
 document.body.classList.add('existing-site-class');
 const unrelated = document.createElement('main');
 unrelated.id = 'existing-content';
 document.body.append(unrelated);
 document.activeElement = unrelated;
 const localStorage = {};
 for (const [method, operation] of Object.entries({getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)})) {
  localStorage[method] = (...args) => {
   storageOperations.push({method, key: args[0]});
   if (blockedStorage) throw new Error('Storage blocked');
   return operation(...args);
  };
 }
 const context = vm.createContext({document, localStorage, fetch: denyRequest, XMLHttpRequest: denyRequest, navigator: {sendBeacon: denyRequest}, window: {clarity: denyRequest}});
 const run = () => vm.runInContext(source, context, {filename: 'docs/accessibility.js'});
 run();
 const all = () => descendants(document.body);
 return {
  document, storage, storageOperations, requests, run, unrelated,
  ready() { document.readyState = 'complete'; for (const listener of document.events.get('DOMContentLoaded') || []) listener(); },
  byClass(name) { return all().find(node => (node.className || '').split(' ').includes(name)); },
  inputs() { return all().filter(node => node.tagName === 'INPUT'); },
  input(key) { return all().find(node => node.getAttribute('data-a11y-option') === key); },
  get trigger() { return document.getElementById('accessibility-trigger'); },
  get dialog() { return document.getElementById('accessibility-menu'); },
  click(node) { node.emit('click'); },
  toggle(key, value) { const input = this.input(key); input.checked = value; input.emit('change'); },
  escape() { if (this.dialog.open && !this.dialog.emit('cancel').defaultPrevented) this.dialog.close(); }
 };
}
function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

test('initialization waits for DOM, is idempotent, and never steals initial focus', () => {
 const env = fixture({readyState: 'loading'});
 assert.equal(env.trigger, null);
 env.ready();
 assert(env.trigger);
 assert.equal(env.document.activeElement, env.unrelated);
 const trigger = env.trigger;
 env.run();
 env.ready();
 assert.equal(env.trigger, trigger);
 assert.equal(descendants(env.document.body).filter(node => node.tagName === 'DIALOG').length, 1);
 assert.equal(env.document.body.classList.contains('existing-site-class'), true);
});

test('controls have native labels, accessible dialog relationship, decorative SVG and masked preferences', () => {
 const env = fixture();
 assert.equal(env.trigger.type, 'button');
 assert.equal(env.trigger.getAttribute('aria-label'), 'אפשרויות נגישות');
 assert.equal(env.trigger.getAttribute('aria-haspopup'), 'dialog');
 assert.equal(env.trigger.getAttribute('aria-controls'), env.dialog.id);
 assert.equal(env.dialog.getAttribute('data-clarity-mask'), 'true');
 assert.equal(env.document.getElementById(env.dialog.getAttribute('aria-labelledby')).textContent, 'אפשרויות נגישות');
 const icon = env.trigger.children[0];
 assert.equal(icon.tagName, 'SVG');
 assert.equal(icon.getAttribute('aria-hidden'), 'true');
 assert.equal(icon.getAttribute('focusable'), 'false');
 assert.equal(env.inputs().length, 3);
 for (const input of env.inputs()) {
  assert.equal(input.type, 'checkbox');
  assert.equal(input.parentNode.tagName, 'LABEL');
  assert(input.parentNode.children.some(node => node.tagName === 'SPAN' && node.textContent));
  assert.equal(input.parentNode.parentNode.tagName, 'FIELDSET');
 }
 const status = env.byClass('accessibility-status');
 assert.equal(status.getAttribute('role'), 'status');
 assert.equal(status.getAttribute('aria-live'), 'polite');
});

test('opening, repeated opening, close button and native Escape lifecycle restore focus without scrolling', () => {
 const env = fixture();
 env.click(env.trigger);
 assert.equal(env.dialog.open, true);
 assert.equal(env.trigger.getAttribute('aria-expanded'), 'true');
 assert.equal(env.document.activeElement, env.byClass('accessibility-close'));
 env.click(env.trigger);
 assert.equal(env.dialog.modalOpenings, 1);
 env.click(env.byClass('accessibility-close'));
 assert.equal(env.dialog.open, false);
 assert.equal(env.trigger.getAttribute('aria-expanded'), 'false');
 assert.equal(env.document.activeElement, env.trigger);
 assert.equal(env.trigger.lastFocusOptions.preventScroll, true);
 env.click(env.trigger);
 env.escape();
 assert.equal(env.dialog.open, false);
 assert.equal(env.document.activeElement, env.trigger);
});

test('each option independently updates display, native checked state and only approved boolean storage', () => {
 const env = fixture();
 const cases = [['largeText', 'a11y-large-text'], ['highContrast', 'a11y-high-contrast'], ['highlightLinks', 'a11y-links']];
 for (const [key, className] of cases) {
  env.toggle(key, true);
  assert(env.document.body.classList.contains(className));
  assert.equal(env.input(key).checked, true);
  assert.equal(JSON.parse(env.storage.get(storageKey))[key], true);
 }
 assert.deepEqual(JSON.parse(env.storage.get(storageKey)), {largeText: true, highContrast: true, highlightLinks: true});
 env.toggle('highContrast', false);
 assert.equal(env.document.body.classList.contains('a11y-high-contrast'), false);
 assert.equal(env.document.body.classList.contains('a11y-large-text'), true);
 assert.match(env.byClass('accessibility-status').textContent, /בוטלה/);
 assert(env.storageOperations.every(operation => operation.key === storageKey));
});

test('valid preferences survive a new page and statement links respect nested page base paths', () => {
 const preferences = {largeText: true, highContrast: false, highlightLinks: true};
 const env = fixture({saved: JSON.stringify(preferences), base: '../../../../'});
 assert(env.document.body.classList.contains('a11y-large-text'));
 assert.equal(env.document.body.classList.contains('a11y-high-contrast'), false);
 assert(env.input('highlightLinks').checked);
 assert.equal(env.byClass('accessibility-statement').href, '../../../../pages/accessibility/');
 assert.equal(fixture({base: './'}).byClass('accessibility-statement').href, './pages/accessibility/');
});

test('malformed, incomplete, excess, array and nonboolean preferences do not activate settings', () => {
 for (const saved of ['broken JSON', 'null', '[]', 'true', '{}', '{"largeText":true}', '{"largeText":"true","highContrast":false,"highlightLinks":false}', '{"largeText":true,"highContrast":false,"highlightLinks":false,"unexpected":"value"}']) {
  const env = fixture({saved});
  assert(env.inputs().every(input => input.checked === false));
  assert.equal(env.document.body.classList.contains('a11y-large-text'), false);
  assert.equal(env.document.body.classList.contains('a11y-high-contrast'), false);
  assert.equal(env.document.body.classList.contains('a11y-links'), false);
 }
});

test('reset clears saved settings, all three classes/checkboxes and announces completion', () => {
 const env = fixture({saved: JSON.stringify({largeText: true, highContrast: true, highlightLinks: true})});
 env.click(env.byClass('accessibility-reset'));
 assert(env.inputs().every(input => input.checked === false));
 assert.equal(env.storage.has(storageKey), false);
 assert.equal(env.document.body.classList.contains('a11y-large-text'), false);
 assert.equal(env.document.body.classList.contains('a11y-high-contrast'), false);
 assert.equal(env.document.body.classList.contains('a11y-links'), false);
 assert.match(env.byClass('accessibility-status').textContent, /המקוריות/);
 const reloaded = fixture({saved: env.storage.get(storageKey)});
 assert.deepEqual(Object.fromEntries(reloaded.inputs().map(input => [input.getAttribute('data-a11y-option'), input.checked])), defaults);
});

test('blocked storage permits opening, toggling, reset and closing without affecting cookie consent or requesting providers', () => {
 const seed = {'derech-analytics-consent-v1': 'granted', unrelated: 'preserve this'};
 const env = fixture({blockedStorage: true, seed});
 env.click(env.trigger);
 env.toggle('largeText', true);
 assert(env.document.body.classList.contains('a11y-large-text'));
 env.click(env.byClass('accessibility-reset'));
 env.escape();
 assert.equal(env.dialog.open, false);
 assert.equal(env.storage.get('derech-analytics-consent-v1'), 'granted');
 assert.equal(env.storage.get('unrelated'), 'preserve this');
 assert.equal(env.document.getElementById('existing-content'), env.unrelated);
 assert.equal(env.requests.length, 0);
});

console.log(`${count} accessibility menu checks passed. Browser keyboard, contrast and mobile layout checks remain separate.`);
