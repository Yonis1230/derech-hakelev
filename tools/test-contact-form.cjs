'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../docs/contact-form.js'), 'utf8');

function harness({hostname = 'derech-hakelev.com', fetchImpl, values = {}} = {}) {
 const calls = [];
 const timers = new Map();
 let timerID = 0;
 const field = (value = '') => ({
  value, disabled: false, customValidity: '', listeners: {},
  setCustomValidity(text) { this.customValidity = text; },
  addEventListener(type, listener) { this.listeners[type] = listener; }
 });
 const fields = {
  name: field('פנייה לבדיקה'), contact: field('052-1234567'), message: field('הודעה פרטית לדוגמה'), _honey: field('')
 };
 for (const [key, value] of Object.entries(values)) fields[key].value = value;
 const submit = {disabled: false};
 const previouslyDisabled = {disabled: true};
 const status = {textContent: '', hidden: true, dataset: {}};
 const elements = [...Object.values(fields), submit, previouslyDisabled];
 elements.namedItem = key => fields[key];
 const form = {
  elements, listeners: {}, attrs: {}, resetCount: 0, reportCount: 0,
  querySelector(selector) { return selector === '[data-contact-submit]' ? submit : status; },
  addEventListener(type, listener) { this.listeners[type] = listener; },
  setAttribute(key, value) { this.attrs[key] = value; },
  removeAttribute(key) { delete this.attrs[key]; },
  reportValidity() { this.reportCount++; return !Object.values(fields).some(item => item.customValidity); },
  reset() { this.resetCount++; for (const item of Object.values(fields)) item.value = ''; }
 };
 vm.runInNewContext(source, {
  document: {querySelectorAll: () => [form]},
  location: {hostname, href: 'https://derech-hakelev.com/?private=secret#fragment'},
  AbortController,
  setTimeout(callback, duration) { const id = ++timerID; timers.set(id, {callback, duration}); return id; },
  clearTimeout(id) { timers.delete(id); },
  async fetch(url, options) {
   calls.push({url, options});
   return fetchImpl ? fetchImpl(url, options) : {ok: true, json: async () => ({success: true})};
  }
 });
 return {
  fields, form, submit, status, previouslyDisabled, calls, timers,
  submitForm() { return form.listeners.submit({preventDefault() {}}); }
 };
}

test('valid phone submits only delivery fields, without page details or credentials', async () => {
 const h = harness();
 await h.submitForm();
 assert.equal(h.calls.length, 1);
 const {url, options} = h.calls[0];
 assert.equal(url, 'https://formsubmit.co/ajax/yonis1230@gmail.com');
 assert.equal(options.method, 'POST');
 assert.equal(options.credentials, 'omit');
 assert.equal(options.mode, 'cors');
 assert.equal(options.referrerPolicy, 'origin');
 const body = JSON.parse(options.body);
 assert.deepEqual(Object.keys(body).sort(), ['name', 'contact', 'message', 'phone', '_subject', '_url', '_template', '_captcha', '_honey'].sort());
 assert.equal(body._url, 'https://derech-hakelev.com/');
 assert.equal(body.phone, '052-1234567');
 assert.equal(body._subject, 'פנייה חדשה מאתר דרך הכלב');
 assert.equal(body._honey, '');
 assert.equal(body._captcha, 'false');
 assert.equal(h.form.resetCount, 1);
 assert.equal(h.status.dataset.state, 'success');
 assert.match(h.status.textContent, /הפנייה התקבלה/);
 assert.equal(h.submit.disabled, false);
 assert.equal(h.previouslyDisabled.disabled, true);
 assert.equal(h.form.attrs['aria-busy'], undefined);
 assert.equal(h.timers.size, 0);
});

test('Unicode email and surrounding whitespace are supported, with optional empty message', async () => {
 const h = harness({values: {name: '  יוני  ', contact: '  איש@דוגמה.ישראל  ', message: '   '}});
 await h.submitForm();
 const body = JSON.parse(h.calls[0].options.body);
 assert.equal(body.name, 'יוני');
 assert.equal(body.contact, 'איש@דוגמה.ישראל');
 assert.equal(body.email, body.contact);
 assert.equal(body.phone, undefined);
 assert.equal(body.message, '');
});

for (const [label, values] of [
 ['whitespace name', {name: '  '}],
 ['long name', {name: 'א'.repeat(81)}],
 ['missing contact', {contact: ''}],
 ['malformed email', {contact: 'person@domain'}],
 ['short phone', {contact: '123456'}],
 ['long phone', {contact: '1234567890123456'}],
 ['phone with text', {contact: 'call 0521234567'}],
 ['long contact', {contact: 'a'.repeat(250) + '@x.com'}],
 ['long message', {message: 'א'.repeat(1001)}]
]) test(`invalid ${label} never sends or clears input`, async () => {
 const h = harness({values});
 await h.submitForm();
 assert.equal(h.calls.length, 0);
 assert.equal(h.form.reportCount, 1);
 assert.equal(h.form.resetCount, 0);
 assert.equal(h.status.dataset.state, undefined);
});

test('an invalid contact can be corrected and resubmitted', async () => {
 const h = harness({values: {contact: 'missing'}});
 await h.submitForm();
 assert.ok(h.fields.contact.customValidity);
 h.fields.contact.value = '+972 (52) 123-4567';
 h.fields.contact.listeners.input();
 assert.equal(h.fields.contact.customValidity, '');
 await h.submitForm();
 assert.equal(h.calls.length, 1);
 assert.equal(h.status.dataset.state, 'success');
});

test('honeypot never sends or reports success', async () => {
 const h = harness({values: {_honey: 'https://spam.example'}});
 await h.submitForm();
 assert.equal(h.calls.length, 0);
 assert.equal(h.form.resetCount, 0);
 assert.equal(h.status.dataset.state, 'error');
});

for (const hostname of ['localhost', '127.0.0.1', 'preview.derech-hakelev.com', 'derech-hakelev.com.attacker.example']) {
 test(`${hostname} preview never sends`, async () => {
  const h = harness({hostname});
  await h.submitForm();
  assert.equal(h.calls.length, 0);
  assert.equal(h.form.resetCount, 0);
  assert.equal(h.status.dataset.state, 'preview');
 });
}

test('repeated submit is ignored while the request is pending', async () => {
 let finish;
 const h = harness({fetchImpl: () => new Promise(resolve => { finish = resolve; })});
 const first = h.submitForm();
 assert.equal(h.submit.disabled, true);
 assert.equal(h.form.attrs['aria-busy'], 'true');
 await h.submitForm();
 assert.equal(h.calls.length, 1);
 finish({ok: true, json: async () => ({success: 'true'})});
 await first;
 assert.equal(h.form.resetCount, 1);
 assert.equal(h.submit.disabled, false);
});

for (const [label, response] of [
 ['HTTP failure', {ok: false, json: async () => ({success: true})}],
 ['invalid JSON', {ok: true, json: async () => { throw new SyntaxError('invalid'); }}],
 ['provider false', {ok: true, json: async () => ({success: false})}],
 ['numeric success', {ok: true, json: async () => ({success: 1})}],
 ['missing success', {ok: true, json: async () => ({})}],
 ['null response', {ok: true, json: async () => null}],
 ['pending activation', {ok: true, json: async () => ({success: 'true', message: 'Please activate this form'})}],
 ['pending delivery', {ok: true, json: async () => ({success: true, message: 'Pending confirmation'})}]
]) test(`${label} preserves input and restores form`, async () => {
 const h = harness({fetchImpl: async () => response});
 await h.submitForm();
 assert.equal(h.form.resetCount, 0);
 assert.equal(h.fields.message.value, 'הודעה פרטית לדוגמה');
 assert.equal(h.status.dataset.state, 'error');
 assert.match(h.status.textContent, /לא הצלחנו לשלוח/);
 assert.equal(h.submit.disabled, false);
 assert.equal(h.previouslyDisabled.disabled, true);
 assert.equal(h.form.attrs['aria-busy'], undefined);
 assert.equal(h.timers.size, 0);
});

test('network failure can be retried without losing details', async () => {
 let attempts = 0;
 const h = harness({fetchImpl: async () => {
  if (!attempts++) throw new TypeError('network');
  return {ok: true, json: async () => ({success: true})};
 }});
 await h.submitForm();
 assert.equal(h.status.dataset.state, 'error');
 assert.equal(h.form.resetCount, 0);
 await h.submitForm();
 assert.equal(h.calls.length, 2);
 assert.equal(h.form.resetCount, 1);
});

test('20 second timeout aborts the request, preserves details and restores controls', async () => {
 const h = harness({fetchImpl: async (_, {signal}) => new Promise((resolve, reject) => {
  signal.addEventListener('abort', () => reject(new Error('aborted')));
 })});
 const request = h.submitForm();
 const timer = [...h.timers.values()][0];
 assert.equal(timer.duration, 20000);
 timer.callback();
 await request;
 assert.equal(h.calls[0].options.signal.aborted, true);
 assert.equal(h.form.resetCount, 0);
 assert.equal(h.fields.contact.value, '052-1234567');
 assert.equal(h.status.dataset.state, 'error');
 assert.equal(h.submit.disabled, false);
 assert.equal(h.form.attrs['aria-busy'], undefined);
});
