// Exercises the production gallery and image helper, without a browser or network.
// Native focus behavior, touch targets and CSS layout still require browser checks.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/scripts.js'), 'utf8');
const imageStart = source.indexOf(' function image(');
const imageEnd = source.indexOf('\n const videos=', imageStart);
const galleryStart = source.indexOf(' function gallery(');
const galleryEnd = source.indexOf('\n function card(', galleryStart);
assert.ok(imageStart >= 0 && imageEnd > imageStart && galleryStart >= 0 && galleryEnd > galleryStart,
 'Production helper boundaries changed; update extraction rather than copying their implementation.');
const production = source.slice(imageStart, imageEnd) + '\n' + source.slice(galleryStart, galleryEnd)
 + '\nglobalThis.makeGallery = gallery;';
const filenames = Array.from({length: 50}, (_, index) => 'photo-' + index + '.webp');

function fixture({reducedMotion = false, withObserver = true, autoplay = 2000, count = 50, media = {}, base = ''} = {}) {
 const timers = new Map();
 const observers = [];
 const photos = [];
 const caches = [];
 const documentEvents = new Map();
 const motionEvents = new Map();
 let nextTimer = 0;
 class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null; this.attributes = {}; this.events = new Map(); this.className = ''; this.textContent = ''; }
  get classList() {
   const node = this;
   return {
    contains(name) { return node.className.split(/\s+/).includes(name); },
    add(name) { if (!this.contains(name)) node.className += ' ' + name; },
    remove(name) { node.className = node.className.split(/\s+/).filter(value => value !== name).join(' '); }
   };
  }
  append(...nodes) {
   for (const node of nodes) {
    if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    node.parentNode = this;
    this.children.push(node);
   }
  }
  replaceWith(node) {
   assert.ok(this.parentNode, 'the displayed image belongs to the gallery');
   const parent = this.parentNode;
   if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
   parent.children[parent.children.indexOf(this)] = node;
   node.parentNode = parent;
   this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { this.events.set(name, [...(this.events.get(name) || []), handler]); }
  dispatch(name, event = {}) { for (const handler of this.events.get(name) || []) handler(event); }
  click() { this.dispatch('click', {target: this}); }
  contains(target) { for (let node = target; node; node = node.parentNode) if (node === this) return true; return false; }
 }
 class Photo extends Element {
  constructor() { super('img'); this.complete = false; this.naturalWidth = 0; photos.push(this); }
  set src(value) { this._src = value; this.complete = false; }
  get src() { return this._src; }
  decode() { return Promise.resolve(); }
 }
 class Observer {
  constructor(handler) { this.handler = handler; this.target = null; observers.push(this); }
  observe(target) { this.target = target; }
 }
 class Cache extends Map {
  constructor(...args) { super(...args); caches.push(this); }
 }
 const document = {
  body: new Element('body'), hidden: false, activeElement: null,
  createElement: tag => tag === 'img' ? new Photo() : new Element(tag),
  addEventListener(name, handler) { documentEvents.set(name, [...(documentEvents.get(name) || []), handler]); }
 };
 const motion = {
  matches: reducedMotion,
  addEventListener(name, handler) { motionEvents.set(name, [...(motionEvents.get(name) || []), handler]); }
 };
 const window = {matchMedia: () => motion};
 if (withObserver) window.IntersectionObserver = Observer;
 const sandbox = {
  base, media, window, document, Image: Photo, IntersectionObserver: Observer, Map: Cache,
  setInterval(handler, milliseconds) { const id = ++nextTimer; timers.set(id, {handler, milliseconds}); return id; },
  clearInterval(id) { timers.delete(id); }
 };
 vm.runInNewContext(production, sandbox, {filename: 'production-gallery-from-docs/scripts.js'});
 const gallery = sandbox.makeGallery(filenames.slice(0, count), 'פעילות דרך הכלב', '', autoplay);
 const byClass = name => gallery.children.find(node => node.classList.contains(name));
 const env = {
  gallery, document, photos, caches, timers,
  image: () => gallery.children.find(node => node.tagName === 'IMG'),
  counter: () => byClass('gallery-count')?.textContent,
  next: () => byClass('next').click(), previous: () => byClass('prev').click(),
  playPause: () => byClass('gallery-autoplay').click(),
  pauseButton: () => byClass('gallery-autoplay'),
  load(photo, success = true) { assert.ok(photo, 'the requested image exists'); photo.complete = true; photo.naturalWidth = success ? 960 : 0; if (success) photo.onload?.(); else photo.onerror?.(); },
  requested(filename) { return [...photos].reverse().find(photo => photo.src.endsWith(filename)); },
  async flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); },
  tick() { for (const {handler} of [...timers.values()]) handler(); },
  visible(value) { observers.forEach(observer => observer.handler([{target: observer.target, isIntersecting: value}])); },
  hidden(value) { document.hidden = value; for (const handler of documentEvents.get('visibilitychange') || []) handler(); },
  focus(target) {
   const previous = document.activeElement;
   document.activeElement = target;
   if (gallery.contains(previous)) gallery.dispatch('focusout', {target: previous, relatedTarget: target});
   if (gallery.contains(target)) gallery.dispatch('focusin', {target, relatedTarget: previous});
  },
  hover(value) { gallery.dispatch(value ? 'mouseenter' : 'mouseleave'); },
  motion(value) { motion.matches = value; for (const handler of motionEvents.get('change') || []) handler({matches: value}); }
 };
 return env;
}

const results = [];
async function check(name, run) { await run(); results.push(name); console.log('PASS ' + name); }
async function ready(options) {
 const env = fixture(options);
 env.load(env.image());
 await env.flush();
 env.visible(true);
 await env.flush();
 return env;
}

(async () => {
 await check('two-second autoplay waits for loaded images and visible document, synchronizes picture/count and stops offscreen', async () => {
  const env = fixture();
  assert.equal(env.photos.length, 1);
  assert.equal(env.timers.size, 0);
  env.visible(true);
  assert.equal([...env.timers.values()][0].milliseconds, 2000);
  env.tick(); await env.flush();
  assert.equal(env.counter(), '1 / 50', 'an unloaded current image cannot advance');
  env.load(env.image()); await env.flush();
  env.tick(); await env.flush();
  assert.equal(env.counter(), '1 / 50', 'the next image must load before its number changes');
  env.load(env.requested(filenames[1])); await env.flush();
  assert.equal(env.image().src, filenames[1]);
  assert.equal(env.counter(), '2 / 50');
  env.visible(false); assert.equal(env.timers.size, 0);
  env.visible(true); assert.equal(env.timers.size, 1);
  env.hidden(true); assert.equal(env.timers.size, 0);
  env.hidden(false); assert.equal(env.timers.size, 1);
 });

 await check('hover and keyboard focus independently pause autoplay without resuming while the other remains', async () => {
  const env = await ready();
  env.hover(true); assert.equal(env.timers.size, 0);
  env.focus(env.gallery.children.find(node => node.className === 'next'));
  env.hover(false); assert.equal(env.timers.size, 0, 'focus still protects the gallery');
  env.focus(null); assert.equal(env.timers.size, 1);
  env.hover(true); env.focus(env.pauseButton()); env.focus(null);
  assert.equal(env.timers.size, 0, 'hover still protects the gallery');
  env.hover(false); assert.equal(env.timers.size, 1);
 });

 await check('explicit Play works while its button retains focus; later interaction pauses it and explicit Pause persists', async () => {
  const env = await ready();
  env.focus(env.pauseButton());
  env.playPause(); assert.equal(env.timers.size, 0);
  env.playPause(); assert.equal(env.timers.size, 1);
  env.focus(env.gallery.children.find(node => node.className === 'next'));
  assert.equal(env.timers.size, 0);
  env.playPause();
  env.focus(null); env.hover(true); env.hover(false); env.hidden(true); env.hidden(false);
  assert.equal(env.timers.size, 0, 'passive events never undo an explicit pause');
 });

 await check('reduced motion starts paused, manual arrows still work and a runtime preference change stops active autoplay', async () => {
  const reduced = await ready({reducedMotion: true});
  assert.equal(reduced.timers.size, 0);
  reduced.next(); reduced.load(reduced.requested(filenames[1])); await reduced.flush();
  assert.equal(reduced.counter(), '2 / 50');
  assert.equal(reduced.timers.size, 0);
  const active = await ready();
  assert.equal(active.timers.size, 1);
  active.motion(true); assert.equal(active.timers.size, 0);
  active.motion(false); active.hidden(true); active.hidden(false);
  assert.equal(active.timers.size, 0, 'removing the preference does not silently restart animation');
 });

 await check('rapid arrows commit only the latest loaded image and its number; failed loads preserve the displayed picture and can retry', async () => {
  const env = await ready({autoplay: 0});
  const original = env.image();
  env.next(); const first = env.requested(filenames[1]);
  env.next(); const second = env.requested(filenames[2]);
  env.load(second); await env.flush();
  assert.equal(env.image(), second); assert.equal(env.counter(), '3 / 50');
  env.load(first); await env.flush();
  assert.equal(env.image(), second); assert.equal(env.counter(), '3 / 50');
  assert.notEqual(env.image(), original);
  env.next(); env.load(env.requested(filenames[3]), false); await env.flush();
  assert.equal(env.image(), second); assert.equal(env.counter(), '3 / 50');
  env.next(); env.load(env.requested(filenames[3])); await env.flush();
  assert.equal(env.counter(), '4 / 50');
  assert.equal(env.image().src, filenames[3]);
  assert.equal(env.gallery.getAttribute('aria-busy'), 'false');
  assert.equal(env.timers.size, 0, 'manual product galleries never acquire an autoplay timer');
 });

 await check('many sequential moves retain at most three cached image promises after each completed transition', async () => {
  const env = await ready({autoplay: 0});
  for (let index = 1; index <= 35; index++) {
   env.next();
   const photo = env.requested(filenames[index]);
   if (!photo.complete) env.load(photo);
   await env.flush();
   assert.equal(env.counter(), (index + 1) + ' / 50');
   assert.equal(env.image().src, filenames[index]);
   assert.ok(env.caches[0].size <= 3, 'completed transitions retain only nearby pictures');
  }
 });

 await check('observer fallback, reserved responsive image metadata and manual wraparound remain available', async () => {
  const media = {'photo-0.webp': {width: 960, height: 640, src: 'optimized/zero.webp', srcset: 'optimized/zero-480.webp 480w, optimized/zero.webp 960w'}};
  const env = await ready({withObserver: false, count: 2, media, base: '../../'});
  assert.equal(env.timers.size, 1);
  assert.equal(env.image().src, '../../optimized/zero.webp');
  assert.equal(env.image().srcset, '../../optimized/zero-480.webp 480w, ../../optimized/zero.webp 960w');
  assert.equal(env.image().width, 960); assert.equal(env.image().height, 640);
  assert.equal(env.image().fetchPriority, 'high');
  env.previous(); env.load(env.requested(filenames[1])); await env.flush();
  assert.equal(env.counter(), '2 / 2');
  env.next(); await env.flush();
  assert.equal(env.counter(), '1 / 2');
 });

 console.log('\n' + results.length + ' gallery regression groups passed against production functions (synthetic DOM/timers; no native browser or network verification).');
})().catch(error => { console.error(error); process.exitCode = 1; });
