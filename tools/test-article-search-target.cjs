'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/article-search-target.js'), 'utf8');

function fixture({hash = '#article-paragraph-1', readyState = 'interactive', anchor = true, ancestors = []} = {}) {
 const calls = [], lookups = [], documentHandlers = {}, windowHandlers = {};
 const forbidden = () => { throw new Error('Anchor navigation must not access queries, history, storage, network or measurement'); };
 const target = {
  parentElement: null,
  classList: {contains(name) { assert.equal(name, 'article-anchor'); return anchor; }},
  focus(options) { calls.push(['focus', {...options}]); },
  scrollIntoView(options) { calls.push(['scroll', {...options}]); }
 };
 let child = target;
 const parents = ancestors.map((tagName, index) => {
  let open = false;
  const parent = {tagName, parentElement: null};
  Object.defineProperty(parent, 'open', {
   get() { return open; },
   set(value) { assert.equal(tagName, 'DETAILS'); open = value; calls.push(['open', index, value]); }
  });
  child.parentElement = parent;
  child = parent;
  return parent;
 });
 const currentLocation = new Proxy({}, {
  get(_, key) { if (key === 'hash') return hash; return forbidden(); },
  set: forbidden
 });
 const sandbox = {
  document: {
   readyState,
   getElementById(id) { lookups.push(id); return id === 'article-paragraph-1' ? target : null; },
   addEventListener(name, handler, options) { documentHandlers[name] = {handler, options: {...options}}; }
  },
  window: new Proxy({}, {
   get(_, key) {
    if (key === 'location') return currentLocation;
    if (key === 'addEventListener') return (name, handler) => { windowHandlers[name] = handler; };
    return forbidden();
   },
   set: forbidden
  })
 };
 for (const name of ['location', 'history', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'navigator', 'dataLayer', 'gtag']) {
  Object.defineProperty(sandbox, name, {get: forbidden, set: forbidden});
 }
 vm.runInNewContext(source, sandbox, {filename: 'docs/article-search-target.js'});
 return {
  calls, lookups, parents, documentHandlers, windowHandlers,
  changeHash(value) { hash = value; windowHandlers.hashchange(); }
 };
}

test('a deferred script focuses and scrolls the authored target without waiting for load', () => {
 const page = fixture();
 assert.deepEqual(page.calls, [
  ['focus', {preventScroll: true}],
  ['scroll', {block: 'start', behavior: 'auto'}]
 ]);
 assert.deepEqual(page.lookups, ['article-paragraph-1']);
 assert.deepEqual(page.documentHandlers, {});
 assert.deepEqual(Object.keys(page.windowHandlers), ['hashchange']);
});

test('a source target opens every ancestor details before focus and scroll', () => {
 const page = fixture({ancestors: ['DIV', 'DETAILS', 'SECTION', 'DETAILS']});
 assert.deepEqual(page.calls, [
  ['open', 1, true], ['open', 3, true],
  ['focus', {preventScroll: true}],
  ['scroll', {block: 'start', behavior: 'auto'}]
 ]);
 assert.equal(page.parents[1].open, true);
 assert.equal(page.parents[3].open, true);
});

test('execution before DOM readiness waits for DOMContentLoaded once', () => {
 const page = fixture({readyState: 'loading'});
 assert.deepEqual(page.calls, []);
 assert.deepEqual(page.lookups, []);
 assert.deepEqual(Object.keys(page.documentHandlers), ['DOMContentLoaded']);
 assert.deepEqual(page.documentHandlers.DOMContentLoaded.options, {once: true});
 page.documentHandlers.DOMContentLoaded.handler();
 assert.equal(page.calls[0][0], 'focus');
 assert.equal(page.calls[1][0], 'scroll');
});

test('empty, malformed, unrelated and unknown hashes leave the page alone', () => {
 for (const hash of ['', '#main', '#article-', '#article-%E0%A4%A', '#article-paragraph-1%0A', '#article-paragraph-1?term=private', '#article-paragraph-1/child', '#article-missing']) {
  const page = fixture({hash});
  assert.deepEqual(page.calls, [], hash);
 }
});

test('an existing element without the authored anchor class is ignored', () => {
 const page = fixture({anchor: false, ancestors: ['DETAILS']});
 assert.deepEqual(page.calls, []);
 assert.equal(page.parents[0].open, false);
});

test('hash changes reveal decoded targets and ignore later invalid values', () => {
 const page = fixture({hash: '#main', readyState: 'complete'});
 assert.deepEqual(page.calls, []);
 page.changeHash('#%61rticle-paragraph-1');
 assert.deepEqual(page.lookups, ['article-paragraph-1']);
 assert.deepEqual(page.calls, [
  ['focus', {preventScroll: true}],
  ['scroll', {block: 'start', behavior: 'auto'}]
 ]);
 page.changeHash('#article-%FF');
 page.changeHash('#other-section');
 assert.equal(page.calls.length, 2);
});
