/* Synthetic integration checks; no browser, network or external account data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/scripts.js'), 'utf8');

function fixture({ homeImages = [], products = [], reducedMotion = false, withObserver = true, media = {}, staticVideo = false, consent = false } = {}) {
  const observers = [], timers = new Map(), images = [], imageRequests = [], frameRequests = [], caches = [];
  const documentEvents = new Map();
  let nextTimer = 1;
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.childNodes = []; this.attributes = {}; this.dataset = {}; this.parentNode = null; this.hidden = false; this.className = ''; this.textContent = ''; }
    get classList() { const node = this; return { contains(value) { return node.className.split(/\s+/).includes(value); }, add(value) { if (!this.contains(value)) node.className = (node.className + ' ' + value).trim(); }, remove(value) { node.className = node.className.split(/\s+/).filter(item => item !== value).join(' '); } }; }
    append(...nodes) { for (const node of nodes) { if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1); node.parentNode = this; this.childNodes.push(node); } }
    prepend(...nodes) { for (const node of [...nodes].reverse()) { if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1); node.parentNode = this; this.childNodes.unshift(node); } }
    before(node) { const parent=this.parentNode; assert(parent); node.parentNode=parent; parent.childNodes.splice(parent.childNodes.indexOf(this),0,node); }
    replaceWith(node) { const parent = this.parentNode; assert(parent, 'replaced image belongs to gallery'); const index = parent.childNodes.indexOf(this); if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1); parent.childNodes[index] = node; node.parentNode = parent; this.parentNode = null; }
    setAttribute(key, value) { value = String(value); this.attributes[key] = value; if (key === 'class') this.className = value; else if (key === 'id') this.id = value; else if (key === 'src') this.src = value; else if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value; }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; if (key === 'src') this._src = ''; }
    set src(value) { this._src = value; this.attributes.src = value; if (this.tagName === 'IFRAME') frameRequests.push(value); }
    get src() { return this._src || ''; }
    addEventListener(event, fn) { (this.events ||= new Map()).set(event, [...(this.events.get(event) || []), fn]); }
    click() { for (const fn of this.events?.get('click') || []) fn({ target: this }); }
    matches(selector) { const attribute = selector.match(/^([a-z]+)\[([^=]+)="([^"]+)"\]$/); if (attribute) return this.tagName === attribute[1].toUpperCase() && this.getAttribute(attribute[2]) === attribute[3]; const present = selector.match(/^([a-z]+)\[([^=]+)\]$/); if (present) return this.tagName === present[1].toUpperCase() && this.getAttribute(present[2]) !== null; if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1)); if (selector.startsWith('#')) return this.id === selector.slice(1); return this.tagName === selector.toUpperCase(); }
    querySelectorAll(selector) { if(selector.includes(','))return selector.split(',').flatMap(part=>this.querySelectorAll(part.trim())); return this.childNodes.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    set innerHTML(html) { this.childNodes = []; const stack = [this]; for (const match of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi)) { const tag = match[1].toLowerCase(); if (match[0][1] === '/') { if (stack.length > 1) stack.pop(); continue; } const child = makeElement(tag); for (const attr of match[2].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) child.setAttribute(attr[1], attr[3]); stack.at(-1).append(child); if (!['img','input','br','hr','meta','link','source'].includes(tag)) stack.push(child); } }
    scrollIntoView() {}
  }
  class MockImage extends Element {
    constructor() { super('img'); images.push(this); this.complete = false; this.naturalWidth = 0; }
    set src(value) { this._src = value; this.attributes.src = value; this.complete = false; imageRequests.push({ image: this, src: value }); }
    get src() { return this._src || ''; }
    decode() { return Promise.resolve(); }
  }
  function makeElement(tag) { return tag === 'img' ? new MockImage() : new Element(tag); }
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
  }
  class TrackedMap extends Map {
    constructor(...args) { super(...args); this.peak = this.size; caches.push(this); }
    set(key, value) { super.set(key, value); this.peak = Math.max(this.peak || 0, this.size); return this; }
  }
  const document = {
    body: makeElement('body'), hidden: false,
    createElement: makeElement,
    addEventListener(event, fn) { documentEvents.set(event, [...(documentEvents.get(event) || []), fn]); },
    querySelectorAll(selector) { return this.body.querySelectorAll(selector); },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    getElementById(id) { return this.body.querySelector('#' + id); }
  };
  document.body.dataset.base = '';
  if (homeImages.length) { const home = makeElement('div'); home.id = 'home-gallery'; document.body.append(home); }
  if (products.length) { const catalog = makeElement('div'); catalog.id = 'catalog'; document.body.append(catalog); }
  if (staticVideo) { const frame = makeElement('iframe'); frame.setAttribute('data-src', 'https://www.facebook.com/plugins/video.php?example'); document.body.append(frame); }
  const window = { DERECH_MEDIA: media, matchMedia: () => ({ matches: reducedMotion }) };
  const choices=new Map(consent ? [['derech-analytics-consent-v1','granted']] : []);
  const footer=makeElement('footer');footer.className='site-footer';document.body.append(footer);
  document.head=makeElement('head');document.dispatchEvent=event=>{for(const fn of documentEvents.get(event.type)||[])fn(event)};
  Element.prototype.closest=function(selector){
   if(selector==='[data-consent]')return this.dataset.consent ? this : this.parentNode?.closest(selector)||null;
   return this.matches(selector) ? this : this.parentNode?.closest(selector)||null;
  };
  Element.prototype.focus=function(options){document.activeElement=this;this.lastFocusOptions=options};
  if (withObserver) window.IntersectionObserver = Observer;
  const sandbox = { document, window, Image: MockImage, IntersectionObserver: withObserver ? Observer : undefined, Map: TrackedMap, Set, URL, location: { hash: '', href:'https://derech-hakelev.com/' }, requestAnimationFrame: fn => fn(), DERECH_CATALOG: products, DERECH_HOME_IMAGES: homeImages, setInterval: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms }); return id; }, clearInterval: id => timers.delete(id) };
  vm.runInNewContext(source, sandbox, { filename: 'docs/scripts.js' });
  sandbox.localStorage={getItem:key=>choices.get(key)??null,setItem:(key,value)=>choices.set(key,value),removeItem:key=>choices.delete(key)};
  sandbox.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail}};
  sandbox.location.hostname='derech-hakelev.com';sandbox.location.pathname='/pages/games/';sandbox.location.reload=()=>{sandbox.location.reloaded=(sandbox.location.reloaded||0)+1};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/analytics.js'),'utf8'),sandbox,{filename:'docs/analytics.js'});
  for (const fn of documentEvents.get('DOMContentLoaded') || []) fn();
  return {
    document, observers, timers, images, imageRequests, frameRequests, caches,
    getPreferences(){return window.DERECH_PRIVACY.getPreferences()},
    approve(){const panel=document.body.querySelector('.analytics-consent');const button=panel.querySelector('button');for(const fn of panel.events.get('click'))fn({target:button});},
    withdraw(){document.body.querySelector('.analytics-preferences').click()},
    reloads(){return sandbox.location.reloaded||0},
    gallery: document.body.querySelector('.gallery'),
    intersect(target, isIntersecting) { for (const observer of observers) if (observer.targets.has(target)) observer.callback([{ target, isIntersecting }]); },
    load(image, success = true) { image.complete = true; image.naturalWidth = success ? 1200 : 0; if (success) image.onload?.(); else image.onerror?.(); },
    async flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); },
    tick() { for (const { fn } of [...timers.values()]) fn(); },
    visibility(hidden) { document.hidden = hidden; for (const fn of documentEvents.get('visibilitychange') || []) fn(); }
  };
}


const product = id => ({id, name: id, price: 75, summary: 'Synthetic product', tag: '', images: [], details: '<p>Details</p><iframe src="https://www.youtube.com/embed/workbook" title="Workbook"></iframe>'});
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('PASS ' + name); }

check('minimal page without galleries, products or videos remains safe', () => {
 const env = fixture();
 assert.equal(env.frameRequests.length, 0);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, false);
 assert.equal(env.document.body.querySelector('.analytics-consent').querySelectorAll('button').length, 1);
});

check('real scripts-before-analytics order keeps both providers off before approval', () => {
 const env = fixture({staticVideo: true, products: [product('workbook')]});
 assert.equal(env.frameRequests.length, 0);
 assert.equal(env.getPreferences().analytics, false);
 assert.equal(env.getPreferences().externalMedia, false);
 assert.equal(env.document.body.querySelectorAll('.video-placeholder').length, 2);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, false);
 for (const frame of env.document.body.querySelectorAll('iframe')) {
  assert.equal(frame.src, '');
  assert.equal(frame.hidden, true);
  assert.equal(frame.loading, 'lazy');
 }
});

check('one-off video permission affects only the chosen player and does not approve analytics', () => {
 const env = fixture({staticVideo: true, products: [product('workbook')]});
 const card = env.document.getElementById('game-workbook');
 card.querySelector('.video-placeholder').querySelector('button').click();
 assert.equal(env.frameRequests.length, 1);
 assert.equal(env.frameRequests[0], 'https://www.youtube.com/embed/workbook');
 assert.equal(env.document.activeElement, card.querySelector('iframe'));
 assert.equal(JSON.stringify(card.querySelector('iframe').lastFocusOptions), '{"preventScroll":true}');
 assert.equal(env.getPreferences().analytics, false);
 assert.equal(env.getPreferences().externalMedia, false);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, false);
 const facebook = env.document.body.querySelectorAll('iframe').find(frame => frame.dataset.src.includes('facebook.com'));
 assert.equal(facebook.src, '');
 assert.equal(facebook.hidden, true);
});

check('approval releases remaining players once and does not reload an already active one-off player', () => {
 const env = fixture({staticVideo: true, products: [product('workbook')]});
 env.document.getElementById('game-workbook').querySelector('.video-placeholder').querySelector('button').click();
 env.approve();
 assert.equal(env.getPreferences().analytics, true);
 assert.equal(env.getPreferences().externalMedia, true);
 assert.equal(env.frameRequests.length, 2);
 assert.equal(env.document.head.querySelectorAll('script').length, 1);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, true);
 env.approve();
 assert.equal(env.frameRequests.length, 2);
 assert.equal(env.document.head.querySelectorAll('script').length, 1);
});

check('workbook preview stays outside collapsed details without duplicate players or notices', () => {
 const env = fixture({products: [product('workbook')]});
 const card = env.document.getElementById('game-workbook');
 const frame = card.querySelector('iframe');
 assert.equal(frame.parentNode.className, 'card-video');
 card.querySelector('.video-placeholder').querySelector('button').click();
 const toggle = card.querySelector('.detail-toggle');
 for (let i = 0; i < 4; i++) toggle.click();
 assert.equal(card.querySelector('.game-details').hidden, true);
 assert.equal(frame.src, 'https://www.youtube.com/embed/workbook');
 assert.equal(env.frameRequests.length, 1);
 assert.equal(card.querySelectorAll('iframe').length, 1);
 assert.equal(card.querySelectorAll('.video-placeholder').length, 1);
});

check('withdrawal unloads every mapped player before public change event and recorder reload', () => {
 const env = fixture({staticVideo: true, products: [product('workbook')]});
 env.document.getElementById('game-workbook').querySelector('.video-placeholder').querySelector('button').click();
 env.approve();
 let notified = false;
 env.document.addEventListener('derech:privacy-change', event => {
  if (event.detail.analytics) return;
  notified = true;
  assert.equal(env.reloads(), 0, 'Players must be unloaded before reloading');
  for (const frame of env.document.body.querySelectorAll('iframe')) {
   assert.equal(frame.src, '');
   assert.equal(frame.hidden, true);
  }
  for (const notice of env.document.body.querySelectorAll('.video-placeholder')) assert.equal(notice.hidden, false);
 });
 env.withdraw();
 assert.equal(notified, true);
 assert.equal(env.reloads(), 1);
 assert.equal(env.getPreferences().analytics, false);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, false);
 // The synthetic page remains in memory after reload(), allowing a one-off reset check.
 env.document.getElementById('game-workbook').querySelector('.video-placeholder').querySelector('button').click();
 assert.equal(env.frameRequests.length, 3);
 assert.equal(env.getPreferences().analytics, false);
});

check('stored approval is visible before the scripts DOM callback and initializes both players once', () => {
 const env = fixture({consent: true, staticVideo: true, products: [product('workbook')]});
 assert.equal(env.frameRequests.length, 2);
 assert.equal(env.getPreferences().externalMedia, true);
 assert.equal(env.document.body.querySelector('.analytics-consent').hidden, true);
 assert.equal(env.document.head.querySelectorAll('script').length, 1);
});

check('details-contained video unloads on close and reuses its single notice on reopening', () => {
 const env = fixture({products: [product('future-video-product')]});
 const card = env.document.getElementById('game-future-video-product');
 const frame = card.querySelector('iframe');
 const toggle = card.querySelector('.detail-toggle');
 assert.equal(env.frameRequests.length, 0);
 toggle.click();
 card.querySelector('.video-placeholder').querySelector('button').click();
 assert.equal(env.frameRequests.length, 1);
 toggle.click();
 assert.equal(frame.src, '');
 toggle.click();
 assert.equal(env.frameRequests.length, 2);
 assert.equal(card.querySelectorAll('.video-placeholder').length, 1);
});

check('later approval keeps a collapsed details player unloaded until its details reopen', () => {
 const env = fixture({products: [product('future-video-product')]});
 const card = env.document.getElementById('game-future-video-product');
 const frame = card.querySelector('iframe');
 const toggle = card.querySelector('.detail-toggle');
 toggle.click();
 toggle.click();
 env.approve();
 assert.equal(card.querySelector('.game-details').hidden, true);
 assert.equal(frame.src, '');
 assert.equal(frame.hidden, true);
 assert.equal(env.frameRequests.length, 0);
 toggle.click();
 assert.equal(frame.src, 'https://www.youtube.com/embed/workbook');
 assert.equal(frame.hidden, false);
 assert.equal(env.frameRequests.length, 1);
 toggle.click();
 env.approve();
 assert.equal(frame.src, '');
 assert.equal(env.frameRequests.length, 1);
 toggle.click();
 assert.equal(env.frameRequests.length, 2);
 assert.equal(card.querySelectorAll('.video-placeholder').length, 1);
});

console.log('\n' + checks.length + ' video privacy integration checks passed using real scripts.js + analytics.js in a synthetic DOM. No real network, native player rendering or browser accessibility is tested.');
