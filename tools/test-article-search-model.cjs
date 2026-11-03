'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {articleDocument, searchIndex, plain} = require('./article-search-model.cjs');
const article = () => ({slug: 'example', status: 'approved', title: 'קשר עם כלבים', intro: 'תחילת **המאמר**', openingParagraphs: ['עוד מחשבה'], sections: [
 {heading: 'משחק משותף', blocks: [{type: 'paragraph', text: 'אותו קטע'}, {type: 'note', text: 'אותו קטע'}, {type: 'list', items: ['סבלנות', '*קשר*']}]}],
 references: [{title: 'Author (2026)', workTitle: 'Research', description: 'המחקר על קשר', note: 'הערת מקור'}]});

test('search entries cover headings, authored text, lists and collapsed references', () => {
 const result = articleDocument(article());
 assert.equal(result.record.entries.length, 9);
 assert.equal(result.record.entries[0].text, 'קשר עם כלבים');
 assert.equal(result.intro.text, 'תחילת המאמר');
 assert.equal(result.sections[0].blocks[1].raw, 'אותו קטע');
 assert.equal(result.sections[0].blocks[2].items[1].text, 'קשר');
 assert.equal(result.sections[0].blocks[2].items[1].raw, '*קשר*');
 assert.equal(result.references[0].heading, 'מקורות');
 assert.equal(result.references[0].text, 'Author (2026) Research המחקר על קשר הערת מקור');
});

test('all target IDs are unique and contain no authored words; duplicate prose still has its own target', () => {
 const result = articleDocument(article());
 const ids = result.record.entries.map(entry => entry.id);
 assert.equal(new Set(ids).size, ids.length);
 assert.ok(ids.every(id => /^article-[a-z]+-[a-f0-9]{12}(?:-\d+)?$/.test(id)));
 assert.notEqual(result.sections[0].blocks[0].id, result.sections[0].blocks[1].id);
});

test('anchor IDs survive unrelated paragraphs moving or being added', () => {
 const first = articleDocument(article());
 const changed = article();
 changed.sections[0].blocks.unshift({type: 'paragraph', text: 'פסקה חדשה לגמרי'});
 const second = articleDocument(changed);
 assert.equal(first.intro.id, second.intro.id);
 assert.equal(first.sections[0].blocks[2].items[0].id, second.sections[0].blocks[3].items[0].id);
 assert.equal(first.references[0].id, second.references[0].id);
});

test('index includes only published content, preserves order and both existing URL styles', () => {
 const first = article(), last = {...article(), slug: 'another', route: 'articles/another/'};
 const records = searchIndex([first, {status: 'draft', title: 'secret draft'}, last]);
 assert.equal(records.length, 2);
 assert.equal(records[0].url, 'https://derech-hakelev.com/pages/articles/example/');
 assert.equal(records[1].url, 'https://derech-hakelev.com/articles/another/');
 assert.ok(!JSON.stringify(records).includes('secret draft'));
});

test('formatting becomes readable text while authored display values remain available', () => {
 assert.equal(plain('**קשר** עם *כלב*'), 'קשר עם כלב');
 assert.equal(plain('<a href="../../../pages/games/products/derech/">דרך</a> חדשה'), 'דרך חדשה');
});

test('adding an internal link preserves readable search text and existing destination anchors', () => {
 const original = article();
 const linked = article();
 linked.openingParagraphs[0] = '[עוד מחשבה](/pages/articles/example/)';
 const before = articleDocument(original), after = articleDocument(linked);
 assert.equal(after.opening[0].id, before.opening[0].id);
 assert.deepEqual(after.record, before.record);
 assert.ok(!JSON.stringify(after.record.entries).includes('/pages/articles/'));
});

test('authored subheadings have heading anchors and searchable visible text', () => {
 const content = article();
 content.sections[0].blocks.unshift({type: 'subheading', text: 'כותרת ביניים'});
 const result = articleDocument(content);
 assert.match(result.sections[0].blocks[0].id, /^article-heading-/);
 assert.equal(result.sections[0].blocks[0].text, 'כותרת ביניים');
 assert.equal(result.sections[0].blocks[0].heading, 'כותרת ביניים');
});
