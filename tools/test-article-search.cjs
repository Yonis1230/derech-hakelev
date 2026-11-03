'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../docs/article-search.js'), 'utf8');
// The site's .js file is a classic browser script; the unrelated root app uses
// type=module, so load its deliberate CommonJS branch in an isolated VM.
const coreModule = {exports: {}};
vm.runInNewContext(source, {module: coreModule, URL, setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args)});
const api = coreModule.exports;
const origin = 'https://derech-hakelev.com';
const sample = () => [{
 title: 'קשר ומשחק', url: origin + '/pages/articles/first-article/', entries: [
  {id: 'section-1-paragraph-1', heading: 'קשר בטוח', text: 'הַקֶּשֶׁר נבנה לאט. משחק משותף יכול לעזור לילד להרגיש בטוח.'},
  {id: 'section-1-paragraph-2', heading: 'ד״ר גורדון ניופלד', text: 'ד״ר גורדון ניופלד מדבר על משחק ועל קשר. Play builds TRUST.'},
  {id: 'section-2-paragraph-1', heading: 'גבולות', text: 'אפשר לכבד את הצורך במרחב ובמנוחה.'}
 ]
}, {
 title: 'מאמר שני', url: origin + '/articles/second-article/', entries: [
  {id: 'paragraph-1', heading: 'חוויה משותפת', text: 'משחק מאפשר התנסות משותפת.'}
 ]
}];

test('CommonJS import exports core without reading DOM or initializing UI', () => {
 const sandbox = {module: {exports: {}}, URL};
 Object.defineProperty(sandbox, 'document', {get() { throw new Error('DOM read during import'); }});
 vm.runInNewContext(source, sandbox);
 assert.equal(typeof sandbox.module.exports.search, 'function');
});

test('Hebrew vocalization/cantillation and Unicode compatibility forms normalize', () => {
 assert.equal(api.normalize('הַקֶּֽשֶׁר'), api.normalize('הקשר'));
 assert.equal(api.normalize('שָׁלוֹם'), 'שלום');
 assert.equal(api.normalize('Play TRUST'), 'play trust');
 assert.equal(api.normalize('ד״ר ניופלד'), 'ד"ר ניופלד');
 assert.equal(api.normalize('it’s'), "it's");
 const result = api.search(api.buildIndex(sample()), '  קשר  בטוח ');
 assert.equal(result.total, 1);
 assert.equal(result.groups[0].entries[0].id, 'section-1-paragraph-1');
});

test('every query word must appear in the same paragraph, without stemming or title-only repetition', () => {
 const index = api.buildIndex(sample());
 assert.equal(api.search(index, 'משחק קשר').total, 2);
 assert.equal(api.search(index, 'מרחב משחק').total, 0);
 assert.equal(api.search(index, 'משחקים').total, 0);
 assert.equal(api.search(index, 'קשר').total, 2);
 assert.equal(api.search(index, 'tRuSt PLAY').total, 1);
 assert.equal(api.search(index, 'ד"ר ניופלד').total, 1);
 assert.equal(api.search(index, 'משחק, קשר!').total, 2);
});

test('empty and punctuation-only searches do not match every paragraph; query is bounded', () => {
 const index = api.buildIndex(sample());
 assert.equal(api.search(index, '   ').query, '');
 assert.equal(api.search(index, '   ').total, 0);
 assert.equal(api.search(index, '!!!').total, 0);
 assert.equal(api.search(index, 'a'.repeat(200)).query.length, 100);
 assert.equal(api.search(index, ' '.repeat(120) + 'משחק').query, 'משחק');
 assert.match(api.statusText(api.search(index, '')), /חפשו/);
 assert.match(api.statusText(api.search(index, 'לאנמצא')), /לא נמצאו/);
});

test('invalid destinations, anchors and entries are ignored before search', () => {
 const entry = {id: 'paragraph-1', heading: 'משחק', text: 'משחק'};
 const invalidURLs = [
  'javascript:alert(1)', 'http://derech-hakelev.com/pages/articles/test/',
  'https://other.example/pages/articles/test/',
  origin + '.attacker.example/pages/articles/test/',
  'https://user:password@derech-hakelev.com/pages/articles/test/',
  origin + '/pages/articles/test/?query=private', origin + '/pages/articles/test/#fragment',
  origin + '/pages/games/', '/pages/articles/test/', origin + '/pages/articles/%22bad%22/'
 ];
 assert.equal(api.buildIndex(invalidURLs.map(url => ({title: 'משחק', url, entries: [entry]}))).length, 0);
 const valid = {title: 'משחק', url: origin + '/pages/articles/test/', entries: [
  entry, entry, {id: 'bad#hash', heading: '', text: 'משחק'}, {id: 'bad space', heading: '', text: 'משחק'},
  {id: '1-number', heading: '', text: 'משחק'}, {id: 'empty', heading: '', text: ' '},
  {id: 'missing-heading', text: 'משחק'}
 ]};
 const index = api.buildIndex([valid, valid, null, {}, {title: '', url: valid.url, entries: [entry]}]);
 assert.equal(index.length, 1);
 assert.equal(index[0].entries.length, 1);
 assert.equal(api.search(index, 'משחק').total, 1);
});

test('repeated phrases produce one result per paragraph and preserve article order', () => {
 const raw = sample();
 raw[0].entries[0].text = 'משחק משחק משחק משחק';
 const result = api.search(api.buildIndex(raw), 'משחק משחק');
 assert.equal(result.total, 3);
 assert.equal(result.groups.length, 2);
 assert.deepEqual(Array.from(result.groups, group => group.title), ['קשר ומשחק', 'מאמר שני']);
 assert.equal(result.groups[0].entries[0].matches.length, 4);
});

test('cap applies to visible entries while total/article count and status remain accurate', () => {
 const raw = [0, 1].map(article => ({
  title: 'מאמר ' + article, url: origin + '/pages/articles/article-' + article + '/',
  entries: Array.from({length: 40}, (_, index) => ({id: 'paragraph-' + index, heading: 'משחק', text: 'משחק וקשר'}))
 }));
 const result = api.search(api.buildIndex(raw), 'משחק');
 assert.equal(result.total, 80);
 assert.equal(result.visible, 50);
 assert.equal(result.articleCount, 2);
 assert.deepEqual(Array.from(result.groups, group => group.entries.length), [25, 25]);
 assert.match(api.statusText(result), /80 קטעים/);
 assert.match(api.statusText(result), /50 קטעים מתוך 80/);
});

test('a long first article cannot hide a later matching article under the result cap', () => {
 const firstEntries = Array.from({length: 60}, (_, number) => ({id: 'paragraph-' + number, heading: 'קשר', text: 'כלב וקשר'}));
 const result = api.search(api.buildIndex([
  {title: 'ראשון', url: origin + '/pages/articles/first/', entries: firstEntries},
  {title: 'שני', url: origin + '/pages/articles/second/', entries: [{id: 'only-paragraph', heading: 'משחק', text: 'כלב ומשחק'}]}
 ]), 'כלב');
 assert.equal(result.total, 61);
 assert.equal(result.visible, 50);
 assert.equal(result.articleCount, 2);
 assert.deepEqual(Array.from(result.groups, group => group.title), ['ראשון', 'שני']);
 assert.deepEqual(Array.from(result.groups, group => group.entries.length), [49, 1]);
 assert.equal(result.groups[0].entries[48].id, 'paragraph-48');
 assert.equal(result.groups[1].entries[0].id, 'only-paragraph');
 assert.match(api.statusText(result), /50 קטעים מתוך 61/);
});

test('snippet preserves real marked source characters and provides a relevant short excerpt', () => {
 const prefix = 'טקסט שאינו רלוונטי. '.repeat(25);
 const text = prefix + 'הַקֶּשֶׁר ותחושת ביטחון נמצאים כאן. ' + 'המשך ארוך. '.repeat(30);
 const index = api.buildIndex([{title: 'בדיקה', url: origin + '/pages/articles/test/', entries: [{id: 'paragraph', heading: '', text}]}]);
 const result = api.search(index, 'קשר ביטחון');
 const entry = result.groups[0].entries[0];
 const excerpt = api.snippet(entry);
 assert.equal(excerpt.prefix, true);
 assert.equal(excerpt.suffix, true);
 assert.ok(excerpt.parts.map(part => part.text).join('').length <= 150);
 assert.equal(excerpt.parts.filter(part => part.match).map(part => part.text).join('|'), 'קֶּשֶׁר|ביטחון');
});

class FakeNode {
 constructor(tag) { this.tagName = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.hidden = false; this.disabled = false; this.value = ''; this._text = ''; }
 set textContent(value) { this._text = String(value); this.children = []; }
 get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
 set innerHTML(_) { throw new Error('Unsafe innerHTML'); }
 append(...nodes) { this.children.push(...nodes); }
 setAttribute(name, value) { this.attributes[name] = String(value); }
 replaceChildren(...nodes) { this._text = ''; this.children = nodes; }
 addEventListener(type, callback) { this.listeners[type] = callback; }
 querySelector(selector) { return this.selectors?.[selector] || null; }
 focus() { this.focused = true; }
 fire(type) { const event = {preventDefault() { this.prevented = true; }}; this.listeners[type]?.(event); return event; }
}

function DOM() {
 const root = new FakeNode('section');
 root.hidden = true;
 const form = new FakeNode('form');
 const input = new FakeNode('input');
 const clear = new FakeNode('button');
 const status = new FakeNode('p');
 const results = new FakeNode('div');
 const list = new FakeNode('div');
 root.selectors = {
  '[data-article-search-form]': form, '[data-article-search-input]': input,
  '[data-article-search-clear]': clear, '[data-article-search-status]': status, '[data-article-search-results]': results
 };
 const doc = {
  querySelector(selector) { return selector === '[data-article-search]' ? root : selector === '[data-article-list]' ? list : null; },
  createElement(tag) { return new FakeNode(tag); },
  createTextNode(text) { const node = new FakeNode('#text'); node.textContent = text; return node; }
 };
 return {doc, root, form, input, clear, status, results, list};
}

test('search UI handles empty/search/no-result/clear without URL, history, network or storage access', () => {
 const h = DOM();
 api.initialize(h.doc, sample());
 assert.equal(h.root.hidden, false);
 assert.equal(h.list.hidden, false);
 assert.equal(h.results.hidden, true);
 assert.equal(h.clear.disabled, true);
 h.input.value = 'משחק קשר';
 assert.equal(h.form.fire('submit').prevented, true);
 assert.equal(h.list.hidden, true);
 assert.equal(h.results.hidden, false);
 assert.equal(h.results.children.length, 1);
 assert.match(h.status.textContent, /2 קטעים במאמר אחד/);
 const result = h.results.children[0].children[1];
 const link = result.children[result.children.length - 1];
 assert.equal(link.href, origin + '/pages/articles/first-article/#section-1-paragraph-1');
 assert.equal(link.textContent, 'למקום במאמר');
 assert.equal(link.attributes['aria-label'], 'למקום במאמר קשר ומשחק — קשר בטוח');
 assert.ok(!link.attributes['aria-label'].includes('משחק קשר'));
 assert.ok(!link.href.includes('משחק'));
 h.input.value = 'איןתוצאה';
 h.form.fire('submit');
 assert.equal(h.results.children.length, 0);
 assert.equal(h.list.hidden, true);
 assert.match(h.status.textContent, /לא נמצאו/);
 h.clear.fire('click');
 assert.equal(h.input.value, '');
 assert.equal(h.input.focused, true);
 assert.equal(h.list.hidden, false);
 assert.equal(h.results.hidden, true);
 assert.equal(h.results.children.length, 0);
 assert.equal(h.clear.disabled, true);
});

test('typing is debounced, submitting is immediate, and clearing cancels stale results', context => {
 context.mock.timers.enable({apis: ['setTimeout']});
 const h = DOM();
 api.initialize(h.doc, sample());
 h.input.value = 'משחק';
 h.input.fire('input');
 assert.equal(h.list.hidden, false);
 context.mock.timers.tick(179);
 assert.equal(h.list.hidden, false);
 context.mock.timers.tick(1);
 assert.equal(h.list.hidden, true);
 assert.equal(h.results.children.length, 2);
 h.input.value = 'קשר';
 h.input.fire('input');
 h.clear.fire('click');
 context.mock.timers.tick(180);
 assert.equal(h.list.hidden, false);
 assert.equal(h.results.children.length, 0);
});

test('markup-like index and query content are displayed as text, never parsed as elements', () => {
 const h = DOM();
 const malicious = '<img src=x onerror=alert(1)> משחק <script>alert(1)</script>';
 api.initialize(h.doc, [{title: malicious, url: origin + '/pages/articles/test/', entries: [{id: 'paragraph', heading: malicious, text: malicious}]}]);
 h.input.value = 'משחק';
 h.form.fire('submit');
 assert.ok(h.results.textContent.includes('<img src=x'));
 assert.ok(h.results.textContent.includes('<script>'));
 const tags = [];
 function visit(node) { tags.push(node.tagName); for (const child of node.children) visit(child); }
 visit(h.results);
 assert.ok(!tags.includes('img'));
 assert.ok(!tags.includes('script'));
 assert.ok(tags.includes('mark'));
});

test('missing or invalid data leaves ordinary article list usable', () => {
 const h = DOM();
 assert.equal(api.initialize(h.doc, [{title: 'bad', url: 'javascript:alert(1)', entries: []}]), null);
 assert.equal(h.root.hidden, true);
 assert.equal(h.list.hidden, false);
 assert.equal(h.form.listeners.submit, undefined);
});
