/* Local, synthetic consent checks. No browser, network, real cookies or account data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/analytics.js'), 'utf8');
const preferenceKey = 'derech-privacy-preferences-v1';
const legacyKey = 'derech-analytics-consent-v1';
const plain = value => JSON.parse(JSON.stringify(value));

function site({stored = {}, hostname = 'derech-hakelev.com', base = '', storageBlocked = false, storageFull = false} = {}) {
 const storage = new Map(Object.entries(stored));
 const scripts = [], cookieWrites = [], focusCalls = [], timeline = [], documentListeners = new Map();
 let document;
 let reloads = 0;
 class Element {
  constructor(tag) {
   this.tagName = tag.toUpperCase();
   this.attributes = {};
   this.dataset = {};
   this.children = [];
   this.listeners = new Map();
   this.hidden = false;
   this.open = false;
   this.checked = false;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) {
   for (const child of children) {
    child.parentElement = this;
    child.isConnected = true;
    this.children.push(child);
   }
  }
  set innerHTML(value) {
   this.markup = value;
   this.children = [];
   const form = value.includes('<form>') ? new Element('form') : null;
   if (form) this.append(form);
   for (const match of value.matchAll(/<(input|button)\b([^>]*)>/g)) {
    const child = new Element(match[1]);
    const attributes = match[2];
    const name = attributes.match(/\bname="([^"]+)"/);
    if (name) child.name = name[1];
    const consent = attributes.match(/\bdata-consent="([^"]+)"/);
    if (consent) child.dataset.consent = consent[1];
    const action = attributes.match(/\bdata-privacy-action="([^"]+)"/);
    if (action) child.dataset.privacyAction = action[1];
    child.checked = /\bchecked\b/.test(attributes);
    child.disabled = /\bdisabled\b/.test(attributes);
    (form || this).append(child);
   }
  }
  querySelector(selector) {
   const descendants = this.children.flatMap(child => [child, ...child.descendants()]);
   if (selector === 'button') return descendants.find(child => child.tagName === 'BUTTON') || null;
   if (selector === 'form') return descendants.find(child => child.tagName === 'FORM') || null;
   const name = selector.match(/^\[name="([^"]+)"\]$/);
   if (name) return descendants.find(child => child.name === name[1]) || null;
   const action = selector.match(/^\[data-privacy-action="([^"]+)"\]$/);
   if (action) return descendants.find(child => child.dataset.privacyAction === action[1]) || null;
   throw new Error('Unsupported synthetic selector: ' + selector);
  }
  descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
  closest(selector) {
   if (selector === '[data-consent]') return this.dataset.consent ? this : this.parentElement?.closest(selector) || null;
   if (selector === '[data-privacy-action]') return this.dataset.privacyAction ? this : this.parentElement?.closest(selector) || null;
   if (selector === '[hidden]') return this.hidden ? this : this.parentElement?.closest(selector) || null;
   return null;
  }
  addEventListener(type, listener) {
   if (!this.listeners.has(type)) this.listeners.set(type, []);
   this.listeners.get(type).push(listener);
  }
  emit(type, event = {}) {
   for (const listener of this.listeners.get(type) || []) listener({target: this, ...event});
  }
  focus(options) { focusCalls.push({element: this, options}); document.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
 }
 const body = new Element('body');
 body.dataset.base = base;
 const footer = new Element('footer');
 footer.isConnected = true;
 document = {
  body,
  activeElement: body,
  head: {append(script) { scripts.push(script); timeline.push('tag'); }},
  createElement(tag) { return new Element(tag); },
  querySelector(selector) { return selector === '.site-footer' ? footer : null; },
  getElementById() { return null; },
  addEventListener(type, listener) {
   if (!documentListeners.has(type)) documentListeners.set(type, []);
   documentListeners.get(type).push(listener);
  },
  dispatchEvent(event) {
   timeline.push(event.type);
   for (const listener of documentListeners.get(event.type) || []) listener(event);
  },
  set cookie(value) { cookieWrites.push(value); timeline.push('cookie-clear'); }
 };
 const location = {hostname, pathname: '/pages/games/', href: 'https://' + hostname + '/pages/games/#game-solutions', reload() { reloads++; timeline.push('reload'); }};
 const localStorage = {
  getItem(key) { if (storageBlocked) throw new Error('Storage disabled'); return storage.get(key) ?? null; },
  setItem(key, value) { if (storageBlocked || storageFull) throw new Error('Storage unavailable'); storage.set(key, value); },
  removeItem(key) { if (storageBlocked) throw new Error('Storage disabled'); storage.delete(key); }
 };
 const window = {};
 class CustomEvent {
  constructor(type, options) { this.type = type; this.detail = options.detail; }
 }
 vm.runInNewContext(source, {window, document, localStorage, location, CustomEvent, URL}, {filename: 'analytics.js'});
 const api = window.DERECH_PRIVACY;
 const initialize = () => document.dispatchEvent({type: 'DOMContentLoaded'});
 const panel = () => body.children.find(element => element.className === 'analytics-consent');
 const dialog = () => body.children.find(element => element.className === 'privacy-preferences-dialog');
 function approve() {
  const target = panel().querySelector('button');
  assert.equal(target.dataset.consent, 'granted');
  panel().emit('click', {target});
 }

 function contact() {
  api.trackEvent('contact_click', {button_id: 'contact_whatsapp', channel: 'whatsapp', placement: 'contact', text: 'synthetic_message'});
 }
 return {api, initialize, panel, dialog, approve, contact, scripts, cookieWrites, focusCalls, timeline, storage, location,
  openFooter() { footer.children[0].emit('click'); },
  get footerButton() { return footer.children[0]; },
  get reloads() { return reloads; },
  queue() { return plain((window.clarity?.q || []).map(args => Array.from(args))); }
 };
}

let passed = 0;
function check(name, test) { test(); passed++; console.log('PASS ' + name); }

check('fresh visit keeps notice visible and optional services off until approval', () => {
 const page = site();
 assert.deepEqual(plain(page.api.getPreferences()), {analytics: false, externalMedia: false});
 const copy = page.api.getPreferences(); copy.analytics = true;
 assert.equal(page.api.getPreferences().analytics, false);
 page.initialize(); page.contact(); page.contact();
 assert.equal(page.panel().hidden, false);
 assert.equal(page.scripts.length, 0);
 assert.equal(page.queue().length, 0);
 assert.equal(page.focusCalls.length, 0);
});

check('notice contains only the original approval button and no preference categories or dialog', () => {
 const page = site(); page.initialize();
 assert.equal((page.panel().markup.match(/<button\b/g) || []).length, 1);
 assert.ok(page.panel().markup.includes('>\u05d0\u05d9\u05e9\u05d5\u05e8</button>'));
 assert.ok(!page.panel().markup.includes('data-privacy-action'));
 assert.equal(page.dialog(), undefined);
});

check('approval enables both API permissions and loads exactly one unchanged production tag', () => {
 const page = site(); page.initialize(); page.approve(); page.contact();
 assert.deepEqual(plain(page.api.getPreferences()), {analytics: true, externalMedia: true});
 assert.equal(page.panel().hidden, true);
 assert.equal(page.storage.get(legacyKey), 'granted');
 assert.equal(page.storage.has(preferenceKey), false);
 assert.equal(page.scripts.length, 1);
 assert.equal(page.scripts[0].src, 'https://www.clarity.ms/tag/ywqq9e8u1f');
 assert.deepEqual(page.queue(), [
  ['consentv2', {analytics_Storage: 'granted', ad_Storage: 'denied'}],
  ['set', 'site_page', 'games'], ['event', 'contact_click_contact_whatsapp']
 ]);
 assert.ok(!JSON.stringify(page.queue()).includes('synthetic_message'));
 assert.equal(page.reloads, 0);
 assert.equal(page.focusCalls.length, 0, 'Approval must not move keyboard focus to the footer');
 page.approve();
 assert.equal(page.scripts.length, 1);
});

check('Clarity bridge accepts fixed actions only and drops arbitrary names and payload text', () => {
 const page = site({stored: {[legacyKey]: 'granted'}}); page.initialize();
 page.api.trackEvent('synthetic_message', {button_id: 'contact_whatsapp'});
 page.api.trackEvent('contact_click', {button_id: 'synthetic_message'});
 page.api.trackEvent('product_details_open', {product_id: 'synthetic_message'});
 page.api.trackEvent('product_details_open', {product_id: 'solutions', text: 'synthetic_message'});
 assert.deepEqual(page.queue().filter(item => item[0] === 'event'), [['event', 'product_details_open_solutions']]);
 assert.ok(!JSON.stringify(page.queue()).includes('synthetic_message'));
});

check('existing v1 approval is respected and unused unpublished granular storage is ignored', () => {
 const page = site({stored: {[legacyKey]: 'granted', [preferenceKey]: JSON.stringify({version: 1, analytics: false, externalMedia: false})}});
 page.initialize();
 assert.equal(page.panel().hidden, true);
 assert.deepEqual(plain(page.api.getPreferences()), {analytics: true, externalMedia: true});
 assert.equal(page.scripts.length, 1);
});

check('denied, invalid and missing consent keep the original persistent notice visible', () => {
 for (const consent of ['denied', 'true', 'unexpected', null]) {
  const page = site({stored: consent === null ? {} : {[legacyKey]: consent}}); page.initialize();
  assert.deepEqual(plain(page.api.getPreferences()), {analytics: false, externalMedia: false});
  assert.equal(page.panel().hidden, false);
  assert.equal(page.scripts.length, 0);
 }
});

check('original footer opens the notice before approval and does not create another UI', () => {
 const page = site(); page.initialize(); page.openFooter();
 assert.equal(page.panel().hidden, false);
 assert.equal(page.dialog(), undefined);
 assert.deepEqual(plain(page.focusCalls.at(-1).options), {preventScroll: true});
 assert.equal(page.focusCalls.at(-1).element, page.panel().querySelector('button'));
 assert.equal(page.scripts.length, 0);
});

check('API opens the same notice and subscriptions can be removed safely', () => {
 const page = site(); page.api.openPreferences(); page.initialize();
 page.api.openPreferences();
 assert.equal(page.panel().hidden, false);
 const values = [];
 page.api.subscribe(() => { throw new Error('Isolated failing consumer'); });
 const unsubscribe = page.api.subscribe(value => values.push(plain(value)));
 page.approve(); unsubscribe(); page.openFooter();
 assert.deepEqual(values, [{analytics: true, externalMedia: true}]);
 assert.equal(page.reloads, 1);
});

check('footer withdrawal notifies consumers before reload and clears only known first-party cookies', () => {
 const page = site({stored: {[legacyKey]: 'granted'}, hostname: 'www.derech-hakelev.com'}); page.initialize();
 const notices = [];
 page.api.subscribe(value => { notices.push(plain(value)); page.timeline.push('consumer'); });
 page.openFooter(); page.contact();
 assert.equal(page.reloads, 1);
 assert.equal(page.location.href, 'https://www.derech-hakelev.com/pages/games/#game-solutions');
 assert.deepEqual(notices, [{analytics: false, externalMedia: false}]);
 assert.ok(page.timeline.indexOf('consumer') < page.timeline.indexOf('reload'));
 assert.deepEqual(page.queue().slice(-2), [['consentv2', {analytics_Storage: 'denied', ad_Storage: 'denied'}], ['consent', false]]);
 assert.ok(page.cookieWrites.length > 0);
 assert.ok(page.cookieWrites.every(value => /^_cl(?:ck|sk)=; Max-Age=0;/.test(value)));
 assert.ok(page.cookieWrites.some(value => value.endsWith('path=/; domain=.derech-hakelev.com')));
 assert.ok(page.cookieWrites.some(value => value.endsWith('path=/pages/games/')));
 assert.equal(page.storage.get(legacyKey), 'denied');
 assert.equal(page.panel().hidden, false);
});

check('local preview and lookalike hosts never send data, even after approval', () => {
 for (const hostname of ['localhost', '127.0.0.1', 'preview.example', 'derech-hakelev.com.example']) {
  const page = site({hostname}); page.initialize(); page.approve(); page.contact();
  assert.deepEqual(plain(page.api.getPreferences()), {analytics: true, externalMedia: true});
  assert.equal(page.scripts.length, 0);
  assert.equal(page.queue().length, 0);
  page.openFooter();
  assert.equal(page.reloads, 0);
 }
});

check('blocked storage retains this page choice and does not fail open on the next page', () => {
 const page = site({storageBlocked: true}); page.initialize();
 assert.equal(page.scripts.length, 0);
 page.approve();
 assert.equal(page.scripts.length, 1);
 assert.deepEqual(plain(page.api.getPreferences()), {analytics: true, externalMedia: true});
 page.openFooter();
 assert.equal(page.reloads, 1);
 assert.equal(page.storage.size, 0);
 const next = site({storageBlocked: true}); next.initialize();
 assert.equal(next.scripts.length, 0);
 assert.equal(next.panel().hidden, false);
});

check('full storage cannot restore stale v1 approval after withdrawal and reload', () => {
 const page = site({storageFull: true, stored: {[legacyKey]: 'granted'}});
 page.initialize();
 assert.equal(page.scripts.length, 1);
 page.openFooter();
 assert.equal(page.reloads, 1);
 assert.equal(page.storage.has(legacyKey), false);
 const next = site({stored: Object.fromEntries(page.storage)}); next.initialize();
 assert.equal(next.scripts.length, 0);
 assert.deepEqual(plain(next.api.getPreferences()), {analytics: false, externalMedia: false});
});

console.log('\n' + passed + ' consent checks passed. Real browser focus, cookie deletion and remote account receipt require browser checks.');
