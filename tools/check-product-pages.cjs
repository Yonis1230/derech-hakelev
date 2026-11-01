/* Check generated public product content and local references without a server. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, readSources, renderPage, productContent} = require('./build-product-pages.cjs');

const docs = path.resolve(__dirname, '../docs');
const origin = 'https://derech-hakelev.com';
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attribute = (tag, name) => decode(tag.match(new RegExp('\\b' + name + '="([^"]*)"'))?.[1] || '');
const schemaFrom = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const sources = readSources();

build({check: true});
const seenTitles = new Set(), seenCanonicals = new Set();
let imageCount = 0, localReferences = 0;

function checkReference(value, directory) {
 if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return;
 const relative = decodeURIComponent(value.split(/[?#]/)[0]);
 const resolved = path.resolve(directory, relative);
 assert.ok(resolved.startsWith(docs + path.sep), 'Local reference escaped docs: ' + value);
 const file = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? path.join(resolved, 'index.html') : resolved;
 assert.ok(fs.existsSync(file), 'Missing local reference: ' + path.relative(docs, file));
 localReferences++;
}

for (const product of sources.catalog) {
 const filename = path.join(docs, 'pages/games/products', product.id, 'index.html');
 const directory = path.dirname(filename);
 const html = fs.readFileSync(filename, 'utf8');
 const canonical = origin + '/pages/games/products/' + product.id + '/';
 const title = html.match(/<title>([^<]+)<\/title>/)[1];
 assert.ok(!seenTitles.has(title), 'Duplicate product title: ' + product.id);
 seenTitles.add(title);
 assert.ok(!seenCanonicals.has(canonical));
 seenCanonicals.add(canonical);
 assert.equal((html.match(/<h1\b/g) || []).length, 1, product.id + ': one primary heading');
 assert.ok(html.includes('<h1 id="product-title">' + product.name + '</h1>'));
 assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
 assert.ok(html.includes('lang="he" dir="rtl"'));
 assert.ok(html.includes('data-base="../../../../"'));
 const introPosition = html.indexOf('<section class="product-intro"');
 const galleryPosition = html.indexOf('<section class="product-gallery"');
 const copyPosition = html.indexOf('<div class="product-copy"');
 assert.ok(introPosition > -1 && galleryPosition > introPosition && copyPosition > galleryPosition, 'Native mobile order must be introduction, photos/video, full description');
 assert.ok(html.indexOf('data-placement="product_top"') < galleryPosition, 'Initial order link must precede media');
 assert.ok(html.indexOf('data-placement="product_bottom"') > copyPosition, 'Second order link must follow the full description');
 assert.ok(!/\bhidden\b/.test(html.match(/<div class="product-description"[^>]*>/)[0]), 'Product details must be available without JavaScript');
 assert.ok(!/<h[34]\b/.test(html.slice(html.indexOf('<main'), html.indexOf('</main>'))), 'Product subsections follow h1 with h2');
 assert.ok(!/<p>\s*מחיר:/.test(html), 'Legacy duplicated price remains in ' + product.id);
 const schema = schemaFrom(html);
 const item = schema['@graph'].find(entry => entry['@type'] === 'Product');
 assert.equal(item.name, product.name);
 assert.equal(item.description, product.summary);
 assert.equal(item.offers.price, product.price);
 assert.equal(item.offers.priceCurrency, 'ILS');
 assert.equal(item.offers.availability, 'https://schema.org/' + (product.outOfStock ? 'OutOfStock' : 'InStock'));
 assert.equal(item.offers.url, canonical);
 assert.ok(!('aggregateRating' in item) && !('review' in item));
 assert.equal('image' in item, product.images.length > 0, 'No invented product image');
 const breadcrumbs = schema['@graph'].find(entry => entry['@type'] === 'BreadcrumbList');
 assert.equal(breadcrumbs.itemListElement.length, 3);
 assert.equal(breadcrumbs.itemListElement[2].item, canonical);
 const expectedOrder = productContent(product).orderUrl;
 const orderLinks = html.match(/<a\b[^>]*class="button product-order-link"[^>]*>/g) || [];
 assert.equal(orderLinks.length, 2);
 for (const link of orderLinks) {
  assert.equal(attribute(link, 'href'), expectedOrder);
  assert.equal(attribute(link, 'data-product-id'), product.id);
  assert.ok(new URL(attribute(link, 'href')).searchParams.get('text').includes(product.name));
 }
 const galleryHtml = html.match(/<section class="product-gallery"[\s\S]*?<\/section>/)[0];
 const productImageTags = galleryHtml.match(/<img\b[^>]*>/g) || [];
 assert.equal(productImageTags.length, product.images.length);
 productImageTags.forEach((tag, index) => {
  assert.ok(attribute(tag, 'width') && attribute(tag, 'height') && attribute(tag, 'alt'));
  assert.equal(attribute(tag, 'loading'), index === 0 ? 'eager' : 'lazy');
  assert.ok(attribute(tag, 'srcset'), 'Responsive product image missing');
 });
 imageCount += productImageTags.length;
 const iframeTags = html.match(/<iframe\b[^>]*>/g) || [];
 for (const iframe of iframeTags) {
  assert.ok(!/(?:\s)src=/.test(iframe), 'Video must wait for the shared embed/consent control');
  assert.ok(attribute(iframe, 'data-src'));
  assert.ok(html.includes('<noscript><p>לצפייה בסרטון ההסבר, השתמשו בקישור ל־YouTube.</p></noscript>'));
 }
 for (const tag of html.match(/<(?:a|img|script|link)\b[^>]*>/g) || []) {
  for (const name of ['href', 'src']) checkReference(attribute(tag, name), directory);
  for (const candidate of attribute(tag, 'srcset').split(',').filter(Boolean)) checkReference(candidate.trim().split(/\s+/)[0], directory);
 }
}

// A future price/stock edit must update visible and structured data together;
// the old HTML price in the source details must not leak into generated pages.
const changedProduct = {...sources.catalog[0], price: 123, outOfStock: true};
const changed = renderPage(changedProduct, sources);
assert.ok(changed.includes('<strong>123 ₪</strong> · אזל מהמלאי'));
assert.equal(schemaFrom(changed)['@graph'][0].offers.price, 123);
assert.equal(schemaFrom(changed)['@graph'][0].offers.availability, 'https://schema.org/OutOfStock');
const escaped = renderPage({...sources.catalog[0], name: '</script><script>bad()</script>', summary: '</script><script>bad()</script>'}, sources);
assert.equal(schemaFrom(escaped)['@graph'][0].name, '</script><script>bad()</script>');
assert.ok(!escaped.includes('<script>bad()</script>'));

// The shared shell is deliberately rebuilt from the home page. A future footer
// change must reach products and keep links relative to the product directory.
const footerProbe = '<a href="pages/privacy/">בדיקת קישור מדיניות</a>';
const revisedHome = sources.home.replace('</footer>', footerProbe + '</footer>');
assert.notEqual(revisedHome, sources.home, 'Expected a real home-page footer');
const revisedShell = renderPage(sources.catalog[0], {...sources, home: revisedHome});
assert.ok(revisedShell.includes('<a href="../../../../pages/privacy/">בדיקת קישור מדיניות</a>'), 'Shared footer changes must propagate with correct relative paths');
assert.throws(() => renderPage(sources.catalog[0], {...sources, home: sources.home.replace(/<footer\b/, '<div')}), /Shared home navigation, contact or footer was not found/, 'A missing shared footer must not silently produce a broken page');

console.log(JSON.stringify({products: sources.catalog.length, images: imageCount, localReferences, checks: 'passed'}));
