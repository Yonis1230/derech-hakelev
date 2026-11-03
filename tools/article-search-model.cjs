'use strict';
const crypto = require('node:crypto');
const articleRoute = require('./article-routes.cjs');

function plain(value) {
 return String(value).replace(/<a\b[^>]*>([^<>]*)<\/a>/g, '$1').replace(/\*\*|\*/g, '').replace(/\s+/g, ' ').trim();
}

// One model supplies both HTML anchors and the local search index.
function articleDocument(article) {
 const entries = [], seen = new Map();
 function entry(kind, value, heading) {
  const text = plain(value);
  const stem = 'article-' + kind + '-' + crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
  const count = (seen.get(stem) || 0) + 1;
  seen.set(stem, count);
  const item = {id: stem + (count === 1 ? '' : '-' + count), heading: plain(heading), text};
  entries.push(item);
  return item;
 }
 const title = entry('title', article.title, 'תחילת המאמר');
 const intro = entry('paragraph', article.intro, 'פתיחת המאמר');
 const opening = (article.openingParagraphs || []).map(text => entry('paragraph', text, 'פתיחת המאמר'));
 const sections = article.sections.map(section => {
  const heading = entry('heading', section.heading, section.heading);
  const blocks = (section.blocks || section.paragraphs.map(text => ({type: 'paragraph', text}))).map(block => {
   if (block.type === 'list') return {...block, items: block.items.map(text => ({raw: text, ...entry('item', text, section.heading)}))};
   return {...block, ...entry('paragraph', block.text, section.heading), raw: block.text};
  });
  return {heading, rawHeading: section.heading, blocks};
 });
 const references = (article.references || []).map(reference => entry('reference', [reference.title, reference.workTitle, reference.description, reference.note].filter(Boolean).join(' '), 'מקורות'));
 return {title, intro, opening, sections, references, record: {title: article.title, url: 'https://derech-hakelev.com/' + articleRoute(article), entries}};
}

function searchIndex(articles) {
 return articles.filter(article => article.status === 'approved').map(article => articleDocument(article).record);
}

module.exports = {articleDocument, searchIndex, plain};
