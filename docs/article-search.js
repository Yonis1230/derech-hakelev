/* Search stays in this browser. Query text is never sent or saved. */
(function (root, factory) {
 'use strict';
 const api = factory();
 if (typeof module === 'object' && module.exports) {
  module.exports = api;
  return;
 }
 if (typeof document === 'undefined') return;
 const start = () => api.initialize(document, root.DERECH_ARTICLE_SEARCH);
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
 else start();
})(typeof window === 'undefined' ? globalThis : window, function () {
 'use strict';
 const origin = 'https://derech-hakelev.com';
 const maxResults = 50;

 function normalizedText(value) {
  const text = String(value);
  const offsets = [];
  let normalized = '';
  let cursor = 0;
  for (const character of text) {
   const start = cursor;
   cursor += character.length;
   const folded = character.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[’‘`´׳]/g, "'").replace(/[“”„״]/g, '"').replace(/[‐‑‒–—−]/g, '-');
   if (!folded && offsets.length) offsets[offsets.length - 1].end = cursor;
   for (const point of folded) {
    normalized += point;
    for (let i = 0; i < point.length; i++) offsets.push({start, end: cursor});
   }
  }
  return {text, normalized, offsets};
 }

 function normalize(value) { return normalizedText(value).normalized; }

 function safeURL(value) {
  if (typeof value !== 'string') return null;
  try {
   const url = new URL(value);
   if (url.origin !== origin || url.username || url.password || url.search || url.hash ||
    !/^\/(?:pages\/)?articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)) return null;
   return url.href;
  } catch { return null; }
 }

 function buildIndex(data) {
  if (!Array.isArray(data)) return [];
  const seenURLs = new Set();
  const articles = [];
  for (const item of data) {
   if (!item || typeof item.title !== 'string' || !item.title.trim() || !Array.isArray(item.entries)) continue;
   const url = safeURL(item.url);
   if (!url || seenURLs.has(url)) continue;
   const seenIDs = new Set();
   const entries = [];
   for (const entry of item.entries) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(entry.id) || seenIDs.has(entry.id) ||
     typeof entry.text !== 'string' || !entry.text.trim() || typeof entry.heading !== 'string') continue;
    const mapped = normalizedText(entry.text);
    entries.push({id: entry.id, heading: entry.heading, ...mapped});
    seenIDs.add(entry.id);
   }
   if (!entries.length) continue;
   articles.push({title: item.title, url, entries});
   seenURLs.add(url);
  }
  return articles;
 }

 function mergeRanges(ranges) {
  const result = [];
  for (const range of ranges.sort((a, b) => a.start - b.start || a.end - b.end)) {
   const last = result[result.length - 1];
   if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
   else result.push({...range});
  }
  return result;
 }

 function matchingRanges(entry, tokens) {
  if (!tokens.every(token => entry.normalized.includes(token))) return null;
  const ranges = [];
  for (const token of tokens) {
   let cursor = 0;
   let found;
   while ((found = entry.normalized.indexOf(token, cursor)) !== -1) {
    ranges.push({start: entry.offsets[found].start, end: entry.offsets[found + token.length - 1].end});
    cursor = found + token.length;
   }
  }
  return mergeRanges(ranges);
 }

 function search(index, value) {
  const query = String(value || '').trim().slice(0, 100).trim();
  const tokens = [...new Set(normalize(query).match(/[\p{L}\p{N}]+(?:['"][\p{L}\p{N}]+)*/gu) || [])];
  const state = {query, total: 0, visible: 0, articleCount: 0, groups: []};
  if (!query || !tokens.length) return state;
  const matchingGroups = [];
  for (const article of index) {
   const group = {title: article.title, url: article.url, entries: []};
   for (const entry of article.entries) {
    const matches = matchingRanges(entry, tokens);
    if (!matches) continue;
    state.total++;
    group.entries.push({id: entry.id, heading: entry.heading, text: entry.text, matches});
   }
   if (group.entries.length) matchingGroups.push(group);
  }
  state.articleCount = matchingGroups.length;
  // Share the display budget across articles so a long first article cannot
  // conceal all matches in a later one. Groups and paragraphs retain their order.
  const counts = matchingGroups.map(() => 0);
  while (state.visible < Math.min(state.total, maxResults)) {
   for (let i = 0; i < matchingGroups.length && state.visible < maxResults; i++) {
    if (counts[i] < matchingGroups[i].entries.length) {
     counts[i]++;
     state.visible++;
    }
   }
  }
  state.groups = matchingGroups.flatMap((group, i) => counts[i] ? [{...group, entries: group.entries.slice(0, counts[i])}] : []);
  return state;
 }

 function snippet(entry, length = 150) {
  const first = entry.matches[0];
  let start = Math.max(0, first.start - 50);
  let end = Math.min(entry.text.length, start + length);
  if (start) {
   const boundary = entry.text.slice(start, Math.min(start + 20, first.start)).search(/\s/u);
   if (boundary !== -1) start += boundary + 1;
  }
  if (end < entry.text.length) {
   const lastSpace = entry.text.slice(Math.max(start, end - 20), end).lastIndexOf(' ');
   if (lastSpace !== -1 && end - 20 + lastSpace > first.end) end = Math.max(start, end - 20) + lastSpace;
  }
  const parts = [];
  let cursor = start;
  for (const match of entry.matches) {
   const from = Math.max(start, match.start);
   const to = Math.min(end, match.end);
   if (to <= from) continue;
   if (from > cursor) parts.push({text: entry.text.slice(cursor, from), match: false});
   parts.push({text: entry.text.slice(from, to), match: true});
   cursor = to;
  }
  if (cursor < end) parts.push({text: entry.text.slice(cursor, end), match: false});
  return {prefix: start > 0, suffix: end < entry.text.length, parts};
 }

 function statusText(state) {
  if (!state.query) return 'חפשו מילה או נושא מתוך המאמרים.';
  if (!state.total) return 'לא נמצאו תוצאות. אפשר לנסות מילה אחרת.';
  let text = state.total === 1 ? 'נמצא קטע אחד' : 'נמצאו ' + state.total + ' קטעים';
  text += state.articleCount === 1 ? ' במאמר אחד.' : ' ב־' + state.articleCount + ' מאמרים.';
  if (state.total > state.visible) text += ' מוצגים ' + state.visible + ' קטעים מתוך ' + state.total + '. נסו חיפוש ממוקד יותר.';
  return text;
 }

 function initialize(doc, data) {
  const root = doc.querySelector('[data-article-search]');
  if (!root) return null;
  const form = root.querySelector('[data-article-search-form]');
  const input = root.querySelector('[data-article-search-input]');
  const clear = root.querySelector('[data-article-search-clear]');
  const status = root.querySelector('[data-article-search-status]');
  const results = root.querySelector('[data-article-search-results]');
  const list = doc.querySelector('[data-article-list]');
  if (!form || !input || !clear || !status || !results || !list) return null;
  const index = buildIndex(data);
  if (!index.length) return null;
  let timer;
  input.maxLength = 100;
  root.hidden = false;

  function element(tag, className, text) {
   const node = doc.createElement(tag);
   node.className = className;
   if (text !== undefined) node.textContent = text;
   return node;
  }
  function render() {
   const state = search(index, input.value);
   clear.disabled = !state.query;
   list.hidden = Boolean(state.query);
   results.hidden = !state.query;
   results.replaceChildren();
   status.textContent = statusText(state);
   for (const group of state.groups) {
    const section = element('section', 'article-search-group');
    section.append(element('h3', 'article-search-title', group.title));
    for (const entry of group.entries) {
     const result = element('article', 'article-search-result');
     if (entry.heading) result.append(element('h4', 'article-search-heading', entry.heading));
     const paragraph = element('p', 'article-search-snippet');
     const excerpt = snippet(entry);
     if (excerpt.prefix) paragraph.append(doc.createTextNode('… '));
     for (const part of excerpt.parts) {
      paragraph.append(part.match ? element('mark', '', part.text) : doc.createTextNode(part.text));
     }
     if (excerpt.suffix) paragraph.append(doc.createTextNode(' …'));
     const link = element('a', 'article-search-link', 'למקום במאמר');
     link.href = group.url + '#' + entry.id;
     link.setAttribute('aria-label', 'למקום במאמר ' + group.title + (entry.heading ? ' — ' + entry.heading : ''));
     result.append(paragraph, link);
     section.append(result);
    }
    results.append(section);
   }
  }
  input.addEventListener('input', () => {
   clearTimeout(timer);
   clear.disabled = !input.value.trim();
   if (!input.value.trim()) render();
   else timer = setTimeout(render, 180);
  });
  form.addEventListener('submit', event => {
   event.preventDefault();
   clearTimeout(timer);
   render();
  });
  clear.addEventListener('click', () => {
   clearTimeout(timer);
   input.value = '';
   render();
   input.focus();
  });
  render();
  return {render};
 }

 return {normalize, buildIndex, search, snippet, statusText, initialize};
});
