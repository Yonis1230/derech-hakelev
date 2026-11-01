/* Synthetic production-module checks. No browser, network, real cookies or accounts.
 * These establish gating/payload invariants, not live GTM configuration/delivery.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/measurement.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const optOutKey = 'ga-disable-G-603TM871H0';

function fixture({container, hostname = 'derech-hakelev.com', pathname = '/pages/games/', granted = false, cookiesBlocked = false, loading = false, privacyLate = false} = {}) {
 const scripts = [], clarity = [], cookieWrites = [], subscriptions = [], listeners = new Map(), operations = [], nativeAttempts = [];
 let approved = granted;
 const privacy = {
  getPreferences: () => ({analytics: approved}),
  subscribe: callback => { subscriptions.push(callback); return () => {}; },
  trackEvent: (name, params) => { clarity.push({name, params: plain(params)}); }
 };
 const document = {
  readyState: loading ? 'loading' : 'complete',
  head: {append(script) { operations.push({type: 'append', disabled: window[optOutKey]}); script.queuedAtAppend = plain((window.dataLayer || []).map(entry => typeof entry.length === 'number' ? Array.from(entry) : entry)); scripts.push(script); }},
  createElement(tag) { return {tagName: tag, remove() { operations.push({type: 'remove', disabled: window[optOutKey]}); this.removed = true; }}; },
  addEventListener(name, handler) { listeners.set(name, [...(listeners.get(name) || []), handler]); },
  get cookie() { if (cookiesBlocked) throw Error('Cookie access denied'); return '_ga=synthetic; _ga_TEST1234=synthetic; _gadget=preserve; essential=preserve'; },
  set cookie(value) { operations.push({type: 'cookie', disabled: window[optOutKey]}); cookieWrites.push(value); },
  get title() { throw Error('Raw document title must not be read'); },
  get referrer() { throw Error('Raw document referrer must not be read'); }
 };
 const location = {hostname, pathname, href: 'https://' + hostname + pathname + '?email=private%40example.test&utm_campaign=private-diagnosis#private-child-name'};
 const window = privacyLate ? {} : {DERECH_PRIVACY: privacy};
 let optOutValue, dataLayer;
 Object.defineProperty(window, optOutKey, {
  get() { return optOutValue; },
  set(value) { optOutValue = value; operations.push({type: 'optout', value}); }
 });
 Object.defineProperty(window, 'dataLayer', {
  get() { return dataLayer; },
  set(value) {
   dataLayer = value;
   const push = value.push;
   value.push = function(...items) {
    for (const item of items) operations.push({type: 'queue', disabled: window[optOutKey], item: plain(typeof item.length === 'number' ? Array.from(item) : item)});
    return push.apply(this, items);
   };
  }
 });
 const configuration = /const GTM_CONTAINER_ID = '[A-Z0-9-]*';/;
 assert(configuration.test(source), 'test configuration injection must target the public constant');
 const code = container === undefined ? source : source.replace(configuration, 'const GTM_CONTAINER_ID = ' + JSON.stringify(container) + ';');
 const sandbox = {window, document, location, URL, Date};
 const run = () => vm.runInNewContext(code, sandbox, {filename: 'measurement.js'});
 run();
 function emit(name, event = {}) { for (const callback of listeners.get(name) || []) callback(event); }
 return {
  window, document, scripts, clarity, cookieWrites, operations, nativeAttempts, run, usingProductionSource: code === source,
  // Models the documented vendor opt-out check; this does not load a Google tag.
  nativeAttempt(name) { if (window[optOutKey] !== true) nativeAttempts.push(name); },
  track: (name, params) => window.DERECH_MEASUREMENT.track(name, params),
  choose(value, notify = true) { approved = value; if (notify) subscriptions.forEach(callback => callback(privacy.getPreferences())); },
  ready() { emit('DOMContentLoaded'); },
  connectLate() { window.DERECH_PRIVACY = privacy; emit('derech:privacy-change'); },
  click({id = 'header_whatsapp', placement = 'header', href = 'https://wa.me/972524013354?text=PRIVATE-MESSAGE', productId} = {}) {
   const control = {href, dataset: {measureId: id, measurePlacement: placement, productId}};
   emit('click', {target: {closest(selector) { assert.equal(selector, 'a[data-measure-id]'); return control; }}});
  },
  googleEvents() { return plain((window.dataLayer || []).filter(entry => entry.event === 'derech_event')); },
  queue() { return plain((window.dataLayer || []).map(entry => typeof entry.length === 'number' ? Array.from(entry) : entry)); }
 };
}

let count = 0;
function check(name, test) { test(); count++; console.log('PASS ' + name); }
const contact = {channel: 'whatsapp', button_id: 'header_whatsapp', placement: 'header'};

check('fresh visit never creates a loader, queue or collector calls, and never replays earlier actions', () => {
 const page = fixture();
 assert.equal(page.usingProductionSource, true);
 assert.equal(page.track('contact_click', contact), false);
 page.click();
 assert.equal(page.scripts.length, 0); assert.equal(page.window.dataLayer, undefined); assert.equal(page.clarity.length, 0);
 assert.equal(page.window[optOutKey], true);
 page.choose(true);
 assert.equal(page.scripts.length, 1); assert.equal(page.googleEvents().length, 1); assert.equal(page.clarity.length, 0);
 assert.equal(page.window[optOutKey], false);
});

check('all non-production hosts remain silent, even with approval and a valid container', () => {
 for (const hostname of ['localhost', '127.0.0.1', 'preview.example.test', 'derech-hakelev.com.attacker.test']) {
  const page = fixture({hostname, granted: true});
  assert.equal(page.usingProductionSource, true);
  assert.equal(page.track('contact_click', contact), false); page.click();
  assert.equal(page.scripts.length, 0); assert.equal(page.clarity.length, 0); assert.equal(page.window.dataLayer, undefined);
  assert.equal(page.window[optOutKey], true);
 }
});

check('empty or invalid container remains inactive while the approved Clarity bridge can operate', () => {
 for (const container of ['', 'GTM-', 'G-TEST1234', 'GTM-TEST?email=private']) {
  const page = fixture({container, granted: true});
  assert.equal(page.track('contact_click', contact), true);
  assert.equal(page.scripts.length, 0); assert.equal(page.window.dataLayer, undefined); assert.equal(page.clarity.length, 1);
  assert.equal(page.window[optOutKey], true);
 }
});

check('approved valid container loads once with all advertising denied and automatic page views disabled', () => {
 const page = fixture({granted: true});
 assert.equal(page.usingProductionSource, true);
 assert.equal(page.scripts.length, 1);
 assert.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-5PGV5KCD');
 assert.equal(page.scripts[0].async, true); assert.equal(page.scripts[0].referrerPolicy, 'no-referrer');
 assert.deepEqual(page.queue().find(item => item[0] === 'consent'), ['consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}]);
 const settings = page.queue().find(item => item[0] === 'set')[1];
 assert.equal(settings.send_page_view, false); assert.equal(settings.allow_google_signals, false);
 assert.equal(settings.allow_ad_personalization_signals, false); assert.equal(settings.allow_interest_groups, false);
 page.choose(true); page.ready();
 assert.equal(page.scripts.length, 1); assert.equal(page.googleEvents().filter(event => event.derech_event_name === 'page_view').length, 1);
});

check('unchanged production source seeds only clean context DLVs before gtm.js and before the loader is appended', () => {
 for (const pathname of ['/pages/games/', '/pages/games/index.html', '/pages/games/products/solutions/', '/pages/games/products/escape/index.html']) {
  const page = fixture({granted: true, pathname});
  assert.equal(page.usingProductionSource, true);
  assert.equal(page.scripts.length, 1);
  const queue = page.scripts[0].queuedAtAppend;
  const contextIndex = queue.findIndex(item => Object.hasOwn(item, 'derech_page_context'));
  const bootstrapIndex = queue.findIndex(item => item.event === 'gtm.js');
  const firstEventIndex = queue.findIndex(item => item.event === 'derech_event');
  assert(contextIndex >= 0 && contextIndex < bootstrapIndex && bootstrapIndex < firstEventIndex);
  // Simulate processing queued data-layer messages through the bootstrap event:
  // initialization tags must find safe values without waiting for derech_event.
  const model = {};
  for (const item of queue.slice(0, bootstrapIndex + 1)) if (!Array.isArray(item)) Object.assign(model, item);
  const canonical = pathname.replace(/index\.html$/, '');
  const expected = {page_location: 'https://derech-hakelev.com' + canonical, page_referrer: '', page_title: canonical.includes('/products/') ? 'Product | Derech Hakelev' : 'Games and tools | Derech Hakelev'};
  assert.deepEqual(model.derech_page_context, expected);
  assert.deepEqual(Object.keys(model.derech_page_context).sort(), ['page_location', 'page_referrer', 'page_title']);
  assert(!JSON.stringify(queue).includes('private'));
  for (const event of page.googleEvents()) assert.deepEqual(event.derech_event_params, expected);
 }
});

check('only exact catalogue and known-product routes can load Google', () => {
 const allowed = ['/pages/games/', '/pages/games/index.html', '/pages/games/products/solutions/', '/pages/games/products/escape/index.html'];
 for (const pathname of allowed) assert.equal(fixture({granted: true, pathname}).scripts.length, 1, pathname);
 const blocked = ['/', '/index.html', '/pages/therapy/', '/pages/privacy/', '/pages/games/products/private-name/', '/pages/games/private/', '/pages/games/products/solutions/extra/'];
 for (const pathname of blocked) {
  const page = fixture({granted: true, pathname});
  assert.equal(page.usingProductionSource, true);
  assert.equal(page.scripts.length, 0, pathname);
  assert.equal(page.track('contact_click', contact), true, 'existing approved Clarity bridge stays available');
  assert.equal(page.clarity.length, 1); assert.equal(page.window.dataLayer, undefined);
  assert.equal(page.window[optOutKey], true);
 }
});

check('every Google event carries canonical neutral page fields without URL queries, fragments or referrer', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true, pathname: '/pages/games/products/solutions/index.html'});
 page.track('contact_click', contact); page.track('finder_complete', {placement: 'finder'});
 for (const event of page.googleEvents()) {
  assert.equal(event.derech_event_params.page_location, 'https://derech-hakelev.com/pages/games/products/solutions/');
  assert.equal(event.derech_event_params.page_referrer, '');
  assert.equal(event.derech_event_params.page_title, 'Product | Derech Hakelev');
 }
 assert(!JSON.stringify(page.queue()).includes('private'));
});

check('therapy-specific controls are excluded from Google even if copied onto a commerce page', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 const initial = page.googleEvents().length;
 for (const [button_id, placement] of [['therapy_whatsapp', 'services'], ['testimonials_whatsapp', 'testimonials'], ['benefits_whatsapp', 'benefits'], ['hosen_whatsapp', 'hosen']]) {
  assert.equal(page.track('contact_click', {channel: 'whatsapp', button_id, placement}), true);
 }
 // Both identity and location are checked, so moving a marked button cannot bypass scope.
 page.track('contact_click', {...contact, button_id: 'hosen_whatsapp'});
 page.track('contact_click', {...contact, placement: 'services'});
 assert.equal(page.googleEvents().length, initial); assert.equal(page.clarity.length, 6);
});

check('closed event/parameter enums discard unknown fields and reject invalid required values', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 const startCount = page.googleEvents().length;
 const malicious = {...contact, email: 'private@example.test', text: 'PRIVATE-MESSAGE', url: 'https://wa.me/?text=private', answers: ['private-diagnosis'], page_location: 'private'};
 assert.equal(page.track('contact_click', malicious), true);
 assert.deepEqual(page.clarity[0], {name: 'contact_click', params: {placement: 'header', channel: 'whatsapp', button_id: 'header_whatsapp'}});
 for (const [name, params] of [
  ['purchase', contact], ['toString', contact], ['contact_click', {...contact, channel: 'private'}],
  ['contact_click', {...contact, button_id: 'private@example.test'}], ['contact_click', {...contact, placement: 'private-diagnosis'}],
  ['product_details_open', {placement: 'catalog', product_id: 'private'}], ['finder_complete', {placement: 'unknown'}],
  ['memory_game_complete', {placement: 'sample_game', game_id: 'private'}], ['canva_game_open', {placement: 'online', game_id: 'solutions_memory'}]
 ]) assert.equal(page.track(name, params), false, name);
 assert.equal(page.googleEvents().length, startCount + 1);
 assert.equal(page.track('finder_start', null), false); assert.equal(page.track('finder_start', []), false);
});

check('all intended non-contact hooks survive with minimal validated payloads', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 const events = [
  ['product_details_open', {placement: 'catalog', product_id: 'solutions'}],
  ['finder_start', {placement: 'hero'}], ['finder_complete', {placement: 'finder'}],
  ['canva_game_open', {placement: 'online', game_id: 'dogs_trivia'}],
  ['memory_game_complete', {placement: 'sample_game', game_id: 'solutions_memory'}]
 ];
 for (const [name, params] of events) assert.equal(page.track(name, params), true);
 assert.deepEqual(page.clarity.map(entry => entry.name), events.map(([name]) => name));
 assert.deepEqual(page.googleEvents().slice(1).map(entry => entry.derech_event_name), events.map(([name]) => name));
});

check('new events reset GTM merged payload state so old product/channel values cannot leak', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 page.track('contact_click', {...contact, product_id: 'solutions'});
 page.track('finder_complete', {placement: 'finder'});
 let state = {};
 for (const item of page.queue()) {
  if (Object.hasOwn(item, 'derech_event_params')) {
   if (item.derech_event_params === null) state = {};
   else Object.assign(state, item.derech_event_params);
  }
  if (item.event === 'derech_event' && item.derech_event_name === 'finder_complete') {
   assert.equal(state.product_id, undefined); assert.equal(state.channel, undefined); assert.equal(state.button_id, undefined);
  }
 }
});

check('delegated WhatsApp, phone and email clicks count individually and never send link contents', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 page.click(); page.click();
 page.click({id: 'contact_phone', placement: 'contact', href: 'tel:0524013354'});
 page.click({id: 'contact_email', placement: 'contact', href: 'mailto:private@example.test?subject=PRIVATE-MESSAGE'});
 assert.deepEqual(page.clarity.map(entry => entry.params.channel), ['whatsapp', 'whatsapp', 'phone', 'email']);
 assert.equal(page.googleEvents().length, 5);
 assert(!JSON.stringify([page.queue(), page.clarity]).includes('PRIVATE-MESSAGE'));
 assert(!JSON.stringify([page.queue(), page.clarity]).includes('0524013354'));
 assert(!JSON.stringify([page.queue(), page.clarity]).includes('private@example.test'));
 for (const [id, href, channel] of [['content_whatsapp', 'https://wa.me/972524013354', 'whatsapp'], ['content_phone', 'tel:0524013354', 'phone'], ['content_email', 'mailto:private@example.test', 'email']]) {
  page.click({id, placement: 'contact', href});
  assert.deepEqual(page.clarity.at(-1).params, {placement: 'contact', channel, button_id: id});
 }
});

check('known dynamic product order markers retain only the approved product ID', () => {
 const page = fixture({granted: true});
 page.click({id: 'catalog_order_solutions', placement: 'catalog', productId: 'solutions'});
 assert.deepEqual(page.clarity[0], {name: 'contact_click', params: {placement: 'catalog', channel: 'whatsapp', button_id: 'catalog_order_solutions', product_id: 'solutions'}});
 page.click({id: 'catalog_order_private', placement: 'catalog', productId: 'private'});
 assert.equal(page.clarity.length, 1);
 for (const [id, placement, productId] of [['finder_bundle', 'finder'], ['finder_product_solutions', 'finder', 'solutions'], ['floating_bundle_offer', 'floating']]) {
  page.click({id, placement, productId});
  assert.equal(page.clarity.at(-1).params.button_id, id);
 }
 assert.equal(page.clarity.length, 4);
 // Internal navigation remains navigation, even when its stable marker is known.
 page.click({id: 'finder_bundle', placement: 'finder', href: 'https://derech-hakelev.com/pages/games/#bundle-offer'});
 assert.equal(page.clarity.length, 4);
});

check('Canva uses fixed game IDs and ignores the shared-link URL and query', () => {
 const page = fixture({granted: true});
 page.click({id: 'canva_dogs', placement: 'online', href: 'https://www.canva.com/design/private/edit?utm_content=PRIVATE-MESSAGE'});
 assert.deepEqual(page.clarity, [{name: 'canva_game_open', params: {placement: 'online', game_id: 'dogs_trivia'}}]);
 page.click({id: 'canva_dogs', placement: 'online', href: 'https://attacker.test/design/private'});
 page.click({id: 'unapproved', placement: 'online', href: 'https://www.canva.com/design/private'});
 assert.equal(page.clarity.length, 1);
});

check('withdrawal stops pushes, removes loader and expires only controlled GA cookie names', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 page.track('contact_click', contact);
 const length = page.window.dataLayer.length, clarityCount = page.clarity.length;
 page.choose(false);
 const withdrawalLength = page.window.dataLayer.length;
 assert.equal(withdrawalLength, length + 1, 'only the explicit denied-consent update is queued on withdrawal');
 assert.deepEqual(page.queue().at(-1), ['consent', 'update', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}]);
 assert.equal(page.window[optOutKey], true);
 assert.equal(page.scripts[0].removed, true);
 assert(page.cookieWrites.some(write => write.startsWith('_ga=')));
 assert(page.cookieWrites.some(write => write.startsWith('_ga_TEST1234=')));
 assert(page.cookieWrites.every(write => /^_ga(?:_[A-Za-z0-9_]+)?=; Max-Age=0;/.test(write)));
 assert(!page.cookieWrites.some(write => write.includes('_gadget') || write.includes('essential')));
 assert.equal(page.track('contact_click', contact), false); page.click();
 assert.equal(page.window.dataLayer.length, withdrawalLength); assert.equal(page.clarity.length, clarityCount);
 page.choose(true);
 assert.equal(page.scripts.length, 1, 'executed tags may only restart after privacy controller reloads');
 assert.equal(page.window[optOutKey], true, 'same-page reapproval cannot re-enable native hits after a stop');
 assert.equal(page.track('contact_click', contact), false);
 assert.equal(page.window.dataLayer.length, withdrawalLength);
});

check('native opt-out stays set until the approved scoped loader starts and is restored before any withdrawal work', () => {
 const pending = fixture({granted: true, loading: true});
 assert.equal(pending.window[optOutKey], true);
 assert.equal(pending.window.dataLayer, undefined);
 pending.nativeAttempt('before-initialization');
 assert.equal(pending.nativeAttempts.length, 0);
 pending.ready();
 const startup = pending.operations;
 assert.deepEqual(startup[0], {type: 'optout', value: true});
 const enabled = startup.findIndex(operation => operation.type === 'optout' && operation.value === false);
 const appended = startup.findIndex(operation => operation.type === 'append');
 assert(enabled > 0 && appended === enabled + 1, 'opt-out clears immediately before the scoped vendor loader is appended');
 assert(startup.slice(0, enabled).filter(operation => operation.type === 'queue').every(operation => operation.disabled === true));
 assert.equal(startup[appended].disabled, false);
 pending.nativeAttempt('approved-engagement');
 assert.deepEqual(pending.nativeAttempts, ['approved-engagement']);
 const beforeWithdrawal = pending.operations.length;
 pending.choose(false);
 const withdrawal = pending.operations.slice(beforeWithdrawal);
 assert.deepEqual(withdrawal[0], {type: 'optout', value: true});
 assert.equal(withdrawal[1].type, 'queue');
 assert.deepEqual(withdrawal[1].item, ['consent', 'update', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}]);
 assert(withdrawal.slice(1).every(operation => operation.disabled === true), 'native opt-out precedes consent processing, script removal and all cookie expiry writes');
 pending.nativeAttempt('pagehide-after-withdrawal');
 pending.choose(true);
 pending.nativeAttempt('reapproval-without-reload');
 assert.deepEqual(pending.nativeAttempts, ['approved-engagement']);
 assert.equal(pending.window['ga-disable-G-UNRELATED'], undefined, 'opt-out targets only the confirmed property');
});

check('withdrawal before a Google loader exists creates no queue or denied-consent ping', () => {
 for (const options of [{}, {granted: true, loading: true}, {granted: true, pathname: '/'}, {granted: true, hostname: 'localhost'}]) {
  const page = fixture(options);
  page.choose(false); page.ready();
  assert.equal(page.window[optOutKey], true);
  assert.equal(page.window.dataLayer, undefined);
  assert.equal(page.scripts.length, 0);
  assert.equal(page.operations.filter(operation => operation.type === 'queue').length, 0);
  page.nativeAttempt('unapproved-native-event');
  assert.equal(page.nativeAttempts.length, 0);
 }
});

check('current consent is checked again even if a vendor/subscriber update is delayed', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true});
 const length = page.window.dataLayer.length;
 page.choose(false, false);
 assert.equal(page.track('contact_click', contact), false);
 assert.equal(page.window.dataLayer.length, length); assert.equal(page.clarity.length, 0);
});

check('unavailable cookies or failed Clarity collectors never break the page', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true, cookiesBlocked: true});
 page.window.DERECH_PRIVACY.trackEvent = () => { throw Error('Recorder unavailable'); };
 assert.equal(page.track('contact_click', contact), true);
 assert.equal(page.googleEvents().at(-1).derech_event_name, 'contact_click');
 assert.doesNotThrow(() => page.choose(false));
});

check('late privacy API and loading document initialize safely without duplicate loader or click listeners', () => {
 const page = fixture({container: 'GTM-TEST1234', granted: true, privacyLate: true, loading: true});
 assert.equal(page.scripts.length, 0);
 page.connectLate(); assert.equal(page.scripts.length, 0);
 page.ready(); page.run(); page.ready();
 assert.equal(page.scripts.length, 1);
 page.click(); assert.equal(page.clarity.length, 1);
});

console.log(count + ' Google measurement regression groups passed (synthetic VM; live account configuration remains a separate check).');
