// Runs the production hooks with a small synthetic DOM; no trackers or network.
// This checks event timing and payloads, not native browser layout or account delivery.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../', file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function environment({measurement = true, modalFailure = false} = {}) {
 const events = [], timers = new Map();
 let timerId = 0;
 class Element {
  constructor(tag) {
   this.tagName = tag.toUpperCase(); this.childNodes = []; this.parentNode = null;
   this.dataset = {}; this.attributes = {}; this.events = new Map(); this.style = {};
   this.className = ''; this.textContent = ''; this.hidden = false;
  }
  get children() { return this.childNodes; }
  get isConnected() { return this === document.body || !!this.parentNode?.isConnected; }
  get classList() {
   return {
    contains: name => this.className.split(/\s+/).includes(name),
    add: name => { if (!this.className.split(/\s+/).includes(name)) this.className += ' ' + name; },
    remove: name => { this.className = this.className.split(/\s+/).filter(value => value !== name).join(' '); }
   };
  }
  append(...nodes) { nodes.forEach(node => { node.parentNode = this; this.childNodes.push(node); }); }
  prepend(node) { node.parentNode = this; this.childNodes.unshift(node); }
  before(node) { node.parentNode = this.parentNode; this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 0, node); }
  replaceChildren(...nodes) { this.childNodes.forEach(node => { node.parentNode = null; }); this.childNodes = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { this.events.set(name, [...(this.events.get(name) || []), handler]); }
  dispatch(name) { const event = {target: this, preventDefault() { this.defaultPrevented = true; }}; (this.events.get(name) || []).forEach(handler => handler(event)); }
  click() {
   if (this.disabled) return;
   if (this.tagName === 'INPUT') { this.checked = this.type === 'radio' ? true : !this.checked; this.dispatch('change'); }
   this.dispatch('click');
  }
  focus() { document.activeElement = this; }
  scrollIntoView() {}
  showModal() { if (modalFailure) throw Error('Dialog unavailable'); this.open = true; }
  close() { this.open = false; this.dispatch('close'); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
   const matches = node => selector[0] === '.' ? node.classList.contains(selector.slice(1)) : node.tagName.toLowerCase() === selector;
   return this.childNodes.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
  }
  set innerHTML(html) {
   this.replaceChildren();
   const stack = [this];
   for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*?)>/gi)) {
    if (match[0][1] === '/') { if (stack.length > 1) stack.pop(); continue; }
    const node = new Element(match[1]);
    for (const attr of match[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
     node.setAttribute(attr[1], attr[2]);
     if (['id', 'href'].includes(attr[1])) node[attr[1]] = attr[2];
    }
    stack.at(-1).append(node);
    if (!['input', 'img', 'br', 'hr'].includes(match[1])) stack.push(node);
   }
  }
 }
 const document = {
  createElement: tag => new Element(tag),
  addEventListener(name, callback) { assert.equal(name, 'DOMContentLoaded'); this.ready = callback; },
  querySelector(selector) { return this.body.querySelector(selector); },
  getElementById(id) { const walk = node => node.id === id ? node : node.childNodes.map(walk).find(Boolean); return walk(this.body) || null; }
 };
 document.body = new Element('body');
 const window = measurement ? {DERECH_MEASUREMENT: {track: (name, params) => events.push({name, params: plain(params)})}} : {};
 const sandbox = {
  window, document, base: '', history: {pushState() {}}, matchMedia: () => ({matches: true}),
  setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
  clearTimeout(id) { timers.delete(id); }
 };
 return {document, window, sandbox, events, node(tag = 'div') { return new Element(tag); }, tick() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); }};
}

function advisorFixture(options) {
 const env = environment(options);
 const header = env.node('a'); header.className = 'header-contact'; header.href = 'https://wa.me/972524013354'; env.document.body.append(header);
 const trigger = env.node('button'); trigger.dataset.measurePlacement = 'hero'; env.document.body.append(trigger);
 const data = {};
 vm.runInNewContext(read('docs/advisor-data.js').replaceAll('export const ', 'const ').replaceAll('export function ', 'function ') + '\nglobalThis.questions = QUESTIONS;', data);
 Object.assign(env.sandbox, {QUESTIONS: data.questions, recommendGames: () => [{product: {id: 'solutions', name: 'Game', price: 165}, reason: 'Reason'}], recommendBundle: () => null});
 vm.runInNewContext(read('docs/advisor.js').replace(/^import .*?;\s*/m, '').replace('export function openGameAdvisor', 'function openGameAdvisor') + '\nglobalThis.open = openGameAdvisor;', env.sandbox);
 return {
  ...env,
  open() { env.sandbox.open({trigger, catalog: []}); },
  get dialog() { return env.document.body.querySelector('dialog'); },
  finish() {
   for (let i = 0; i < data.questions.length; i++) {
    env.document.body.querySelector('input').click();
    env.document.body.querySelector('.game-advisor-next').click();
   }
  }
 };
}

const advisor = advisorFixture();
assert.equal(advisor.events.length, 0, 'loading the questionnaire does not count as starting');
advisor.open(); advisor.dialog.close(); advisor.open();
assert.deepEqual(advisor.events, [{name: 'finder_start', params: {placement: 'hero'}}], 'resume does not start another run');
advisor.finish();
assert.deepEqual(advisor.events.at(-1), {name: 'finder_complete', params: {placement: 'hero'}});
advisor.dialog.close(); advisor.open();
advisor.dialog.querySelector('.game-advisor-back').click();
advisor.dialog.querySelector('.game-advisor-next').click();
assert.equal(advisor.events.length, 2, 'reopening results or recomputing after Back does not duplicate completion');
advisor.dialog.querySelector('.game-advisor-reset').click(); advisor.finish();
assert.deepEqual(advisor.events.map(event => event.name), ['finder_start', 'finder_complete', 'finder_start', 'finder_complete']);
assert.deepEqual(advisor.dialog.querySelector('.game-advisor-help').dataset, {measureId: 'finder_whatsapp', measurePlacement: 'finder'});
assert.deepEqual(advisor.dialog.querySelector('.game-advisor-result').querySelector('a').dataset, {measureId: 'finder_product_solutions', measurePlacement: 'finder', productId: 'solutions'});
const failed = advisorFixture({modalFailure: true});
assert.throws(() => failed.open()); assert.equal(failed.events.length, 0, 'failed modal opening is not a start');
const unmeasured = advisorFixture({measurement: false}); unmeasured.open(); unmeasured.finish();
console.log('PASS finder start/completion timing, repeat prevention, reset, stable link markers and absent measurement API');

const scripts = read('docs/scripts.js');
const helperStart = scripts.indexOf(' const measure=');
const helperEnd = scripts.indexOf(' const escape=', helperStart);
const cardStart = scripts.indexOf(' function card(');
const cardEnd = scripts.indexOf(' function createPackOffer(', cardStart);
assert(helperStart >= 0 && helperEnd > helperStart && cardStart >= 0 && cardEnd > cardStart);
const cards = environment();
Object.assign(cards.sandbox, {escape: value => value, gallery: () => cards.node(), prepareVideo() {}});
vm.runInNewContext(scripts.slice(helperStart, helperEnd) + scripts.slice(cardStart, cardEnd) + '\nglobalThis.card = card;', cards.sandbox);
const product = {id: 'solutions', name: 'Game', summary: 'Summary', price: 165, images: [], details: '<p>Description</p><a class="whatsapp-button" href="https://wa.me/972524013354?text=private">Order</a>'};
const card = cards.sandbox.card(product, false);
const toggle = card.querySelector('.detail-toggle');
assert.deepEqual(toggle.dataset, {measureId: 'catalog_details_solutions', measurePlacement: 'catalog', productId: 'solutions'});
assert.deepEqual(card.querySelector('.whatsapp-button').dataset, {measureId: 'catalog_order_solutions', measurePlacement: 'catalog', productId: 'solutions'});
toggle.click(); toggle.click();
assert.deepEqual(cards.events, [{name: 'product_details_open', params: {product_id: 'solutions', placement: 'catalog'}}], 'only opening emits; closing does not');
toggle.dataset.measurePlacement = 'finder'; toggle.click();
assert.equal(cards.events.at(-1).params.placement, 'finder');
assert(!JSON.stringify(cards.events).includes('private'), 'the WhatsApp message/URL is never included');
assert.equal(cards.sandbox.card(product, true).querySelector('a').dataset.productId, 'solutions');
console.log('PASS product details actual-open events and stable product/order markers without message or URL leakage');

const deepLinkStart = scripts.indexOf(" if(location.hash.startsWith('#game-'))");
const deepLinkEnd = scripts.indexOf("\n document.querySelectorAll('a[target=", deepLinkStart);
assert(deepLinkStart >= 0 && deepLinkEnd > deepLinkStart, 'production deep-link block must be available for execution');
const deepLinkProduction = scripts.slice(deepLinkStart, deepLinkEnd);

function deepLinkFixture(hash) {
 const env = environment({measurement: false});
 const frames = [], sequence = [];
 Object.assign(env.sandbox, {
  escape: value => value, gallery: () => env.node(), prepareVideo() {},
  location: {hash}, requestAnimationFrame(callback) { frames.push(callback); }
 });
 vm.runInNewContext(scripts.slice(helperStart, helperEnd) + scripts.slice(cardStart, cardEnd) + '\nglobalThis.card = card;', env.sandbox);
 const target = env.sandbox.card(product, false);
 env.document.body.append(target);
 target.scrollIntoView = () => sequence.push('scroll');
 vm.runInNewContext(deepLinkProduction, env.sandbox);
 return {
  ...env, target, frames, sequence,
  initializeMeasurement() {
   sequence.push('initialize');
   env.window.DERECH_MEASUREMENT = {track(name, params) {
    assert(sequence.includes('initialize'), 'collector initialization precedes deep-link measurement');
    sequence.push('open'); env.events.push({name, params: plain(params)});
   }};
  },
  flushFrame() { const pending = frames.splice(0); pending.forEach(callback => callback()); }
 };
}

const deepLink = deepLinkFixture('#game-solutions');
assert.equal(deepLink.frames.length, 1);
assert.equal(deepLink.target.querySelector('.game-details').hidden, true, 'deep links do not open during the first DOM initializer');
assert.equal(deepLink.events.length, 0);
assert.deepEqual(deepLink.sequence, [], 'scrolling also waits for the scheduled frame');
deepLink.initializeMeasurement();
deepLink.flushFrame();
assert.equal(deepLink.target.querySelector('.game-details').hidden, false);
assert.deepEqual(deepLink.events, [{name: 'product_details_open', params: {product_id: 'solutions', placement: 'catalog'}}]);
assert.deepEqual(deepLink.sequence, ['initialize', 'open', 'scroll']);
deepLink.flushFrame();
assert.equal(deepLink.events.length, 1, 'the scheduled opening runs once');
assert.equal(deepLink.frames.length, 0);
for (const hash of ['', '#about', '#game-', '#game-missing', '#game-solutions-extra']) {
 const invalid = deepLinkFixture(hash);
 invalid.initializeMeasurement(); invalid.flushFrame();
 assert.equal(invalid.frames.length, 0, hash);
 assert.equal(invalid.target.querySelector('.game-details').hidden, true, hash);
 assert.equal(invalid.events.length, 0, hash);
 assert.deepEqual(invalid.sequence, ['initialize'], 'invalid targets never open or scroll: ' + hash);
}
console.log('PASS real deep-link opening waits for other DOM initializers, emits once, scrolls and ignores invalid hashes');

function memoryFixture() {
 const env = environment();
 for (const id of ['gameBoard', 'game-status', 'restart-game']) { const node = env.node(id === 'restart-game' ? 'button' : 'div'); node.id = id; env.document.body.append(node); }
 const math = Object.create(Math); math.random = () => 0.999;
 env.sandbox.Math = math;
 vm.runInNewContext(read('docs/pages/games/game1.js'), env.sandbox);
 env.document.ready();
 const board = env.document.getElementById('gameBoard');
 return {...env, board, complete() { for (let i = 0; i < 10; i += 2) { board.children[i].click(); board.children[i + 1].click(); env.tick(); } }};
}
const memory = memoryFixture();
memory.document.getElementById('restart-game').click();
assert.equal(memory.events.length, 0, 'starting/restarting is not completion');
memory.complete(); memory.complete();
assert.deepEqual(memory.events, [{name: 'memory_game_complete', params: {game_id: 'solutions_memory', placement: 'sample_game'}}]);
memory.document.getElementById('restart-game').click(); memory.complete();
assert.equal(memory.events.length, 2, 'a newly completed game may emit once again');
console.log('PASS memory completion only after five pairs, once per game and again after a genuine new completion');
console.log('4 production measurement-hook regression groups passed (synthetic DOM; no external data collection).');
