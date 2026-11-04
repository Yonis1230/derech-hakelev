'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/article-comments.js'), 'utf8');
const slug = 'emotional-therapy-with-dogs';
const url = 'https://derech-hakelev.com/pages/articles/' + slug + '/';

function fixture({site = 'fixture-site', pageUrl = url, pageSlug = slug, canonical = pageUrl,
 preview = false, withSection = true, targetId = 'graphcomment'} = {}) {
 const scripts = [];
 const timers = new Map();
 const initialized = [];
 const languageCalls = [];
 const pageEvents = new Map();
 let timerId = 0;
 const document = {activeElement: null};
 class Element {
  constructor(attributes = {}) { this.attributes = attributes; this.hidden = false; this.disabled = false; this.textContent = ''; this.handlers = {}; this.children = []; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  focus() { document.activeElement = this; }
  click() { this.handlers.click?.(); }
  querySelector(selector) {
   if (selector === 'iframe') return this.children.find(child => child.tagName === 'IFRAME') || null;
   return this.parts?.[selector];
  }
  cloneNode(deep) { assert.equal(deep, false); return new Element({...this.attributes}); }
  replaceWith(replacement) {
   assert.equal(section.parts['[data-comments-widget]'], this);
   section.parts['[data-comments-widget]'] = replacement;
   this.detached = true;
  }
  remove() { this.removed = true; }
 }
 const button = new Element();
 button.textContent = 'הצגת תגובות';
 const status = new Element();
 const section = new Element({
  'data-comments-site': site, 'data-comments-url': pageUrl,
  'data-comments-slug': pageSlug, 'data-comments-preview': String(preview)
 });
 section.parts = {'[data-comments-load]': button, '[data-comments-status]': status, '[data-comments-widget]': new Element({id: targetId, 'data-comments-widget': '', 'aria-label': 'תגובות'})};
 const forbidden = () => { throw new Error('No independent fetch, comment storage, browsing location or measurement is allowed.'); };
 const window = {addEventListener(name, handler) { pageEvents.set(name, handler); }};
 Object.defineProperty(window, 'dataLayer', {get: forbidden});
 Object.defineProperty(window, 'gcOnComment', {get: forbidden, set: forbidden});
 Object.assign(document, {
  querySelector(selector) {
   if (selector === '[data-article-comments]') return withSection ? section : null;
   if (selector === 'link[rel="canonical"]') return new Element({href: canonical});
   assert.fail('Unexpected document read: ' + selector);
  },
  getElementById(id) { assert.equal(id, 'graphcomment'); return section.parts['[data-comments-widget]']; },
  createElement(tag) { assert.equal(tag, 'script'); return new Element(); },
  head: {append(script) { scripts.push(script); }}
 });
 vm.runInNewContext(source, {
  window, document, URL, fetch: forbidden, localStorage: new Proxy({}, {get: forbidden}),
  get location() { return forbidden(); },
  setTimeout(callback, milliseconds) { const id = ++timerId; timers.set(id, {callback, milliseconds}); return id; },
  clearTimeout(id) { timers.delete(id); }
 }, {filename: 'docs/article-comments.js'});
 return {
  button, status, section, scripts, timers, initialized, window, document, languageCalls,
  get target() { return section.parts['[data-comments-widget]']; },
  runtime({deferFrame = false, throws = false, withLanguage = true} = {}) {
   window.__semio__gc_graphlogin = config => {
    const target = document.getElementById('graphcomment');
    const invocation = {config, target};
    initialized.push(invocation);
    if (!deferFrame) this.mount(initialized.length - 1);
    if (throws) throw new Error('Vendor initialization failure');
   };
   if (withLanguage) window.__semio__gcSetLang = language => languageCalls.push(language);
  },
  mount(index = initialized.length - 1, frameUrl = 'https://graphcomment.com/front/?pid=fixture') {
   const frame = new Element({src: frameUrl});
   frame.tagName = 'IFRAME';
   frame.contentWindow = {};
   initialized[index].target.children.push(frame);
   return frame;
  },
  message(frame = this.target.children[0], {origin = 'https://graphcomment.com', source = frame?.contentWindow, data = {name: 'gc-ready'}} = {}) {
   pageEvents.get('message')?.({origin, source, data});
  },
  ready() { this.message(); window.__semio__onGcLoaded(); },
  expire() { for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); } }
 };
}

test('loads only on a click, creates one thread and uses the canonical URL plus permanent article UID', () => {
 const env = fixture();
 assert.equal(env.scripts.length, 0);
 assert.equal(env.initialized.length, 0);
 assert.equal(env.timers.size, 0);
 assert.equal(env.button.disabled, false);
 env.button.click();
 env.button.click();
 assert.equal(env.scripts.length, 1);
 const script = env.scripts[0];
 assert.equal(script.src, 'https://integration.graphcomment.com/gc_graphlogin.js');
 assert.equal(script.async, true);
 assert.equal(script.defer, true);
 assert.equal(script.referrerPolicy, 'no-referrer');
 assert.equal(env.button.disabled, true);
 assert.equal(env.section.attributes['data-comments-loading'], 'true');
 assert.equal(env.target.hidden, false);
 assert.equal(env.target.attributes.dir, 'rtl');
 env.runtime();
 script.onload();
 assert.equal(env.initialized.length, 1);
 assert.equal(env.section.attributes['data-comments-ready'], 'false');
 assert.equal(env.status.textContent, 'טוענים את התגובות…');
 assert.deepEqual(JSON.parse(JSON.stringify(env.initialized[0].config)), {
  graphcommentId: 'fixture-site',
  behaviour: {uid: 'derech-article:' + slug, url, readonly: false, sort: 'oldest', countPerPage: 10}
 });
 assert.equal(env.languageCalls.length, 0);
 env.ready();
 assert.equal(env.section.attributes['data-comments-ready'], 'true');
 assert.equal(env.section.attributes['data-comments-loading'], 'false');
 assert.equal(env.status.textContent, 'אזור התגובות נפתח.');
 assert.equal(env.button.hidden, true);
 assert.equal(env.timers.size, 0);
 assert.deepEqual(env.languageCalls, ['he']);
 env.button.click();
 assert.equal(env.initialized.length, 1);
 assert.equal(env.scripts.length, 1);
});

test('a missing shortname, placeholder, preview, noncanonical URL or wrong mount cannot load', () => {
 for (const options of [
  {site: ''}, {site: 'demo-gc'}, {site: 'shortname'}, {site: 'placeholder'}, {site: 'has whitespace'},
  {preview: true}, {pageUrl: url + '?private=value'}, {pageUrl: url + '#comment'},
  {pageUrl: url.replace('derech-hakelev.com', 'other.example')},
  {pageSlug: 'different-article'}, {canonical: url.replace(slug, 'different-article')}, {targetId: 'different-target'}
 ]) {
  const env = fixture(options);
  assert.equal(env.button.hidden, true);
  assert.equal(env.button.disabled, true);
  env.button.click();
  assert.equal(env.scripts.length, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.initialized.length, 0);
 }
});

test('ready requires both the SDK callback and the current genuine iframe lifecycle event, in either order', () => {
 for (const callbackFirst of [false, true]) {
  const env = fixture();
  env.runtime();
  env.button.click();
  assert.equal(env.window.onGcLoaded, env.window.__semio__onGcLoaded, 'Both the documented callback and current SDK alias must work.');
  if (callbackFirst) env.window.onGcLoaded();
  else env.message();
  assert.equal(env.section.attributes['data-comments-ready'], 'false');
  if (callbackFirst) env.message();
  else env.window.onGcLoaded();
  assert.equal(env.section.attributes['data-comments-ready'], 'true');
 }
});

test('untrusted origins, other iframe windows and unrelated or malformed messages cannot signal readiness', () => {
 const env = fixture();
 env.runtime();
 env.button.click();
 env.window.onGcLoaded();
 for (const options of [
  {origin: 'https://graphcomment.com.evil.example'}, {origin: 'http://graphcomment.com'},
  {source: {}}, {data: {name: 'gc-new-comment'}}, {data: '{broken'}, {data: null}
 ]) {
  env.message(undefined, options);
  assert.equal(env.section.attributes['data-comments-ready'], 'false');
 }
 env.message(undefined, {data: '{"name":"gc-ready"}'});
 assert.equal(env.section.attributes['data-comments-ready'], 'true');
});

test('the iframe itself must have the exact SDK origin and path', () => {
 for (const frameUrl of ['https://evil.example/front/', 'https://graphcomment.com.evil.example/front/', 'http://graphcomment.com/front/', 'https://graphcomment.com/other/']) {
  const env = fixture();
  env.runtime({deferFrame: true});
  env.button.click();
  const frame = env.mount(0, frameUrl);
  env.message(frame);
  env.window.onGcLoaded();
  assert.equal(env.section.attributes['data-comments-ready'], 'false');
 }
});

test('opening comments moves focus into the named iframe only if the reader is still on the load button', () => {
 for (const stillOnButton of [true, false]) {
  const env = fixture();
  env.runtime();
  env.button.focus();
  env.button.click();
  const elsewhere = {};
  if (!stillOnButton) env.document.activeElement = elsewhere;
  env.ready();
  const frame = env.target.children[0];
  assert.equal(frame.attributes.title, 'תגובות למאמר');
  assert.equal(env.document.activeElement, stillOnButton ? frame : elsewhere);
 }
});

test('a network error allows retry while an old load handler cannot initialize the widget', () => {
 const env = fixture();
 env.button.click();
 const first = env.scripts[0];
 const oldOnload = first.onload;
 first.onerror();
 assert.equal(first.removed, true);
 assert.equal(env.button.disabled, false);
 assert.equal(env.button.textContent, 'ניסיון נוסף');
 assert.equal(env.target.hidden, true);
 assert.equal(env.section.attributes['data-comments-loading'], 'false');
 env.button.click();
 assert.equal(env.scripts.length, 2);
 env.runtime();
 oldOnload();
 assert.equal(env.initialized.length, 0);
 env.scripts[1].onload();
 assert.equal(env.initialized.length, 1);
 env.ready();
 assert.equal(env.section.attributes['data-comments-ready'], 'true');
});

test('script download without the runtime is failure, not ready', () => {
 const env = fixture();
 env.button.click();
 env.scripts[0].onload();
 assert.equal(env.button.disabled, false);
 assert.equal(env.target.hidden, true);
 assert.equal(env.section.attributes['data-comments-ready'], 'false');
 assert.match(env.status.textContent, /לא הצלחנו/);
});

test('timeout detaches the previous mount so a late SDK mount and callback cannot duplicate or ready the retry', () => {
 const env = fixture();
 env.runtime({deferFrame: true});
 assert.equal(env.initialized.length, 0);
 env.button.click();
 const oldTarget = env.target;
 const oldCallback = env.window.onGcLoaded;
 assert.equal([...env.timers.values()][0].milliseconds, 20000);
 env.expire();
 assert.equal(oldTarget.detached, true);
 assert.notEqual(env.target, oldTarget);
 assert.equal(env.target.attributes['aria-label'], 'תגובות');
 assert.equal(env.target.attributes.id, 'graphcomment');
 assert.equal(env.button.disabled, false);
 env.runtime();
 env.button.click();
 assert.equal(env.initialized.length, 2);
 const retiredFrame = env.mount(0);
 oldCallback();
 env.message(retiredFrame);
 env.window.onGcLoaded(); // The SDK looks up the global callback when an old frame sends ready.
 assert.equal(env.section.attributes['data-comments-ready'], 'false');
 assert.equal(env.target.children.length, 1, 'Only the retry iframe remains in the live target.');
 assert.equal(oldTarget.children.length, 1, 'The old asynchronous SDK can only modify its detached mount.');
 env.message();
 assert.equal(env.section.attributes['data-comments-ready'], 'true');
});

test('runtime exceptions clear partial UI, preserve retry and support account language fallback', () => {
 const env = fixture();
 env.runtime({throws: true});
 env.button.click();
 assert.equal(env.target.children.length, 0);
 assert.equal(env.target.hidden, true);
 assert.equal(env.button.disabled, false);
 assert.equal(env.section.attributes['data-comments-ready'], 'false');
 env.runtime({withLanguage: false});
 env.button.click();
 env.ready();
 assert.equal(env.section.attributes['data-comments-ready'], 'true');
});

test('canonical /articles/ routes keep their explicit URL and slug identity', () => {
 const pageUrl = url.replace('/pages/articles/', '/articles/');
 const env = fixture({pageUrl});
 env.runtime();
 env.button.click();
 assert.equal(env.initialized[0].config.behaviour.url, pageUrl);
 assert.equal(env.initialized[0].config.behaviour.uid, 'derech-article:' + slug);
});

test('a page without the comment hook makes no request or timer', () => {
 const env = fixture({withSection: false});
 assert.equal(env.scripts.length, 0);
 assert.equal(env.timers.size, 0);
});
