// Verify the draft/public boundary and links without publishing or loading trackers.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const articles = require('./articles-content.cjs');
const articleRoute = require('./article-routes.cjs');
const vm = require('node:vm');
const {searchIndex} = require('./article-search-model.cjs');
const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const previewRoot = path.join(root, 'artifacts/preview/article-pages');
const origin = 'https://derech-hakelev.com';

for (const args of [['--check'], ['--preview', '--check']]) {
 execFileSync(process.execPath, [path.join(__dirname, 'build-article-pages.cjs'), ...args], {cwd: root, stdio: 'pipe'});
}
const map = fs.readFileSync(path.join(docs, 'sitemap.xml'), 'utf8');
const expectedIndex = searchIndex(articles);
for (const directory of [docs, previewRoot]) {
 const context = {window: {}};
 vm.runInNewContext(fs.readFileSync(path.join(directory, 'article-search-index.js'), 'utf8'), context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.window.DERECH_ARTICLE_SEARCH)), expectedIndex, 'Search index includes only approved articles.');
}
const hub = fs.readFileSync(path.join(docs, 'pages/articles/index.html'), 'utf8');
assert.match(hub, /data-article-search data-clarity-mask="true"/);
assert.match(hub, /data-article-search-input type="search"/);
assert.match(hub, /class="articles-list" data-article-list>/, 'The ordinary list remains available without JavaScript.');
for (const record of expectedIndex) {
 const html = fs.readFileSync(path.join(docs, new URL(record.url).pathname, 'index.html'), 'utf8');
 const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
 assert.equal(new Set(ids).size, ids.length, 'No duplicate IDs in article.');
 for (const entry of record.entries) assert.ok(html.includes('id="' + entry.id + '" class="article-anchor'), 'Search link resolves to an actual article anchor.');
 assert.equal((html.match(/src="[^"]*article-search-target\.js\?/g) || []).length, 1);
}
let references = 0;
const routes = ['pages/articles/', ...articles.map(articleRoute)];
for (const route of routes) {
 const html = fs.readFileSync(path.join(previewRoot, route, 'index.html'), 'utf8');
 assert.match(html, /<html lang="he" dir="rtl">/);
 assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
 assert.equal((html.match(/<h1\b/g) || []).length, 1);
 assert.match(html, /class="skip-link" href="#main"/);
 assert.ok(html.includes('<link rel="canonical" href="' + origin + '/' + route + '">'));
 assert.doesNotMatch(html, /<iframe\b|<script type="application\/ld\+json">/);
 assert.equal((html.match(/src="[^"]*analytics\.js\?/g) || []).length, 1);
 assert.equal((html.match(/src="[^"]*measurement\.js\?/g) || []).length, 1);
 for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const href = match[1].replace(/&amp;/g, '&');
  if (href.startsWith('#') || /^[a-z][a-z\d+.-]*:|^\/\//i.test(href)) continue;
  const target = new URL(href, origin + '/' + route).pathname;
  const previewFile = path.join(previewRoot, target);
  let file = fs.existsSync(previewFile) ? previewFile : path.join(docs, target);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  assert.ok(fs.existsSync(file), route + ': broken local link ' + href);
  references++;
 }
 for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
  for (const candidate of match[1].split(',')) {
   const [source, width] = candidate.trim().split(/\s+/);
   assert.match(width, /^\d+w$/, 'Responsive images need width descriptors.');
   const target = new URL(source, origin + '/' + route).pathname;
   assert.ok(fs.existsSync(path.join(docs, target)), route + ': broken responsive image ' + source);
   references++;
  }
 }
}
for (const article of articles) {
 const relative = articleRoute(article);
 const html = fs.readFileSync(path.join(previewRoot, relative, 'index.html'), 'utf8');
 if (article.image) {
  assert.match(html, /<img class="article-photo"[^>]+width="\d+" height="\d+" alt="[^"]+"[^>]+fetchpriority="high"/);
  assert.ok(html.includes(article.image.alt), 'Hero photo needs its authored alternative text.');
  assert.match(html, /<meta property="og:image" content="https:\/\/derech-hakelev.com\/assets\/optimized\/home\/slider\//);
 }
 if (article.references?.length) {
  const disclosure = html.match(/<details\b[^>]*class="article-references"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(disclosure, 'Sources need a native disclosure.');
  assert.doesNotMatch(disclosure.match(/^<details[^>]*>/)[0], /\sopen(?:\s|=|>)/, 'Sources start closed.');
  assert.match(disclosure, /<summary>מקורות<\/summary>/);
  assert.ok(disclosure.includes('id="research-sources"'));
  for (const reference of article.references) {
   if (reference.url) assert.ok(html.includes('href="' + reference.url + '"'), 'Missing authored research link.');
  }
 }
 if (article.next?.path.includes('#')) {
  const [page, fragment] = article.next.path.split('#');
  assert.ok(fs.readFileSync(path.join(docs, page), 'utf8').includes('id="' + fragment + '"'), 'Article continuation needs an existing target.');
 }
 if (article.status === 'draft') {
  assert.ok(!fs.existsSync(path.join(docs, relative)), 'Draft output must stay outside docs.');
  assert.ok(!map.includes(origin + '/' + relative), 'Draft must not enter the public sitemap.');
 } else {
  const publicFile = path.join(docs, relative, 'index.html');
  assert.ok(fs.existsSync(publicFile));
  const published = fs.readFileSync(publicFile, 'utf8');
  assert.doesNotMatch(published, /noindex|article-preview-note|טיוטה לבדיקה|\*\*/);
  const schema = JSON.parse(published.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert.equal(schema?.['@type'], 'Article');
  assert.equal(schema.headline, article.title);
  assert.equal(schema.datePublished, article.publishedOn);
  assert.equal(schema.author.name, article.author);
  if (article.seoTitle) assert.ok(published.includes('<title>' + article.seoTitle + '</title>'));
  assert.ok(schema.image?.startsWith(origin + '/assets/optimized/'));
  assert.ok(published.includes('<time datetime="' + article.publishedOn + '">'));
  const canonical = origin + '/' + relative;
  assert.equal((published.match(/data-article-share\b/g) || []).length, 2, 'Share controls at the start and end of each article.');
  assert.equal((published.match(/src="[^"]*article-share\.js\?/g) || []).length, 1, 'Load sharing once per article.');
  for (const match of published.matchAll(/data-share-url="([^"]+)"/g)) assert.equal(match[1], canonical);
  const whatsappLinks = [...published.matchAll(/href="(https:\/\/wa\.me\/\?text=[^"]+)"/g)];
  const facebookLinks = [...published.matchAll(/href="(https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=[^"]+)"/g)];
  assert.equal(whatsappLinks.length, 2);
  assert.equal(facebookLinks.length, 2);
  for (const [, link] of whatsappLinks) assert.equal(new URL(link).searchParams.get('text'), article.title + '\n' + canonical);
  for (const [, link] of facebookLinks) assert.equal(new URL(link).searchParams.get('u'), canonical);
  for (const position of ['top', 'bottom']) {
   assert.ok(published.includes('id="share-status-' + position + '" data-share-status role="status" aria-live="polite"'));
   assert.ok(published.includes('<label for="share-url-' + position + '">'));
   assert.ok(published.includes('id="share-url-' + position + '" data-share-input type="text" value="' + canonical + '" dir="ltr" readonly'));
  }
  assert.ok(map.includes(origin + '/' + relative));
 }
}
console.log('PASS: article draft/public separation, current generators, ' + routes.length + ' preview pages, ' + references + ' local links, published metadata/schema, scripts and sitemap.');
