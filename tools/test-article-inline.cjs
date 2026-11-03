'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {renderInline, plainInline} = require('./article-inline.cjs');

const first = '/pages/articles/emotional-therapy-with-dogs/';
const second = '/pages/articles/developmental-attachment-dog-therapy/';
const shortRoute = '/articles/benefits-of-dogs-for-humans/';
const allowed = new Set([first, second, shortRoute]);

test('authored Hebrew, punctuation and special characters are escaped as text', () => {
 assert.equal(renderInline('קשר & משחק "בטוח" וגם \'בחירה\''), 'קשר &amp; משחק &quot;בטוח&quot; וגם &#39;בחירה&#39;');
 assert.equal(renderInline('&lt;script&gt;'), '&amp;lt;script&amp;gt;');
 assert.equal(plainInline('  קשר\n  ומשחק\tביחד  '), 'קשר ומשחק ביחד');
});

test('bold and italic preserve the existing authored emphasis', () => {
 const text = 'לפני **הקושי**, קודם *קשר*.';
 assert.equal(renderInline(text), 'לפני <strong>הקושי</strong>, קודם <em>קשר</em>.');
 assert.equal(plainInline(text), 'לפני הקושי, קודם קשר.');
 assert.equal(renderInline('כוכבית * פתוחה'), 'כוכבית * פתוחה');
 assert.equal(plainInline('כוכבית * פתוחה'), 'כוכבית * פתוחה');
});

test('a whole italic paragraph can contain a permitted Markdown link', () => {
 const text = '*לקריאה נוספת: [הגישה ההתפתחותית-היקשרותית](' + second + ').*';
 assert.equal(renderInline(text, allowed), '<em>לקריאה נוספת: <a href="' + second + '">הגישה ההתפתחותית-היקשרותית</a>.</em>');
 assert.equal(plainInline(text), 'לקריאה נוספת: הגישה ההתפתחותית-היקשרותית.');
});

test('link labels support emphasis and escape special characters', () => {
 const text = '[**קשר** & "משחק"](' + first + ')';
 assert.equal(renderInline(text, allowed), '<a href="' + first + '"><strong>קשר</strong> &amp; &quot;משחק&quot;</a>');
 assert.equal(plainInline(text), 'קשר & "משחק"');
});

test('both existing public article address formats are supported exactly', () => {
 for (const href of allowed) assert.equal(renderInline('[מאמר](' + href + ')', allowed), '<a href="' + href + '">מאמר</a>');
 assert.throws(() => renderInline('[טיוטה](/pages/articles/private-draft/)', allowed), /not allowed/);
 assert.throws(() => renderInline('[מאמר](' + first + ')'), /not allowed/);
 assert.throws(() => renderInline('טקסט', [first]), /must be a Set/);
});

test('external URLs, scripts, traversal and query or fragment data cannot become links', () => {
 const invalid = [
  'https://example.com/article/', '//example.com/article/', 'javascript:alert(1)',
  '/pages/articles/../private/', '/pages/articles/%2e%2e/private/', '/pages/articles/example/?q=private',
  '/pages/articles/example/#private', '/pages/articles/example', '/pages/articles/example/index.html',
  '/pages/articles/example\\private/', '/pages/articles/example/ extra', ' /pages/articles/example/',
  '/pages/articles/example%2fprivate/', '/pages/articles/Example/', '/pages/articles/example/" onclick="run()',
  '/pages/articles/example/\n'
 ];
 for (const href of invalid) {
  assert.throws(() => renderInline('[קישור](' + href + ')', new Set([href])), undefined, href);
  assert.throws(() => plainInline('[קישור](' + href + ')'), undefined, href);
 }
});

test('malformed, empty, nested and image Markdown is rejected', () => {
 for (const text of [
  '[](' + first + ')', '[   ](' + first + ')', '[מאמר]()', '[מאמר](' + first,
  '[[מאמר]](' + first + ')', '![תמונה](' + first + ')', '[מאמר\nנוסף](' + first + ')',
  '[<strong>מאמר</strong>](' + first + ')'
 ]) assert.throws(() => renderInline(text, allowed), undefined, text);
});

test('HTML is refused rather than executed or accepted as formatting', () => {
 for (const text of [
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<strong>קשר</strong>',
  '<a href="' + first + '">מאמר</a>', '<a href="https://example.com">מאמר</a>',
  '<a href="../../../pages/games/products/solutions/" onclick="run()">משחק</a>'
 ]) {
  assert.throws(() => renderInline(text, allowed), undefined, text);
  assert.throws(() => plainInline(text), undefined, text);
 }
});

test('the narrowly defined legacy product anchor remains supported', () => {
 const href = '../../../pages/games/products/solutions/';
 const legacy = '<a href="' + href + '">**משחק** & כלב</a>';
 assert.equal(renderInline(legacy, allowed), '<a href="' + href + '"><strong>משחק</strong> &amp; כלב</a>');
 assert.equal(plainInline(legacy), 'משחק & כלב');
 assert.equal(renderInline('*לפני ' + legacy + ' אחרי*', allowed), '<em>לפני <a href="' + href + '"><strong>משחק</strong> &amp; כלב</a> אחרי</em>');
 for (const invalid of [
  '<a href="../../../pages/games/products/solutions/?q=private">משחק</a>',
  '<a href="../../../pages/games/products/solutions/#part">משחק</a>',
  '<a href="../../../pages/games/products/../private/">משחק</a>',
  '<a href="../../../pages/games/products/solutions/"><em>משחק</em></a>',
  '<a href="../../../pages/games/products/solutions/">[מאמר](' + first + ')</a>'
 ]) assert.throws(() => renderInline(invalid, allowed), undefined, invalid);
});

test('adding links cannot change visible text or introduce destinations into search text', () => {
 const original = '*לקריאה נוספת:* קשר עם הכלב וגם **משחק**.';
 const linked = '*לקריאה נוספת:* [קשר עם הכלב](' + first + ') וגם [**משחק**](' + second + ').';
 assert.equal(plainInline(linked), plainInline(original));
 assert.ok(!plainInline(linked).includes('/pages/'));
 assert.ok(!plainInline(linked).includes('href'));
 assert.equal(plainInline('[מילה\tעם רווחים](' + shortRoute + ')'), 'מילה עם רווחים');
});

test('multiple links and emphasis restore only internal tokens', () => {
 const text = '**[אחד](' + first + ') ו[שניים](' + shortRoute + ')** ואז *סוף*';
 assert.equal(renderInline(text, allowed), '<strong><a href="' + first + '">אחד</a> ו<a href="' + shortRoute + '">שניים</a></strong> ואז <em>סוף</em>');
 assert.equal(plainInline(text), 'אחד ושניים ואז סוף');
 assert.throws(() => renderInline('טקסט\u00000\u0000', allowed), /control character/);
 assert.throws(() => plainInline('טקסט\u00000\u0000'), /control character/);
 assert.throws(() => renderInline(undefined, allowed), /must be a string/);
});
