/* Verify product-specific review associations, static fallbacks and the shared
 * browser renderer. Self-contained mock DOM checks do not replace browser QA.
 * Run after: node tools/build-product-pages.cjs
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const docs = path.resolve(__dirname, '../docs');
const source = filename => fs.readFileSync(path.join(docs, filename), 'utf8');
const dataContext = vm.createContext({window: {}});
for (const filename of ['catalog.js', 'game-testimonials-data.js', 'testimonials-data.js']) {
 vm.runInContext(source(filename), dataContext, {filename, timeout: 1000});
}
// Normalize VM arrays to this context before strict comparisons.
const catalog = JSON.parse(JSON.stringify(dataContext.window.DERECH_CATALOG));
const reviews = JSON.parse(JSON.stringify(dataContext.window.DERECH_GAME_TESTIMONIALS));
const therapy = JSON.parse(JSON.stringify(dataContext.window.DERECH_TESTIMONIALS));
const renderer = source('testimonials.js');
const expected = {
 solutions: ['game-solutions-b1', 'game-solutions-b2', 'game-solutions-b3', 'game-solutions-b4', 'game-solutions-b5', 'game-solutions-b6', 'game-review-01', 'game-review-02', 'game-review-05', 'game-review-06', 'game-review-12', 'game-review-13', 'game-review-18', 'game-review-26', 'game-review-27'],
 resilience: ['game-review-15', 'game-review-16', 'game-review-18', 'game-review-20'],
 drive: ['game-review-04', 'game-review-28'],
 world: ['game-review-09', 'game-review-11'],
 thoughts: [],
 emotions: ['game-general-f3', 'game-review-08', 'game-review-14'],
 derech: ['game-review-07'],
 workbook: ['game-review-21', 'game-review-22', 'game-review-23', 'game-review-25'],
 escape: []
};
const expectedIds = Object.values(expected).flat();
const sorted = values => [...values].sort();
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const expectedFor = productId => reviews.filter(review => expected[productId].includes(review.id));
const checks = [];
function test(name, run) { run(); checks.push(name); console.log('PASS ' + name); }

test('approved product associations cover 30 distinct reviews and 31 placements', () => {
 assert.equal(reviews.length, 46);
 assert.equal(new Set(reviews.map(review => review.id)).size, 46);
 assert.deepEqual(sorted(catalog.map(product => product.id)), sorted(Object.keys(expected)));
 for (const [productId, ids] of Object.entries(expected)) {
  const actual = reviews.filter(review => review.productIds?.includes(productId)).map(review => review.id);
  assert.deepEqual(sorted(actual), sorted(ids), productId + ': exact approved associations');
 }
 for (const review of reviews) {
  const approved = Object.entries(expected).filter(([, ids]) => ids.includes(review.id)).map(([id]) => id);
  assert.deepEqual(sorted(review.productIds || []), sorted(approved), review.id + ': no inferred product');
  if (review.productIds) assert.equal(new Set(review.productIds).size, review.productIds.length);
  for (const asset of [review.image, review.thumbnail]) {
   const resolved = path.resolve(docs, asset);
   assert.ok(resolved.startsWith(docs + path.sep) && fs.statSync(resolved).isFile(), review.id + ': real source asset');
  }
 }
 assert.equal(expectedIds.length, 31);
 assert.equal(new Set(expectedIds).size, 30);
 assert.equal(reviews.filter(review => !review.productIds?.length).length, 16);
 assert.deepEqual(sorted(reviews.find(review => review.id === 'game-review-18').productIds), ['resilience', 'solutions']);
});

test('generated pages expose every relevant quote and original-image link without JavaScript', () => {
 let placements = 0;
 for (const product of catalog) {
  const filename = path.join(docs, 'pages/games/products', product.id, 'index.html');
  const html = fs.readFileSync(filename, 'utf8');
  const section = html.match(/<section\b[^>]*id="product-testimonials"[^>]*>[\s\S]*?<\/section>/)?.[0];
  const items = expectedFor(product.id);
  if (!items.length) {
   assert.equal(section, undefined, product.id + ': no invented recommendations');
   assert.ok(!html.includes('game-testimonials-data.js'), product.id + ': no unnecessary review data');
   assert.ok(!html.includes('testimonials.js?'), product.id + ': no unnecessary carousel script');
  } else {
   assert.ok(section, product.id + ': static review section exists');
   assert.ok(!/\bhidden\b/.test(section.match(/^<section[^>]*>/)[0]));
   assert.ok(section.includes('data-testimonials-product="' + product.id + '"'));
   assert.ok(section.includes('data-testimonials-source="DERECH_GAME_TESTIMONIALS"'));
   assert.ok(section.includes('data-clarity-mask="true"'));
   assert.match(section, /<div class="testimonials-controls"[^>]*\bhidden\b/);
   assert.deepEqual([...section.matchAll(/data-testimonial-id="([^"]+)"/g)].map(match => match[1]), items.map(review => review.id), product.id + ': source ordering, no duplicates');
   for (const [index, item] of items.entries()) {
    assert.ok(section.includes('<blockquote class="testimonial-quote">' + escapeHtml(item.quote) + '</blockquote>'), item.id + ': exact static quote');
    assert.ok(section.includes('href="../../../../' + escapeHtml(item.image) + '"'), item.id + ': original link resolves from nested product route');
    if (index < 3) assert.ok(section.includes('src="../../../../' + escapeHtml(item.thumbnail) + '"'), item.id + ': initial lightweight thumbnail');
   }
   assert.match(html, /game-testimonials-data\.js\?[^"\s]+" defer><\/script>\s*<script src="\.\.\/\.\.\/\.\.\/\.\.\/testimonials\.js\?/);
   placements += items.length;
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
   const schema = JSON.parse(match[1]);
   assert.ok(!/"(?:aggregateRating|review|ratingValue)"\s*:/.test(JSON.stringify(schema)), product.id + ': no fabricated rating/review schema');
  }
 }
 assert.equal(placements, 31);
});

// Minimal DOM for the production testimonial renderer. It deliberately avoids
// external packages and artifact fixtures so this check works in a clean clone.
function setup({productId = null, sourceName = 'DERECH_GAME_TESTIMONIALS', mobile = false, gameData = reviews, therapyData = therapy, staticFallback = false} = {}) {
 const document = {readyState: 'complete', hidden: false};
 const requestedImages = [];
 class Element {
  constructor(tagName) {
   this.tagName = tagName.toUpperCase();
   this.attributes = new Map(); this.childNodes = []; this.parentNode = null;
   this.dataset = {}; this.events = new Map(); this.hidden = false; this.disabled = false;
   this._text = '';
   this.classList = {
    contains: value => this.className.split(/\s+/).includes(value),
    add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
    remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(' '); }
   };
  }
  setAttribute(name, value) {
   this.attributes.set(name, String(value));
   if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get src() { return this.getAttribute('src') || ''; }
  set src(value) { this.setAttribute('src', value); if (this.tagName === 'IMG') requestedImages.push(String(value)); }
  get textContent() { return this._text + this.childNodes.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  get isConnected() { return document.body.contains(this); }
  append(...children) { for (const child of children) { child.parentNode = this; this.childNodes.push(child); } }
  replaceChildren(...children) { for (const child of this.childNodes) child.parentNode = null; this.childNodes = []; this.append(...children); }
  contains(node) { for (let current = node; current; current = current.parentNode) if (current === this) return true; return false; }
  matches(selector) {
   if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
   if (selector.startsWith('#')) return this.id === selector.slice(1);
   const attribute = selector.match(/^(?:([a-z]+))?\[([^\]]+)\]$/i);
   if (attribute) return (!attribute[1] || this.tagName === attribute[1].toUpperCase()) && this.getAttribute(attribute[2]) !== null;
   return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) {
   const matches = [];
   for (const child of this.childNodes) { if (child.matches(selector)) matches.push(child); matches.push(...child.querySelectorAll(selector)); }
   return matches;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(name, listener) { this.events.set(name, [...(this.events.get(name) || []), listener]); }
  emit(name) { for (const listener of this.events.get(name) || []) listener({target: this}); }
  focus(options) { document.activeElement = this; this.lastFocusOptions = options; }
  showModal() { this.open = true; this.setAttribute('open', ''); this.querySelector('button')?.focus(); }
  close() { this.open = false; this.removeAttribute('open'); this.emit('close'); }
  scrollIntoView() {}
 }
 document.body = new Element('body');
 document.body.dataset.base = '../../../../';
 document.activeElement = document.body;
 document.createElement = tagName => new Element(tagName);
 document.querySelectorAll = selector => document.body.querySelectorAll(selector);
 document.querySelector = selector => document.body.querySelector(selector);
 document.getElementById = id => document.body.querySelector('#' + id);
 document.addEventListener = () => {};
 const section = new Element('section');
 section.id = 'product-testimonials';
 section.setAttribute('data-testimonials-source', sourceName);
 if (productId !== null) section.setAttribute('data-testimonials-product', productId);
 document.body.append(section);
 const stage = new Element('div'); stage.className = 'testimonials-stage'; stage.setAttribute('role', 'list'); section.append(stage);
 if (staticFallback) { const fallback = new Element('blockquote'); fallback.textContent = 'Fallback remains until successful rendering'; stage.append(fallback); }
 const controlGroup = new Element('div'); controlGroup.className = 'testimonials-controls'; controlGroup.hidden = true; section.append(controlGroup);
 const controls = {};
 for (const name of ['prev', 'next', 'pause']) { const button = new Element('button'); button.setAttribute('data-testimonials-' + name, ''); controlGroup.append(button); controls[name] = button; }
 const status = new Element('p'); status.setAttribute('data-testimonials-status', ''); section.append(status);
 const window = {
  DERECH_GAME_TESTIMONIALS: gameData, DERECH_TESTIMONIALS: therapyData,
  location: {hash: ''},
  // Reduced motion keeps manual transitions synchronous in these DOM checks.
  matchMedia: query => ({matches: query.includes('max-width') ? mobile : true, addEventListener() {}}),
  addEventListener() {}
 };
 let timer = 0;
 vm.runInNewContext(renderer, {document, window, queueMicrotask: callback => callback(), requestAnimationFrame: callback => callback(), setInterval: () => ++timer, clearInterval() {}, setTimeout: callback => { callback(); return ++timer; }, clearTimeout() {}}, {filename: 'docs/testimonials.js', timeout: 1000});
 return {
  document, section, stage, status, controls, controlGroup, requestedImages,
  quotes: () => stage.querySelectorAll('.testimonial-quote').map(element => element.textContent),
  press: button => { if (!button.disabled) { button.focus(); button.emit('click'); } },
  get viewer() { return document.body.querySelector('.testimonial-viewer'); }
 };
}

test('renderer shows only matching products on desktop and mobile, in shared-source order', () => {
 for (const [productId, ids] of Object.entries(expected)) {
  const items = expectedFor(productId);
  for (const mobile of [false, true]) {
   const env = setup({productId, mobile, staticFallback: true});
   assert.equal(env.section.hidden, items.length === 0, productId + ': section visibility');
   if (!items.length) { assert.equal(env.controlGroup.hidden, true); continue; }
   const pageSize = mobile ? 1 : 3;
   const count = Math.min(items.length, pageSize);
   assert.equal(env.controlGroup.hidden, items.length <= pageSize);
   assert.equal(env.section.getAttribute('data-clarity-mask'), 'true');
   assert.equal(env.stage.childNodes.length, count);
   assert.deepEqual(env.stage.childNodes.map(card => card.dataset.testimonialId), items.slice(0, count).map(item => item.id));
   assert.deepEqual(env.quotes(), items.slice(0, count).map(item => item.quote));
   assert.ok(env.status.textContent.endsWith(' / ' + items.length));
   for (const button of Object.values(env.controls)) assert.equal(button.disabled, items.length <= pageSize, productId + ': navigation availability');
   const seen = new Set();
   for (let page = 0; page < Math.ceil(items.length / pageSize); page++) {
    assert.ok(env.stage.childNodes.every(card => ids.includes(card.dataset.testimonialId)), productId + ': no unrelated review after navigation');
    for (const quote of env.quotes()) seen.add(quote);
    env.press(env.controls.next);
   }
   assert.deepEqual(sorted(seen), sorted(items.map(item => item.quote)), productId + ': every matching review reachable');
   assert.equal(env.viewer, null);
   assert.ok(env.requestedImages.every(image => image.startsWith('../../../../assets/optimized/')), productId + ': only nested lightweight thumbnails before open');
  }
  assert.equal(items.length, ids.length);
 }
});

test('unknown or empty product filters fail closed and never borrow general reviews', () => {
 for (const productId of ['', 'not-a-product', 'SOLUTIONS']) {
  const env = setup({productId});
  assert.equal(env.section.hidden, true);
  assert.equal(env.stage.childNodes.length, 0);
  assert.equal(env.requestedImages.length, 0);
  assert.equal(env.controlGroup.hidden, true);
 }
 const missing = setup({productId: 'solutions', gameData: null});
 assert.equal(missing.section.hidden, true);
 assert.equal(missing.requestedImages.length, 0);
});

test('catalogue remains unfiltered and therapy retains its independent complete dataset', () => {
 const all = setup({mobile: true});
 assert.equal(all.status.textContent, '1 / 46');
 const seen = new Set();
 for (let index = 0; index < 46; index++) { seen.add(all.quotes()[0]); all.press(all.controls.next); }
 assert.deepEqual(sorted(seen), sorted(reviews.map(review => review.quote)));
 const therapyPage = setup({sourceName: 'DERECH_TESTIMONIALS'});
 assert.deepEqual(therapyPage.quotes(), therapy.slice(0, 3).map(review => review.quote));
 assert.ok(therapyPage.status.textContent.endsWith(' / ' + therapy.length));
 assert.equal(therapyPage.quotes().some(quote => reviews.some(review => review.quote === quote)), false);
});

test('original viewer resolves nested full image and closes back to its opener without scrolling', () => {
 for (const productId of ['solutions', 'resilience', 'derech', 'workbook']) {
  const item = expectedFor(productId)[0];
  const env = setup({productId, mobile: true});
  const opener = env.stage.querySelector('button');
  env.press(opener);
  assert.equal(env.viewer.open, true);
  assert.equal(env.viewer.getAttribute('data-clarity-mask'), 'true');
  assert.equal(env.viewer.querySelector('.testimonial-viewer-image').src, '../../../../' + item.image);
  assert.ok(env.viewer.getAttribute('aria-label').includes(item.context));
  assert.ok(env.viewer.querySelector('.testimonial-viewer-image').alt.includes(item.quote));
  env.press(env.viewer.querySelector('.testimonial-viewer-close'));
  assert.equal(env.viewer.open, false);
  assert.equal(env.document.activeElement, opener);
  assert.equal(opener.lastFocusOptions.preventScroll, true);
  assert.equal(env.viewer.querySelector('.testimonial-viewer-image').src, '');
 }
});

console.log(JSON.stringify({checks: checks.length, products: catalog.length, reviewSections: 7, placements: 31, distinctMappedReviews: 30, generalCatalogueOnly: 16, status: 'passed', note: 'Mock DOM covers renderer behavior; native dialogs, CSS and touch require browser QA.'}));
