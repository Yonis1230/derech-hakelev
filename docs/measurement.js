/* Owner-provided public GTM container ID. Container/GA4 account settings and live
 * delivery still require verification; this source alone does not prove receipt.
 * Interaction and page-view tags must use ONLY the derech_event trigger. A Google
 * Tag may use Initialization with the preloaded, stable version-2 DLV fields:
 * derech_page_context.page_location, derech_page_context.page_referrer and
 * derech_page_context.page_title. Never use per-event fields at Initialization;
 * they become available on derech_event, after the gtm.js bootstrap message.
 * Google Tag configuration: send_page_view=false, allow_google_signals=false,
 * allow_ad_personalization_signals=false, allow_interest_groups=false. Share the
 * sanitized page_location/page_referrer/page_title with EVERY GA4 event, including
 * automatically collected events. Disable ALL enhanced measurement in GA4,
 * including history page views, outgoing links, search, forms, video and downloads.
 * Do not add click/URL variables, user IDs/properties, user-provided data or Ads
 * destinations. Never install another gtag.js loader alongside this container.
 */
(() => {
 'use strict';
 const GTM_CONTAINER_ID = 'GTM-5PGV5KCD';
 const GA4_MEASUREMENT_ID = 'G-603TM871H0';
 if (window.DERECH_MEASUREMENT) return;
 const gaDisableKey = 'ga-disable-' + GA4_MEASUREMENT_ID;
 // The Google tag checks this property before cookie writes and data sends.
 // Keep it disabled even when vendor code has already executed, including during
 // the privacy controller's withdrawal reload/pagehide handling.
 // https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics
 window[gaDisableKey] = true;

 const products = new Set(['solutions', 'resilience', 'drive', 'world', 'thoughts', 'emotions', 'derech', 'workbook', 'escape']);
 const placements = new Set(['header', 'hero', 'services', 'testimonials', 'benefits', 'hosen', 'contact', 'footer', 'catalog', 'finder', 'floating', 'product_top', 'product_bottom', 'online', 'sample_game']);
 const channels = new Set(['whatsapp', 'phone', 'email']);
 const treatmentPlacements = new Set(['services', 'testimonials', 'benefits', 'hosen']);
 const treatmentButtons = new Set(['therapy_whatsapp', 'testimonials_whatsapp', 'benefits_whatsapp', 'hosen_whatsapp']);
 const staticButtons = new Set(['header_whatsapp', 'therapy_whatsapp', 'testimonials_whatsapp', 'benefits_whatsapp', 'hosen_whatsapp', 'contact_whatsapp', 'contact_phone', 'contact_email', 'content_whatsapp', 'content_phone', 'content_email', 'footer_whatsapp', 'footer_phone', 'footer_email', 'bundle_order', 'bundle_whatsapp', 'pack_offer_contact', 'floating_whatsapp', 'floating_bundle_offer', 'finder_whatsapp', 'finder_bundle']);
 const games = new Set(['dogs_trivia', 'resilience_trivia', 'thinking_trivia', 'solutions_memory']);
 const canvaButtons = Object.freeze({canva_dogs: 'dogs_trivia', canva_resilience: 'resilience_trivia', canva_thinking: 'thinking_trivia'});
 const production = ['derech-hakelev.com', 'www.derech-hakelev.com'].includes(location.hostname);
 let permission = false;
 let connected = false;
 let initialized = false;
 let loader;
 let googleStarted = false;
 let stopped = false;
 let communityContext = false;
 const communityLocations = new Set(['article', 'articles_index', 'home', 'footer']);

 function command() { window.dataLayer.push(arguments); }

 // Commerce loads after consent; other allowed pages load only on a community click.
 function googlePage() {
  const path = location.pathname;
  // Community clicks may load the existing container after consent. They do not
  // enable automatic page views or other measurement on these routes.
  if (communityContext && (/^\/(?:index\.html)?$/.test(path) || /^\/pages\/(?:articles|faq|privacy|accessibility)(?:\/[a-z-]+)*\/(?:index\.html)?$/.test(path) || /^\/articles\/[a-z-]+\/(?:index\.html)?$/.test(path))) {
   return {path, title: 'Community invitation | Derech Hakelev', communityOnly: true};
  }
  if (path === '/pages/games/' || path === '/pages/games/index.html') {
   return {path: '/pages/games/', title: 'Games and tools | Derech Hakelev'};
  }
  const match = path.match(/^\/pages\/games\/products\/([a-z]+)\/(?:index\.html)?$/);
  return match && products.has(match[1])
   ? {path: '/pages/games/products/' + match[1] + '/', title: 'Product | Derech Hakelev'}
   : null;
 }

 function buttonAllowed(value) {
  if (staticButtons.has(value)) return true;
  const match = typeof value === 'string' && value.match(/^(?:catalog_order|product_top_order|product_bottom_order|product_top|product_bottom|finder_product)_(solutions|resilience|drive|world|thoughts|emotions|derech|workbook|escape)$/);
  return !!match;
 }

 // Deliberately discard unknown keys. Never copy arbitrary objects or DOM text into a payload.
 function clean(name, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const params = {};
  if (name === 'whatsapp_community_click') {
   if (!communityLocations.has(input.link_location) || input.link_type !== 'community_invite') return null;
   return {link_location: input.link_location, page_path: location.pathname, link_type: 'community_invite'};
  }
  if (!placements.has(input.placement)) return null;
  params.placement = input.placement;
  if (name === 'contact_click') {
   if (!channels.has(input.channel) || !buttonAllowed(input.button_id)) return null;
   params.channel = input.channel;
   params.button_id = input.button_id;
   if (products.has(input.product_id)) params.product_id = input.product_id;
  } else if (name === 'product_details_open') {
   if (!products.has(input.product_id)) return null;
   params.product_id = input.product_id;
  } else if (name === 'canva_game_open') {
   if (!games.has(input.game_id) || input.game_id === 'solutions_memory') return null;
   params.game_id = input.game_id;
  } else if (name === 'memory_game_complete') {
   if (input.game_id !== 'solutions_memory') return null;
   params.game_id = 'solutions_memory';
  } else if (name !== 'finder_start' && name !== 'finder_complete') return null;
  return params;
 }

 function safePageFields(page) {
  return {
   page_location: 'https://derech-hakelev.com' + page.path,
   page_referrer: '',
   page_title: page.title
  };
 }

 function googleEvent(name, params) {
  const page = googlePage();
  if (!googleStarted || stopped || !permission || !page) return;
  if (page.communityOnly && name !== 'whatsapp_community_click') return;
  if (treatmentPlacements.has(params.placement) || treatmentButtons.has(params.button_id)) return;
  // GTM's version-2 data layer recursively merges objects. Clear the old object
  // first so a finder/page-view event cannot inherit an earlier product/channel.
  window.dataLayer.push({derech_event_params: null});
  window.dataLayer.push({
   event: 'derech_event',
   derech_event_name: name,
   derech_event_params: {...params, ...safePageFields(page)}
  });
 }

 function startGoogle() {
  const page = googlePage();
  if (!initialized || !production || !permission || stopped || googleStarted || !page || !/^GTM-[A-Z0-9]+$/.test(GTM_CONTAINER_ID)) return;
  window.dataLayer = window.dataLayer || [];
  // Populate the GTM data model BEFORE any bootstrap event can initialize tags.
  // These stable context DLVs exist even before the first derech_event payload.
  window.dataLayer.push({derech_page_context: safePageFields(page)});
  // Basic consent mode: this entire queue and loader are created AFTER approval.
  // Advertising remains denied even though site measurement has been approved.
  command('consent', 'default', {
   analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  });
  command('set', {
   ...safePageFields(page), send_page_view: false, allow_google_signals: false,
   allow_ad_personalization_signals: false, allow_interest_groups: false
  });
  window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
  googleStarted = true;
  if (!page.communityOnly) googleEvent('page_view', {});
  loader = document.createElement('script');
  loader.async = true;
  loader.id = 'derech-google-tag-manager';
  loader.referrerPolicy = 'no-referrer';
  loader.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_CONTAINER_ID;
  window[gaDisableKey] = false;
  document.head.append(loader);
 }

 function clearGoogleCookies() {
  let cookies = '';
  try { cookies = document.cookie || ''; } catch { /* Cookie access may be disabled. */ }
  const names = cookies.split(';').map(part => part.split('=')[0].trim()).filter(name => /^_ga(?:_[A-Za-z0-9_]+)?$/.test(name));
  const domains = new Set(['', location.hostname, '.' + location.hostname]);
  if (production) { domains.add('derech-hakelev.com'); domains.add('.derech-hakelev.com'); }
  const paths = new Set(['/']);
  let path = '';
  for (const segment of location.pathname.split('/').filter(Boolean)) {
   path += '/' + segment;
   paths.add(path); paths.add(path + '/');
  }
  for (const name of names) for (const domain of domains) for (const cookiePath of paths) {
   try { document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + cookiePath + (domain ? '; domain=' + domain : ''); } catch { /* Cookie access may be disabled. */ }
  }
 }

 function update(preferences) {
  const previous = permission;
  permission = preferences?.analytics === true;
  if (previous && !permission) {
   // Disable native automatic hits synchronously before consent processing,
   // cookie cleanup, or the privacy controller's subsequent reload can run.
   window[gaDisableKey] = true;
   stopped = true;
   if (googleStarted) command('consent', 'update', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
   });
   loader?.remove();
   clearGoogleCookies();
   // Removing a loader cannot unload executed vendor code. The production privacy
   // controller reloads on withdrawal; do not replace that reload with this cleanup.
  }
  if (permission) startGoogle();
 }

 function connect() {
  if (connected || !window.DERECH_PRIVACY) return;
  connected = true;
  update(window.DERECH_PRIVACY.getPreferences());
  window.DERECH_PRIVACY.subscribe(update);
 }

 function track(name, input) {
  if (!production || stopped || !permission) return false;
  // Read current preferences as well as subscription state to fail closed.
  if (window.DERECH_PRIVACY?.getPreferences().analytics !== true) return false;
  const params = clean(name, input);
  if (!params) return false;
  if (name === 'whatsapp_community_click') {
   communityContext = true;
   startGoogle();
  }
  try { window.DERECH_PRIVACY.trackEvent?.(name, {...params}); } catch { /* Clarity failure must not break the page or other collectors. */ }
  googleEvent(name, params);
  return true;
 }
 window.DERECH_MEASUREMENT = Object.freeze({track});

 document.addEventListener('click', event => {
  const community = event.target?.closest?.('a[data-community-location]');
  if (community) {
   let invite;
   try { invite = new URL(community.href); } catch { return; }
   if (invite.protocol === 'https:' && invite.hostname === 'chat.whatsapp.com') {
    track('whatsapp_community_click', {link_location: community.dataset.communityLocation, link_type: 'community_invite'});
   }
   return;
  }
  const control = event.target?.closest?.('a[data-measure-id]');
  if (!control) return;
  const buttonId = control.dataset.measureId;
  const placement = control.dataset.measurePlacement;
  let url;
  try { url = new URL(control.href, location.href); } catch { return; }
  if (Object.hasOwn(canvaButtons, buttonId) && url.hostname === 'www.canva.com') {
   track('canva_game_open', {placement, game_id: canvaButtons[buttonId]});
   return;
  }
  const channel = ['wa.me', 'api.whatsapp.com'].includes(url.hostname) && url.protocol === 'https:' ? 'whatsapp'
   : url.protocol === 'tel:' ? 'phone' : url.protocol === 'mailto:' ? 'email' : null;
  if (channel) track('contact_click', {channel, button_id: buttonId, placement, product_id: control.dataset.productId});
 });
 document.addEventListener('derech:privacy-change', () => { if (!connected) connect(); });
 function initialize() { initialized = true; connect(); startGoogle(); }
 connect();
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
 else initialize();
})();
