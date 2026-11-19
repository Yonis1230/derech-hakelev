'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'docs/certificates.js'), 'utf8');
function element() {
 const listeners = new Map(), attributes = new Map();
 return {dataset: {}, hidden: true, focused: false, listeners, attributes,
  addEventListener(name, callback) {listeners.set(name, callback);},
  setAttribute(name, value) {attributes.set(name, value);},
  hasAttribute(name) {return attributes.has(name);},
  focus() {this.focused = true;},
  emit(name, data = {}) {listeners.get(name)?.(data);}
 };
}
const trigger = element(), dialog = element(), close = element();
const photos = [element(), element(), element()];
let loads = 0, opens = 0;
for (const [index, photo] of photos.entries()) {
 photo.dataset.certificateSrc = 'certificate-' + index + '.jpeg';
 const status = {textContent: ''};
 photo.status = status;
 photo.closest = () => ({querySelector: () => status});
 Object.defineProperty(photo, 'src', {set(value) {loads++;photo.setAttribute('src', value);}});
}
dialog.querySelector = () => close;
dialog.querySelectorAll = () => photos;
dialog.showModal = () => {dialog.open = true;opens++;};
dialog.close = () => {dialog.open = false;dialog.emit('close');};
dialog.getBoundingClientRect = () => ({left:20,right:900,top:20,bottom:700});
const classes = new Set();
const document = {querySelector: () => trigger, getElementById: () => dialog,
 body: {classList: {add: name => classes.add(name),remove: name => classes.delete(name)}}};
const context = vm.createContext({document});
vm.runInContext(code, context);
assert.equal(loads, 0, 'Images must not load before opening');
assert.equal(trigger.hidden, false);
trigger.emit('click');
assert.equal(loads, 3);
assert.equal(opens, 1);
assert.equal(close.focused, true);
assert.equal(trigger.attributes.get('aria-expanded'), 'true');
assert.ok(classes.has('certificates-open'));
// Escape and native close both dispatch the browser's close event.
dialog.close();
assert.equal(trigger.focused, true);
assert.equal(trigger.attributes.get('aria-expanded'), 'false');
assert.equal(classes.size, 0);
vm.runInContext(code, context); // duplicate script must not reinitialize the modal
trigger.emit('click');
assert.equal(loads, 3);
assert.equal(opens, 2);
dialog.emit('click', {target: dialog,clientX:40,clientY:40});
assert.equal(dialog.open, true, 'Dialog padding must not count as the backdrop');
dialog.emit('click', {target: dialog,clientX:5,clientY:5});
assert.equal(dialog.open, false);
photos[0].emit('error');
assert.equal(photos[0].hidden, true);
assert.ok(photos[0].status.textContent);
const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const section = html.match(/<dialog id="certificates-dialog"[\s\S]*?<\/dialog>/)[0];
assert.equal((section.match(/data-certificate-src=/g) || []).length, 3);
assert.ok(!/<img[^>]*\ssrc=/.test(section));
assert.ok(!section.includes('הצטיינות'));
const expected = ['therapeutic-dog-training.jpeg','clinical-criminology-ma.jpeg','criminology-ba.jpeg'];
assert.deepEqual([...section.matchAll(/data-certificate-src="([^"]+)"/g)].map(match => path.basename(match[1].split('?')[0])), expected);
for (const file of expected) assert.ok(fs.statSync(path.join(root, 'docs/assets/images/certificates', file)).size > 0);
console.log('PASS deferred images, modal open/close and focus restoration, reopening, duplicate initialization, backdrop, load failure, certificate order and local assets. Native browser keyboard trapping and responsive layout require visual QA.');
