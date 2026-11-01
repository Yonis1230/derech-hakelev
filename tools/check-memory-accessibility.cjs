const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/pages/games/game1.js'), 'utf8');

function fixture({random = 0.999, optimized = false} = {}) {
 const timers = new Map();
 let timerId = 0;
 let shuffleCalls = 0;
 class Element {
  constructor() { this.children = []; this.attributes = {}; this.style = {}; this.className = ''; this.textContent = ''; this.disabled = false; }
  get classList() {
   const node = this;
   return {
    contains(name) { return node.className.split(/\s+/).includes(name); },
    add(name) { if (!this.contains(name)) node.className += ' ' + name; },
    remove(name) { node.className = node.className.split(/\s+/).filter(value => value !== name).join(' '); }
   };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(name, handler) { (this.events ||= {})[name] = handler; }
  click() { document.activeElement = this; if (!this.disabled) this.events?.click?.(); }
  replaceChildren() { this.children = []; }
  append(node) { this.children.push(node); }
  querySelectorAll(selector) { assert.equal(selector, '.matched'); return this.children.filter(node => node.classList.contains('matched')); }
 }
 const board = new Element();
 const status = new Element();
 const restart = new Element();
 const document = {
  activeElement: null,
  addEventListener(name, handler) { assert.equal(name, 'DOMContentLoaded'); this.ready = handler; },
  getElementById(id) { return {'gameBoard': board, 'game-status': status, 'restart-game': restart}[id]; },
  createElement(tag) { assert.equal(tag, 'button'); return new Element(); }
 };
 const math = Object.create(Math);
 math.random = () => { shuffleCalls++; return random; };
 vm.runInNewContext(source, {
  document,
  window: optimized ? {DERECH_MEDIA: {'assets/images/games/1/p1.webp': {src: 'assets/optimized/p1.webp'}}} : {},
  Math: math,
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
  clearTimeout(id) { timers.delete(id); }
 });
 document.ready();
 return {board, status, restart, timers, document, shuffleCalls: () => shuffleCalls, tick() { const pending = [...timers.values()]; timers.clear(); pending.forEach(({callback}) => callback()); }};
}

const game = fixture();
assert.equal(game.board.children.length, 10);
assert.equal(game.shuffleCalls(), 9, 'the ten-card Fisher–Yates shuffle still runs');
assert.equal(game.status.getAttribute('aria-atomic'), 'true');
game.board.children.forEach((button, index) => {
 assert.equal(button.type, 'button');
 assert.equal(button.getAttribute('aria-label'), 'קלף ' + (index + 1) + ', סגור. הפכו את הקלף');
 assert.equal(button.style.backgroundImage, undefined, 'hidden cards do not expose their picture');
});
console.log('PASS ten shuffled native buttons have position-only hidden names');

const cards = game.board.children;
cards[0].click();
assert.match(cards[0].getAttribute('aria-label'), /כלב שרצועתו הסתבכה/);
assert.doesNotMatch(cards[0].getAttribute('aria-label'), /בעיה \d/);
assert.match(game.status.textContent, /בחרו קלף נוסף/);
cards[0].click();
assert.equal(game.timers.size, 0, 'a repeated click cannot select the same card twice');
cards[2].click();
assert.equal(game.timers.size, 1);
assert.equal([...game.timers.values()][0].delay, 1200);
cards[4].click();
assert.equal(cards[4].textContent, '?', 'no third card may open while resolving a turn');
game.tick();
assert.match(game.status.textContent, /אינם זוג/);
assert.equal(cards[0].getAttribute('aria-label'), 'קלף 1, סגור. הפכו את הקלף');
assert.equal(cards[2].getAttribute('aria-label'), 'קלף 3, סגור. הפכו את הקלף');
assert.equal(cards[0].style.backgroundImage, 'none');
console.log('PASS meaningful revealed names, live feedback, lock and1200ms nonmatch reset');

for (let i = 0; i < cards.length; i += 2) {
 cards[i].click();
 cards[i + 1].click();
 for (const button of [cards[i], cards[i + 1]]) {
  assert.doesNotMatch(button.getAttribute('aria-label'), /undefined/);
  assert.match(button.getAttribute('aria-label'), /(?:בעיה|פתרון): .+/);
 }
 const focusedCard = game.document.activeElement;
 game.tick();
 for (const button of [cards[i], cards[i + 1]]) {
  assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert.equal(button.disabled, false, 'matched cards remain focusable for reading');
  assert.match(button.getAttribute('aria-label'), /זוג שנמצא$/);
  assert.doesNotMatch(button.getAttribute('aria-label'), /(?:בעיה|פתרון) \d/);
 }
 assert.equal(game.document.activeElement, focusedCard, 'resolving a match never moves focus');
 const previousStatus = game.status.textContent;
 cards[i].click();
 assert.equal(game.status.textContent, previousStatus, 'matched cards cannot reactivate');
}
assert.equal(game.board.querySelectorAll('.matched').length, 10);
assert.match(game.status.textContent, /ניצחתם.*חמשת הזוגות/);
console.log('PASS all five matched pairs stay readable, cannot reactivate, preserve focus and announce win');

game.restart.click();
assert.equal(game.board.children.length, 10);
assert.equal(game.board.querySelectorAll('.matched').length, 0);
game.board.children[0].click();
game.board.children[1].click();
assert.equal(game.timers.size, 1);
game.restart.click();
assert.equal(game.timers.size, 0, 'restart cancels the pending previous turn');
game.tick();
assert.equal(game.board.querySelectorAll('.matched').length, 0);
assert.match(game.status.textContent, /משחק חדש/);
console.log('PASS restart resets progress, shuffles again and cancels stale turn timers');

const optimized = fixture({optimized: true});
optimized.board.children[0].click();
assert.equal(optimized.board.children[0].style.backgroundImage, "url('../../assets/optimized/p1.webp')");
const reordered = fixture({random: 0});
reordered.board.children[0].click();
assert.match(reordered.board.children[0].getAttribute('aria-label'), /מספריים/);
console.log('PASS existing optimized image lookup and randomized picture order remain intact');
console.log('5 memory accessibility regression groups passed (mock DOM; screen-reader and native keyboard checks remain separate).');
