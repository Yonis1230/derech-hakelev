'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/article-read-aloud.js'), 'utf8');
const localHebrew = {name: 'עברית מקומית', lang: 'he-IL', localService: true};
const remoteHebrew = {name: 'עברית אחרת', lang: 'he-IL', localService: false};
const english = {name: 'English', lang: 'en-US', localService: true};

function fixture({voices = [localHebrew], withAPI = true, withWidget = true,
 heading = 'כותרת המאמר?', paragraphs = ['פסקה ראשונה. משפט שני!', 'כותרת פרק', 'פריט ברשימה.'],
 cancelEmitsError = false, speed = '1'} = {}) {
 const pageEvents = new Map();
 const voiceEvents = new Map();
 const spoken = [];
 const calls = [];
 let current = null;
 let availableVoices = voices;
 const document = {activeElement: null};
 class Control {
  constructor() { this.hidden = false; this.disabled = false; this.textContent = ''; this.handlers = {}; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  click() { this.handlers.click?.(); }
  change(value) { this.value = value; this.handlers.change?.(); }
  focus() { document.activeElement = this; }
 }
 const controls = Object.fromEntries(['start', 'pause', 'resume', 'stop', 'rate', 'status'].map(name => [name, new Control()]));
 controls.rate.value = speed;
 const widget = {
  attributes: {},
  querySelector(selector) { return controls[selector.match(/^\[data-read-(.+)\]$/)[1]]; },
  setAttribute(name, value) { this.attributes[name] = value; }
 };
 const node = value => typeof value === 'string' ? {textContent: value, parentElement: {closest: () => null}} : value;
 const headingNode = node(heading);
 const nodes = paragraphs.map(node);
 const body = {querySelectorAll(selector) { assert.equal(selector, 'h2,h3,p,li'); return nodes; }};
 document.querySelector = selector => {
  if (selector === '[data-article-read-aloud]') return withWidget ? widget : null;
  if (selector === '.article-heading h1') return headingNode;
  if (selector === '.article-body') return body;
  assert.fail('Unexpected document read: ' + selector);
 };
 const synth = {
  getVoices() { calls.push('getVoices'); return availableVoices; },
  addEventListener(name, callback) { voiceEvents.set(name, callback); },
  speak(utterance) { calls.push('speak'); current = utterance; spoken.push(utterance); },
  cancel() {
   calls.push('cancel');
   const old = current;
   current = null;
   if (cancelEmitsError) old?.onerror?.({error: 'canceled'});
  },
  pause() { calls.push('pause'); },
  resume() { calls.push('resume'); }
 };
 const forbidden = () => { throw new Error('The reader must not use network, storage, location or tracking'); };
 const window = {
  speechSynthesis: withAPI ? synth : undefined,
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  addEventListener(name, callback) { pageEvents.set(name, callback); }
 };
 Object.defineProperty(window, 'dataLayer', {get: forbidden});
 vm.runInNewContext(source, {
  window, document, fetch: forbidden,
  localStorage: new Proxy({}, {get: forbidden}),
  get location() { return forbidden(); }
 }, {filename: 'docs/article-read-aloud.js'});
 return {
  ...controls, document, spoken, calls, widget,
  end(utterance = current) { if (current === utterance) current = null; utterance?.onend?.(); },
  error(utterance = current) { if (current === utterance) current = null; utterance?.onerror?.({error: 'synthesis-failed'}); },
  changeVoices(next) { availableVoices = next; voiceEvents.get('voiceschanged')?.(); },
  pagehide() { pageEvents.get('pagehide')?.(); },
  drain() {
   let remaining = 1000;
   while (current && remaining-- > 0) this.end();
   assert.ok(remaining > 0, 'The reading queue must finish.');
  }
 };
}

test('speech starts only on request, prefers a local Hebrew voice and reads the article once', () => {
 const longSentence = ('מילה '.repeat(80)).trim() + '.';
 const listChild = {textContent: 'לא לקרוא את פריט הרשימה פעמיים', parentElement: {closest: () => ({})}};
 const env = fixture({voices: [english, remoteHebrew, localHebrew], paragraphs: ['פתיחה. עוד משפט!', 'כותרת משנה', longSentence, 'פריט רשימה.', listChild]});
 assert.equal(env.spoken.length, 0);
 assert.equal(env.start.disabled, false);
 assert.equal(env.pause.hidden, true);
 env.start.click();
 assert.equal(env.spoken.length, 1, 'Queue only one short utterance at a time.');
 assert.equal(env.spoken[0].text, 'כותרת המאמר?');
 assert.equal(env.document.activeElement, env.pause);
 env.drain();
 assert.ok(env.spoken.length > 6);
 for (const utterance of env.spoken) {
  assert.equal(utterance.lang, 'he-IL');
  assert.equal(utterance.voice, localHebrew);
  assert.equal(utterance.rate, 1);
  assert.ok(utterance.text.length <= 140);
 }
 const actual = env.spoken.map(utterance => utterance.text).join('').replace(/\s/gu, '');
 const expected = ['כותרת המאמר?', 'פתיחה. עוד משפט!', 'כותרת משנה', longSentence, 'פריט רשימה.'].join('').replace(/\s/gu, '');
 assert.equal(actual, expected);
 assert.equal(env.status.textContent, 'ההקראה הסתיימה.');
 assert.equal(env.start.hidden, false);
 assert.equal(env.stop.hidden, true);
});

test('pause and resume preserve the same utterance rather than restarting the article', () => {
 const env = fixture();
 env.start.click();
 env.pause.click();
 assert.equal(env.calls.at(-1), 'pause');
 assert.equal(env.pause.hidden, true);
 assert.equal(env.resume.hidden, false);
 assert.equal(env.document.activeElement, env.resume);
 env.resume.click();
 assert.equal(env.calls.at(-1), 'resume');
 assert.equal(env.spoken.length, 1);
 assert.equal(env.resume.hidden, true);
 assert.equal(env.pause.hidden, false);
 env.end();
 assert.equal(env.spoken[1].text, 'פסקה ראשונה.');
});

test('an end event racing with pause does not continue until the user resumes', () => {
 const env = fixture();
 env.start.click();
 env.pause.click();
 env.end();
 assert.equal(env.spoken.length, 1);
 env.resume.click();
 assert.equal(env.spoken.length, 2);
 assert.equal(env.spoken[1].text, 'פסקה ראשונה.');
});

test('stop cancels, returns focus and ignores stale callbacks after another start', () => {
 const env = fixture({cancelEmitsError: true});
 env.start.click();
 const old = env.spoken[0];
 env.stop.focus();
 env.stop.click();
 assert.equal(env.status.textContent, 'ההקראה נעצרה.');
 assert.equal(env.document.activeElement, env.start);
 env.start.click();
 assert.equal(env.spoken.length, 2);
 env.end(old);
 env.error(old);
 assert.equal(env.spoken.length, 2);
 assert.equal(env.status.textContent, 'מקריאים את המאמר.');
 env.end();
 assert.equal(env.spoken[2].text, 'פסקה ראשונה.');
});

test('voice availability, not API availability, controls readiness; late voices do not auto-play', () => {
 const env = fixture({voices: [english]});
 assert.equal(env.start.disabled, true);
 assert.match(env.status.textContent, /אינה זמינה/);
 env.start.click();
 assert.equal(env.spoken.length, 0);
 env.changeVoices([english, remoteHebrew]);
 assert.equal(env.start.disabled, false);
 assert.equal(env.spoken.length, 0);
 env.start.click();
 assert.equal(env.spoken[0].voice, remoteHebrew);
 env.changeVoices([english]);
 assert.equal(env.start.disabled, true);
 assert.equal(env.stop.hidden, true);
 assert.match(env.status.textContent, /אינה זמינה/);
 env.end(env.spoken[0]);
 assert.equal(env.spoken.length, 1);
});

test('losing the Hebrew voice moves focus from hidden playback controls to the status', () => {
 for (const control of ['pause', 'resume', 'stop']) {
  const env = fixture();
  env.start.click();
  if (control === 'resume') env.pause.click();
  env[control].focus();
  env.changeVoices([]);
  assert.equal(env[control].hidden, true);
  assert.equal(env.start.disabled, true);
  assert.equal(env.document.activeElement, env.status);
  env.changeVoices([localHebrew]);
  assert.equal(env.document.activeElement, env.status, 'A newly available voice must not move focus again.');
 }
});

test('losing the Hebrew voice preserves focus outside the playback controls', () => {
 const env = fixture();
 env.start.click();
 const externalControl = {};
 env.document.activeElement = externalControl;
 env.changeVoices([]);
 assert.equal(env.start.disabled, true);
 assert.equal(env.document.activeElement, externalControl);
});

test('without the speech API the button stays unavailable and never advertises playback', () => {
 const env = fixture({withAPI: false});
 assert.equal(env.start.disabled, true);
 assert.equal(env.pause.hidden, true);
 assert.equal(env.resume.hidden, true);
 assert.equal(env.stop.hidden, true);
 assert.match(env.status.textContent, /אינה זמינה/);
 assert.equal(env.spoken.length, 0);
});

test('a synthesis error stops the queue and allows a deliberate retry', () => {
 const env = fixture();
 env.start.click();
 const old = env.spoken[0];
 env.error();
 assert.equal(env.status.textContent, 'ההקראה נעצרה. אפשר לנסות שוב.');
 assert.equal(env.start.hidden, false);
 assert.equal(env.start.disabled, false);
 env.end(old);
 assert.equal(env.spoken.length, 1);
 env.start.click();
 assert.equal(env.spoken[1].text, 'כותרת המאמר?');
});

test('speed changes restart only the current short segment and preserve pause', () => {
 const env = fixture({cancelEmitsError: true});
 env.rate.change('0.8');
 env.start.click();
 assert.equal(env.spoken[0].rate, 0.8);
 env.end();
 const old = env.spoken[1];
 env.rate.change('1.2');
 assert.equal(env.spoken[2].text, old.text);
 assert.equal(env.spoken[2].rate, 1.2);
 env.end(old);
 assert.equal(env.spoken.length, 3);
 env.pause.click();
 env.rate.change('1');
 assert.equal(env.spoken.length, 3, 'A speed change must not resume paused audio.');
 assert.equal(env.resume.hidden, false);
 env.resume.click();
 assert.equal(env.spoken[3].rate, 1);
 assert.equal(env.spoken[3].text, old.text);
 env.rate.change('3');
 assert.equal(env.rate.value, '1');
 assert.equal(env.spoken.length, 4);
});

test('pagehide cancels audio, invalidates pending callbacks and permits a fresh user start', () => {
 const env = fixture({cancelEmitsError: true});
 env.start.click();
 const old = env.spoken[0];
 env.pagehide();
 assert.equal(env.calls.at(-1), 'cancel');
 assert.equal(env.start.hidden, false);
 env.end(old);
 env.error(old);
 assert.equal(env.spoken.length, 1);
 env.start.click();
 assert.equal(env.spoken[1].text, 'כותרת המאמר?');
});

test('a page without the widget does not even inspect voices', () => {
 const env = fixture({withWidget: false});
 assert.deepEqual(env.calls, []);
});
