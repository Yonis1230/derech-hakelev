'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/article-share.js'), 'utf8');
const canonical = 'https://derech-hakelev.com/pages/articles/emotional-therapy-with-dogs/';
const title = 'מה זה בעצם טיפול רגשי בעזרת כלבים?';

function fixture({navigator = {}, urls = [canonical, canonical], titles = [title, title], preview = false} = {}) {
 class Element {
  constructor(attributes = {}) {
   this.attributes = attributes;
   this.hidden = true;
   this.disabled = false;
   this.textContent = '';
   this.handlers = {};
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  async click() { return this.handlers.click?.(); }
 }
 const sections = urls.map((url, index) => {
  const section = new Element({'data-share-url': url, 'data-share-title': titles[index], 'data-share-preview': String(preview)});
  section.children = Object.fromEntries(['copy', 'native', 'status', 'fallback', 'input'].map(name => [name, new Element()]));
  section.querySelector = selector => section.children[selector.match(/^\[data-share-(.+)\]$/)[1]];
  return section;
 });
 const forbidden = () => { throw new Error('Sharing must not access browsing location, storage, network or measurement'); };
 const sandbox = {
  document: {querySelectorAll(selector) { assert.equal(selector, '[data-article-share]'); return sections; }},
  navigator,
  fetch: forbidden,
  localStorage: new Proxy({}, {get: forbidden}),
  dataLayer: new Proxy({}, {get: forbidden}),
  window: new Proxy({}, {get: forbidden}),
  get location() { return forbidden(); }
 };
 vm.runInNewContext(source, sandbox, {filename: 'docs/article-share.js'});
 return sections.map(section => section.children);
}

test('both article controls copy only the canonical URL after a click', async () => {
 const written = [];
 const sections = fixture({navigator: {clipboard: {async writeText(value) { written.push(value); }}}});
 assert.equal(written.length, 0);
 for (const section of sections) {
  assert.equal(section.copy.hidden, false);
  assert.equal(section.native.hidden, true);
  await section.copy.click();
  assert.equal(section.status.textContent, 'הקישור הועתק');
  assert.equal(section.fallback.hidden, true);
  assert.equal(section.copy.disabled, false);
 }
 assert.deepEqual(written, [canonical, canonical]);
});

test('the authored /articles/ address supports sharing and rejects private query data', async () => {
 const url = 'https://derech-hakelev.com/articles/benefits-of-dogs-for-humans/';
 const copied = [], shared = [];
 const controls = fixture({urls: [url, url + '?private=secret'], navigator: {
  clipboard: {async writeText(value) { copied.push(value); }},
  async share(payload) { shared.push({...payload}); }
 }});
 assert.equal(controls[0].copy.hidden, false);
 assert.equal(controls[0].native.hidden, false);
 assert.equal(controls[1].copy.hidden, true);
 assert.equal(controls[1].native.hidden, true);
 await controls[0].copy.click();
 await controls[0].native.click();
 assert.deepEqual(copied, [url]);
 assert.deepEqual(shared, [{title, text: title, url}]);
});

test('native share passes the approved title and canonical URL without tracking', async () => {
 const shared = [];
 const sections = fixture({navigator: {canShare: payload => payload.url === canonical, async share(payload) { shared.push({...payload}); }}});
 assert.equal(shared.length, 0);
 for (const section of sections) {
  assert.equal(section.native.hidden, false);
  await section.native.click();
  assert.equal(section.status.textContent, 'אפשרויות השיתוף נפתחו');
  assert.equal(section.native.disabled, false);
 }
 assert.deepEqual(shared, [{title, text: title, url: canonical}, {title, text: title, url: canonical}]);
});

test('canceling native share is silent and does not copy or open a fallback', async () => {
 const [section] = fixture({navigator: {
  async share() { throw Object.assign(new Error('Canceled'), {name: 'AbortError'}); },
  clipboard: {writeText() { assert.fail('Cancel must not copy'); }}
 }});
 await section.native.click();
 assert.equal(section.status.textContent, '');
 assert.equal(section.fallback.hidden, true);
 assert.equal(section.input.focused, undefined);
 assert.equal(section.native.disabled, false);
});

for (const denied of [false, true]) {
 test(`clipboard ${denied ? 'denial' : 'absence'} provides a focused, selected, read-only canonical URL`, async () => {
  const navigator = denied ? {clipboard: {async writeText() { throw new Error('Denied'); }}} : {};
  const [section] = fixture({navigator});
  await section.copy.click();
  assert.equal(section.fallback.hidden, false);
  assert.equal(section.input.value, canonical);
  assert.equal(section.input.readOnly, true);
  assert.equal(section.input.focused, true);
  assert.equal(section.input.selected, true);
  assert.match(section.status.textContent, /העתיקו/);
  assert.equal(section.copy.disabled, false);
 });
}

test('native sharing error offers manual sharing without claiming delivery', async () => {
 const [section] = fixture({navigator: {async share() { throw new Error('Unavailable'); }}});
 await section.native.click();
 assert.equal(section.fallback.hidden, false);
 assert.equal(section.input.selected, true);
 assert.equal(section.status.textContent, 'אפשר לשתף באמצעות העתקת הקישור מהשדה.');
 assert.equal(section.native.disabled, false);
});

test('native share remains hidden if canShare rejects the payload or throws', () => {
 for (const canShare of [() => false, () => { throw new Error('Unavailable'); }]) {
  const [section] = fixture({navigator: {canShare, share() { assert.fail('Unavailable sharing must not run'); }}});
  assert.equal(section.native.hidden, true);
  assert.equal(section.copy.hidden, false);
 }
});

test('unapproved URL forms and missing titles cannot enable sharing', () => {
 const urls = [
  canonical + '?patient=private', canonical + '#private',
  canonical.replace('https:', 'http:'), canonical.replace('derech-hakelev.com', 'other.example'),
  canonical.replace('/articles/', '/games/'), '/pages/articles/local-draft/',
  'https://derech-hakelev.com@other.example/pages/articles/example/',
  canonical.replace('https://', 'https://user:password@'),
  canonical.replace('/emotional-therapy-with-dogs/', '/../'),
  canonical + ' ', canonical
 ];
 const titles = urls.map((_, index) => index === urls.length - 1 ? '   ' : title);
 for (const section of fixture({urls, titles, navigator: {share() { assert.fail(); }}})) {
  assert.equal(section.copy.hidden, true);
  assert.equal(section.native.hidden, true);
  assert.equal(section.copy.handlers.click, undefined);
 }
});

test('draft preview controls remain hidden even with a valid future public URL', () => {
 const sections = fixture({preview: true, navigator: {share() { assert.fail(); }}});
 for (const section of sections) {
  assert.equal(section.copy.hidden, true);
  assert.equal(section.native.hidden, true);
  assert.equal(section.copy.handlers.click, undefined);
 }
});
