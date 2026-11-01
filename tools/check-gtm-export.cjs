/* Validate a downloaded GTM draft as data only. No exported JavaScript is run.
 * Usage: node tools/check-gtm-export.cjs [export.json] [--self-test]
 * This checks the site's explicit container contract, not live GA4 settings.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const owner = Object.freeze({account: '6401539304', container: '284567050', publicId: 'GTM-5PGV5KCD', measurementId: 'G-603TM871H0'});
const initializationTrigger = '2147479573';
const eventNames = ['page_view', 'contact_click', 'product_details_open', 'finder_start', 'finder_complete', 'canva_game_open', 'memory_game_complete'];
const contextFields = ['page_location', 'page_referrer', 'page_title'];
const eventFields = [...contextFields, 'placement', 'channel', 'button_id', 'product_id', 'game_id'];
const dlvPaths = ['derech_event_name', ...contextFields.map(key => 'derech_page_context.' + key), ...eventFields.map(key => 'derech_event_params.' + key)];
const falseFields = ['send_page_view', 'allow_google_signals', 'allow_ad_personalization_signals', 'allow_interest_groups'];

function validateExport(data, source) {
 const errors = [];
 const check = (condition, message) => { if (!condition) errors.push(message); };
 const list = (value, label) => { check(Array.isArray(value), label + ' must be an array'); return Array.isArray(value) ? value : []; };
 const sameKeys = (actual, expected, label) => check(actual.length === expected.length && expected.every(key => actual.includes(key)), label + ' must contain exactly: ' + expected.join(', '));
 const ref = variable => '{{' + variable?.name + '}}';
 function parameterMap(value, label, expectedKeys) {
  const result = new Map();
  for (const item of list(value, label)) {
   check(item && typeof item.key === 'string', label + ' has a parameter without a key');
   if (!item || typeof item.key !== 'string') continue;
   check(!result.has(item.key), label + ' duplicates parameter ' + item.key);
   result.set(item.key, item);
  }
  if (expectedKeys) sameKeys([...result.keys()], expectedKeys, label);
  return result;
 }
 function parameter(parameters, key, type, label) {
  const item = parameters.get(key);
  check(item?.type === type, label + '.' + key + ' must have type ' + type);
  return item;
 }
 function table(parameters, key, label, expectedFields) {
  const rows = parameter(parameters, key, 'LIST', label)?.list;
  const result = new Map();
  for (const [index, row] of list(rows, label + '.' + key).entries()) {
   check(row?.type === 'MAP', label + ' row ' + index + ' must be a MAP');
   const map = parameterMap(row?.map, label + ' row ' + index, ['parameter', 'parameterValue']);
   const name = parameter(map, 'parameter', 'TEMPLATE', label)?.value;
   const value = parameter(map, 'parameterValue', 'TEMPLATE', label)?.value;
   check(typeof name === 'string' && !result.has(name), label + ' duplicates or omits a field name');
   result.set(name, value);
  }
  sameKeys([...result.keys()], expectedFields, label + '.' + key);
  return result;
 }
 function identities(items, idKey, label) {
  const ids = new Set(), names = new Set();
  for (const item of items) {
   check(item?.accountId === owner.account && item?.containerId === owner.container, label + ' account/container IDs must match the owner');
   if (idKey) { check(typeof item?.[idKey] === 'string' && !ids.has(item[idKey]), label + ' has a missing/duplicate ID'); ids.add(item?.[idKey]); }
   check(typeof item?.name === 'string' && item.name.length > 0 && !names.has(item.name), label + ' has a missing/duplicate name'); names.add(item?.name);
   if (item?.path) check(item.path.startsWith('accounts/' + owner.account + '/containers/' + owner.container + '/'), label + ' has a foreign resource path');
  }
 }

 check(data?.exportFormatVersion === 2, 'Expected GTM export format 2');
 const version = data?.containerVersion || {};
 const container = version.container || {};
 check(version.accountId === owner.account && version.containerId === owner.container, 'Container-version numeric IDs differ from the owner');
 check(container.accountId === owner.account && container.containerId === owner.container && container.publicId === owner.publicId, 'Container identity differs from the owner');
 sameKeys(list(container.usageContext, 'container.usageContext'), ['WEB'], 'Container usage');
 sameKeys(list(container.tagIds, 'container.tagIds'), [owner.publicId], 'Container tag IDs');
 for (const [constant, expected] of [['GTM_CONTAINER_ID', owner.publicId], ['GA4_MEASUREMENT_ID', owner.measurementId]]) {
  const matches = [...source.matchAll(new RegExp('const\\s+' + constant + "\\s*=\\s*'([^']+)'", 'g'))];
  check(matches.length === 1 && matches[0][1] === expected, 'Site source ' + constant + ' differs from the owner-confirmed ID');
 }
 const tags = list(version.tag, 'tags'), triggers = list(version.trigger, 'triggers'), variables = list(version.variable, 'variables');
 const builtins = list(version.builtInVariable || [], 'built-in variables');
 identities(tags, 'tagId', 'Tag'); identities(triggers, 'triggerId', 'Trigger'); identities(variables, 'variableId', 'Variable'); identities(builtins, null, 'Built-in variable');
 for (const collection of ['customTemplate', 'client', 'zone', 'transformation', 'gtagConfig']) check(!version[collection]?.length, 'Unexpected executable container collection: ' + collection);
 check(tags.length === 2 && tags.filter(tag => tag.type === 'googtag').length === 1 && tags.filter(tag => tag.type === 'gaawe').length === 1, 'Expected exactly one native Google tag and one native GA4 event tag; no other trackers/custom HTML');
 check(triggers.length === 1 && triggers[0].type === 'CUSTOM_EVENT', 'Expected only one custom-event trigger');
 check(variables.length === 15, 'Expected 12 DLVs, one shared-settings variable, one empty config variable and one Boolean-false variable');
 check(variables.every(variable => ['v', 'gtes', 'gtcs', 'jsm'].includes(variable.type)), 'Unsupported or potentially executable extra variable type');

 const dlvs = new Map();
 for (const variable of variables.filter(item => item.type === 'v')) {
  const label = 'DLV ' + variable.name;
  const params = parameterMap(variable.parameter, label, ['dataLayerVersion', 'setDefaultValue', 'name']);
  check(parameter(params, 'dataLayerVersion', 'INTEGER', label)?.value === '2', label + ' must use data-layer version 2');
  check(parameter(params, 'setDefaultValue', 'BOOLEAN', label)?.value === 'false', label + ' must not have a fallback/default');
  const name = parameter(params, 'name', 'TEMPLATE', label)?.value;
  check(dlvPaths.includes(name) && !dlvs.has(name), label + ' has an unknown or duplicate data-layer path');
  dlvs.set(name, variable);
  check(!variable.formatValue || Object.keys(variable.formatValue).length === 0, label + ' must not transform missing/Boolean values');
 }
 sameKeys([...dlvs.keys()], dlvPaths, 'DLV mappings');
 const falseVariables = variables.filter(variable => variable.type === 'jsm');
 check(falseVariables.length === 1, 'Expected exactly one restricted Boolean-false variable');
 const falseVariable = falseVariables[0];
 if (falseVariable) {
  const params = parameterMap(falseVariable.parameter, 'Boolean-false variable', ['javascript']);
  const code = parameter(params, 'javascript', 'TEMPLATE', 'Boolean-false variable')?.value;
  // Accept only this inert function, with whitespace variations; NEVER evaluate it.
  check(typeof code === 'string' && /^function\s*\(\s*\)\s*\{\s*return\s+false\s*;\s*\}$/.test(code), 'The sole Custom JavaScript variable must be exactly a pure return-false function');
  check(!falseVariable.formatValue || Object.keys(falseVariable.formatValue).length === 0, 'Boolean false must not be coerced/formatted');
 }
 const configVariables = variables.filter(variable => variable.type === 'gtcs');
 check(configVariables.length === 1 && !configVariables[0].parameter?.length, 'Shared configuration variable must be empty: no hidden overrides');
 const sharedVariables = variables.filter(variable => variable.type === 'gtes');
 check(sharedVariables.length === 1, 'Expected exactly one safe shared event-settings variable');
 const shared = sharedVariables[0];
 if (shared) {
  const params = parameterMap(shared.parameter, 'Shared event settings', ['eventSettingsTable']);
  const rows = table(params, 'eventSettingsTable', 'Shared event settings', contextFields);
  for (const field of contextFields) check(rows.get(field) === ref(dlvs.get('derech_page_context.' + field)), 'Shared ' + field + ' must use stable sanitized context, including automatic events');
 }

 for (const tag of tags) {
  const label = 'Tag ' + tag.name;
  check(tag.tagFiringOption === 'ONCE_PER_EVENT', label + ' must fire once per event');
  for (const key of ['setupTag', 'teardownTag', 'blockingTriggerId']) check(!tag[key]?.length, label + ' must not introduce extra sequencing/blocking');
  check(tag.paused !== true && tag.liveOnly !== true, label + ' must not be paused or restricted to bypass preview checks');
  const consent = tag.consentSettings;
  check(consent?.consentStatus === 'NEEDED' && consent?.consentType?.type === 'LIST', label + ' must require additional analytics_storage consent');
  const types = consent?.consentType?.list;
  check(Array.isArray(types) && types.length === 1 && types[0].type === 'TEMPLATE' && types[0].value === 'analytics_storage', label + ' must require exactly analytics_storage');
 }
 const google = tags.find(tag => tag.type === 'googtag');
 if (google) {
  const params = parameterMap(google.parameter, 'Google tag', ['tagId', 'configSettingsVariable', 'configSettingsTable', 'eventSettingsVariable']);
  check(parameter(params, 'tagId', 'TEMPLATE', 'Google tag')?.value === owner.measurementId, 'Google tag has the wrong GA4 measurement ID');
  check(parameter(params, 'configSettingsVariable', 'TEMPLATE', 'Google tag')?.value === ref(configVariables[0]), 'Google tag must reference the reviewed empty config variable');
  check(parameter(params, 'eventSettingsVariable', 'TEMPLATE', 'Google tag')?.value === ref(shared), 'Google tag must attach safe shared settings for automatic events');
  const rows = table(params, 'configSettingsTable', 'Google tag', [...falseFields, ...contextFields]);
  for (const field of falseFields) check(rows.get(field) === ref(falseVariable), field + ' must resolve to typed Boolean false, not the text false');
  for (const field of contextFields) check(rows.get(field) === ref(dlvs.get('derech_page_context.' + field)), 'Initialization ' + field + ' must use stable sanitized context');
  sameKeys(list(google.firingTriggerId, 'Google tag triggers'), [initializationTrigger], 'Google tag must fire only on built-in Initialization');
 }
 const eventTag = tags.find(tag => tag.type === 'gaawe');
 const trigger = triggers[0];
 if (eventTag) {
  const params = parameterMap(eventTag.parameter, 'GA4 event tag', ['sendEcommerceData', 'eventSettingsTable', 'eventName', 'measurementIdOverride']);
  check(parameter(params, 'sendEcommerceData', 'BOOLEAN', 'GA4 event tag')?.value === 'false', 'Ecommerce sending must be Boolean false');
  check(parameter(params, 'measurementIdOverride', 'TEMPLATE', 'GA4 event tag')?.value === owner.measurementId, 'Event tag has the wrong GA4 measurement ID');
  check(parameter(params, 'eventName', 'TEMPLATE', 'GA4 event tag')?.value === ref(dlvs.get('derech_event_name')), 'Event tag must resolve the approved data-layer event name');
  const rows = table(params, 'eventSettingsTable', 'GA4 event tag', eventFields);
  for (const field of eventFields) check(rows.get(field) === ref(dlvs.get('derech_event_params.' + field)), 'Event field ' + field + ' must resolve only its approved payload DLV');
  sameKeys(list(eventTag.firingTriggerId, 'Event tag triggers'), [trigger?.triggerId], 'GA4 event tag must fire only on its reviewed custom trigger');
 }
 if (trigger) {
  check(list(trigger.customEventFilter, 'Custom event filters').length === 1, 'Custom trigger must match a single exact data-layer event');
  const custom = trigger.customEventFilter?.[0];
  check(custom?.type === 'EQUALS', 'Custom trigger must use exact equality');
  const params = parameterMap(custom?.parameter, 'Custom event filter', ['arg0', 'arg1']);
  check(parameter(params, 'arg0', 'TEMPLATE', 'Custom event filter')?.value === '{{_event}}' && parameter(params, 'arg1', 'TEMPLATE', 'Custom event filter')?.value === 'derech_event', 'Custom trigger must match only derech_event');
  check(list(trigger.filter, 'Event-name filters').length === 1, 'Custom trigger must have one explicit event-name allowlist');
  const filter = trigger.filter?.[0];
  check(filter?.type === 'MATCH_REGEX', 'Event-name filter must be the restricted regex allowlist');
  const patternParams = parameterMap(filter?.parameter, 'Event-name filter', ['arg0', 'arg1']);
  check(parameter(patternParams, 'arg0', 'TEMPLATE', 'Event-name filter')?.value === ref(dlvs.get('derech_event_name')), 'Event-name allowlist must inspect the approved event-name DLV');
  const pattern = parameter(patternParams, 'arg1', 'TEMPLATE', 'Event-name filter')?.value;
  const alternatives = typeof pattern === 'string' && pattern.startsWith('^(') && pattern.endsWith(')$') ? pattern.slice(2, -2).split('|') : [];
  sameKeys(alternatives, eventNames, 'Anchored event-name allowlist');
  check(new Set(alternatives).size === alternatives.length, 'Event-name allowlist must not duplicate or widen alternatives');
  for (const key of ['autoEventFilter', 'waitForTags', 'checkValidation']) check(!trigger[key], 'Unexpected automatic-event trigger configuration: ' + key);
 }

 // Resolve all template references without running any exported code or regex.
 const variableNames = new Set(variables.map(variable => variable.name));
 const rawBuiltins = new Set([...builtins.filter(item => item.type !== 'EVENT').map(item => item.name), '_url', '_referrer', 'Page URL', 'Referrer', 'Click URL']);
 function references(value) {
  if (typeof value === 'string') for (const match of value.matchAll(/\{\{([^{}]+)\}\}/g)) {
   check(!rawBuiltins.has(match[1]), 'Raw URL/referrer/click built-in reference is forbidden: ' + match[1]);
   check(match[1] === '_event' || variableNames.has(match[1]), 'Missing variable reference: ' + match[1]);
  }
  else if (Array.isArray(value)) value.forEach(references);
  else if (value && typeof value === 'object') Object.values(value).forEach(references);
 }
 [tags, triggers, variables].forEach(references);
 return errors;
}

function selfTest(data, source) {
 const clone = () => JSON.parse(JSON.stringify(data));
 const param = (node, key) => node.parameter.find(item => item.key === key);
 const dlv = (version, name) => version.variable.find(item => item.type === 'v' && param(item, 'name').value === name);
 const google = version => version.tag.find(item => item.type === 'googtag');
 const events = version => version.tag.find(item => item.type === 'gaawe');
 const mutations = [
  ['lost consent', version => { delete google(version).consentSettings; }],
  ['wrong GA4 destination', version => { param(events(version), 'measurementIdOverride').value = 'G-WRONG1234'; }],
  ['raw URL reference', version => { const row = param(google(version), 'configSettingsTable').list[4]; row.map.find(item => item.key === 'parameterValue').value = '{{Page URL}}'; }],
  ['duplicate event tag', version => { const extra = JSON.parse(JSON.stringify(events(version))); extra.tagId = '999'; extra.name += ' duplicate'; version.tag.push(extra); }],
  ['duplicate event firing', version => { events(version).firingTriggerId.push(events(version).firingTriggerId[0]); }],
  ['untyped text false', version => { param(google(version), 'configSettingsTable').list[0].map.find(item => item.key === 'parameterValue').value = 'false'; }],
  ['missing referenced variable', version => { version.variable = version.variable.filter(item => item !== dlv(version, 'derech_event_name')); }],
  ['DLV default enabled', version => { param(dlv(version, 'derech_event_params.page_referrer'), 'setDefaultValue').value = 'true'; }],
  ['old DLV merge version', version => { param(dlv(version, 'derech_event_params.product_id'), 'dataLayerVersion').value = '1'; }],
  ['regex widened', version => { param(version.trigger[0].filter[0], 'arg1').value = '^(page_view|contact_click|product_details_open|finder_start|finder_complete|canva_game_open|memory_game_complete|.*)$'; }],
  ['custom JavaScript side effect', version => { param(version.variable.find(item => item.type === 'jsm'), 'javascript').value = 'function () { window.sideEffect(); return false; }'; }],
  ['ecommerce enabled', version => { param(events(version), 'sendEcommerceData').value = 'true'; }],
  ['extra user property payload', version => { param(events(version), 'eventSettingsTable').list.push({type: 'MAP', map: [{type: 'TEMPLATE', key: 'parameter', value: 'user_id'}, {type: 'TEMPLATE', key: 'parameterValue', value: 'private'}]}); }],
  ['wrong container numeric ID', version => { version.container.containerId = '999'; }],
  ['missing shared automatic-event settings', version => { param(google(version), 'eventSettingsVariable').value = ''; }]
 ];
 for (const [label, mutate] of mutations) {
  const changed = clone(); mutate(changed.containerVersion);
  if (!validateExport(changed, source).length) throw Error('Self-test did not reject: ' + label);
 }
 const renamed = clone();
 const variable = dlv(renamed.containerVersion, 'derech_event_params.page_location');
 const original = '{{' + variable.name + '}}'; variable.name = 'Renamed safe location DLV';
 function rename(value) {
  if (Array.isArray(value)) value.forEach(rename);
  else if (value && typeof value === 'object') for (const key of Object.keys(value)) {
   if (typeof value[key] === 'string') value[key] = value[key].replaceAll(original, '{{' + variable.name + '}}');
   else rename(value[key]);
  }
 }
 rename(renamed);
 renamed.containerVersion.variable.reverse(); renamed.containerVersion.tag.reverse();
 for (const item of renamed.containerVersion.variable) item.parameter?.reverse();
 if (validateExport(renamed, source).length) throw Error('Self-test rejected harmless variable renaming/reordering');
 return mutations.length + 1;
}

if (require.main === module) {
 try {
  const args = process.argv.slice(2);
  const positional = args.filter(arg => !arg.startsWith('--'));
  if (positional.length > 1 || args.some(arg => arg.startsWith('--') && arg !== '--self-test')) throw Error('Usage: node tools/check-gtm-export.cjs [export.json] [--self-test]');
  const file = path.resolve(positional[0] || path.join(__dirname, '../artifacts/analytics/GTM-5PGV5KCD-draft-20261101.json'));
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const source = fs.readFileSync(path.join(__dirname, '../docs/measurement.js'), 'utf8');
  const errors = validateExport(data, source);
  if (errors.length) throw Error(errors.length + ' export contract violation(s):\n- ' + errors.join('\n- '));
  console.log('PASS owner/source IDs; 2 native tags; 12 v2 DLVs; typed false and clean shared context; 8 event fields; exact 7-event trigger; consent and reference integrity.');
  if (args.includes('--self-test')) console.log('PASS ' + selfTest(data, source) + ' self-test cases (15 unsafe mutations rejected; harmless rename/reorder accepted).');
  console.log('Not checked: GA4 admin Enhanced Measurement, Signals, custom dimensions, published container, browser requests or account receipt. No exported JavaScript was executed.');
 } catch (error) { console.error('FAIL ' + error.message); process.exitCode = 1; }
}

module.exports = {validateExport, selfTest};
