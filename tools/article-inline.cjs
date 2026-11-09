'use strict';

const articlePath = /^\/(?:pages\/)?articles\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const productPath = /^\/pages\/games\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const legacyProductLink = /^<a href="(\.\.\/\.\.\/\.\.\/pages\/games\/products\/[a-z]+\/)">([^<>]+)<\/a>/;
const markdownLink = /^\[([^\]\r\n]*)\]\(([^)\r\n]*)\)/;
const emphasisParts = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
const placeholder = /\u0000(\d+)\u0000/g;

function escape(value) {
 return value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function textValue(value) {
 if (typeof value !== 'string') throw new TypeError('Inline article content must be a string.');
 if (value.includes('\u0000')) throw new Error('Unsupported inline article control character.');
 return value;
}

// Links are atomic while emphasis is parsed, so *text [label](path)* stays one
// italic phrase. Link labels get their own emphasis, but cannot contain links.
function tokenize(value, validateRoute) {
 const text = textValue(value);
 const links = [];
 let compiled = '';
 let cursor = 0;
 while (cursor < text.length) {
  const remainder = text.slice(cursor);
  const legacy = remainder.match(legacyProductLink);
  if (legacy) {
   links.push({href: legacy[1], label: legacy[2]});
   compiled += '\u0000' + (links.length - 1) + '\u0000';
   cursor += legacy[0].length;
   continue;
  }
  if (text[cursor] === '<' || text[cursor] === '>') throw new Error('Unsupported inline article HTML.');
  const markdown = text[cursor] === '[' ? remainder.match(markdownLink) : null;
  if (markdown) {
   if (text[cursor - 1] === '!' || !markdown[1].trim() || /[\[\]<>]/.test(markdown[1])) throw new Error('Invalid inline article link label.');
   validateRoute(markdown[2]);
   links.push({href: markdown[2], label: markdown[1]});
   compiled += '\u0000' + (links.length - 1) + '\u0000';
   cursor += markdown[0].length;
   continue;
  }
  compiled += text[cursor++];
 }
 if (compiled.includes('](')) throw new Error('Invalid inline article Markdown link.');
 return {compiled, links};
}

function formatEmphasis(text, html) {
 return text.split(emphasisParts).map(part => {
  let tag = '';
  let visible = part;
  if (/^\*\*[^*]+\*\*$/.test(part)) { tag = 'strong'; visible = part.slice(2, -2); }
  else if (/^\*[^*]+\*$/.test(part)) { tag = 'em'; visible = part.slice(1, -1); }
  if (!html) return visible;
  const safe = escape(visible);
  return tag ? '<' + tag + '>' + safe + '</' + tag + '>' : safe;
 }).join('');
}

function formatLabel(label, html) {
 if (/[<>]/.test(label) || label.includes('](')) throw new Error('Nested links and HTML are not allowed in article link labels.');
 return formatEmphasis(label, html);
}

function transform(value, validateRoute, html) {
 const {compiled, links} = tokenize(value, validateRoute);
 return formatEmphasis(compiled, html).replace(placeholder, (_, index) => {
  const link = links[Number(index)];
  const label = formatLabel(link.label, html);
  return html ? '<a href="' + escape(link.href) + '">' + label + '</a>' : label;
 });
}

function validDestination(href) {
 if (href !== '/pages/games/' && !articlePath.test(href) && !productPath.test(href)) throw new Error('Invalid inline article destination.');
}

function renderInline(value, allowedRoutes = new Set()) {
 if (!(allowedRoutes instanceof Set)) throw new TypeError('Allowed article routes must be a Set.');
 return transform(value, href => {
  validDestination(href);
  if (!allowedRoutes.has(href)) throw new Error('Inline article destination is not allowed: ' + href);
 }, true);
}

function plainInline(value) {
 // Ownership/publication is checked by renderInline's allowlist. This helper
 // deliberately has no route context and never includes a link's URL in text.
 return transform(value, validDestination, false).replace(/\s+/g, ' ').trim();
}

module.exports = {renderInline, plainInline};
