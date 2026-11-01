document.addEventListener('DOMContentLoaded', () => {
 const base=document.body.dataset.base || '';
 const measure=(name,params)=>{try{window.DERECH_MEASUREMENT?.track(name,params);}catch{}};
 function markMeasurement(node,id,placement,productId){
  node.dataset.measureId=id;node.dataset.measurePlacement=placement;
  if(productId)node.dataset.productId=productId;
  return node;
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const media=window.DERECH_MEDIA || {};
 function image(photo,path,sizes) {
  photo.decoding='async';
  const entry=media[path];
  if(entry){photo.width=entry.width;photo.height=entry.height;photo.sizes=sizes;photo.srcset=entry.srcset.split(', ').map(part=>base+part).join(', ');}
  photo.src=base+(entry?.src || path);
 }
 const videos=new Map();
 function updateVideo(frame,state,allowed){
  const enabled=(allowed||state.once)&&!frame.closest('.game-details')?.hidden;
  frame.hidden=!enabled;state.notice.hidden=enabled;
  if(enabled){if(!frame.getAttribute('src'))frame.src=frame.dataset.src;}
  else frame.removeAttribute('src');
 }
 function prepareVideo(frame) {
  if(!frame.dataset.src){frame.dataset.src=frame.getAttribute('src');frame.removeAttribute('src');}
  frame.loading='lazy';
  if(!videos.has(frame)){
   const host=new URL(frame.dataset.src,location.href).hostname;
   const provider=host.includes('youtube')?'YouTube':'Facebook';
   const notice=document.createElement('div');notice.className='video-placeholder';
   const text=document.createElement('p');text.textContent=frame.title+'. הפעלת הסרטון תיצור חיבור ל־'+provider+', שעשוי להשתמש בעוגיות ולאסוף נתוני שימוש.';
   const load=document.createElement('button');load.type='button';load.className='button button-secondary';load.textContent='הפעלת הסרטון מ־'+provider;
   const state={notice,once:false};videos.set(frame,state);
   load.addEventListener('click',()=>{state.once=true;updateVideo(frame,state,false);frame.focus?.({preventScroll:true});});
   notice.append(text,load);frame.before(notice);
  }
  updateVideo(frame,videos.get(frame),window.DERECH_PRIVACY?.getPreferences().externalMedia===true);
 }
 document.querySelectorAll('iframe[data-src]').forEach(prepareVideo);
 window.DERECH_PRIVACY?.subscribe(preferences=>videos.forEach((state,frame)=>{
  if(!preferences.externalMedia)state.once=false;
  updateVideo(frame,state,preferences.externalMedia);
 }));

 function gallery(images,name,tag='',autoPlayMs=0) {
  const el=document.createElement('div');el.className='gallery';el.setAttribute('aria-label','גלריית '+name);
  const sizes=autoPlayMs?'(max-width: 760px) calc(100vw - 36px), 600px':'(max-width: 760px) calc(100vw - 36px), 320px';
  let img=document.createElement('img');img.alt=name+' — תמונה 1';img.loading=autoPlayMs?'eager':'lazy';
  if(autoPlayMs)img.fetchPriority='high';
  image(img,images[0],sizes);el.append(img);
  if(tag){const label=document.createElement('span');label.className='gallery-tag';label.textContent=tag;el.append(label);}
  if(images.length>1){
   let index=0,requestedIndex=0,requestId=0,pending=false,timer,visible=false;
   const cache=new Map(),count=document.createElement('span');count.className='gallery-count';
   count.textContent='1 / '+images.length;
   const initial=new Promise(resolve=>{if(img.complete)resolve(img.naturalWidth?img:null);else{img.onload=()=>resolve(img);img.onerror=()=>resolve(null);}});
   cache.set(0,initial);
   function preload(i){
    if(!cache.has(i)){
     const ready=new Promise(resolve=>{
      const photo=new Image();photo.fetchPriority='low';
      photo.onload=async()=>{try{await photo.decode();}catch{}resolve(photo);};
      photo.onerror=()=>{cache.delete(i);resolve(null);};image(photo,images[i],sizes);
     });cache.set(i,ready);
    }return cache.get(i);
   }
   function preloadNext(){if(visible&&!document.hidden)preload((index+1)%images.length);}
   function trimCache(){
    const keep=new Set([index,(index+1)%images.length,(index-1+images.length)%images.length]);
    for(const key of cache.keys())if(!keep.has(key))cache.delete(key);
   }
   async function show(nextIndex){
    const token=++requestId;pending=true;el.setAttribute('aria-busy','true');
    const photo=await preload(nextIndex);
    if(token!==requestId)return;
    pending=false;el.setAttribute('aria-busy','false');
    if(!photo){requestedIndex=index;return;}
    photo.alt=name+' — תמונה '+(nextIndex+1);
    img.replaceWith(photo);img=photo;index=nextIndex;requestedIndex=index;
    count.textContent=(index+1)+' / '+images.length;trimCache();preloadNext();
   }
   const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
   let playing=!!autoPlayMs&&!motion.matches,hovered=false,focused=false,explicitPlay=false;
   function resetTimer(){
    clearInterval(timer);
    if(playing&&visible&&!document.hidden&&(explicitPlay||(!hovered&&!focused)))timer=setInterval(()=>{
     if(!document.body.classList.contains('game-advisor-open')&&!pending&&img.complete&&img.naturalWidth){requestedIndex=(index+1)%images.length;show(requestedIndex);}
    },autoPlayMs);
   }
   ['prev','next'].forEach((dir,i)=>{
    const b=document.createElement('button');b.type='button';b.className=dir;b.textContent=i?'←':'→';
    b.setAttribute('aria-label',(i?'התמונה הבאה':'התמונה הקודמת')+' — '+name);
    b.addEventListener('click',()=>{explicitPlay=false;requestedIndex=(requestedIndex+(i?1:-1)+images.length)%images.length;show(requestedIndex);resetTimer();});el.append(b);
   });
   if(autoPlayMs){
    const pause=document.createElement('button');pause.type='button';pause.className='gallery-autoplay';
    function labelPause(){pause.textContent=playing?'השהיה Ⅱ':'הפעלה ▶';pause.setAttribute('aria-label',playing?'השהיית החלפת התמונות האוטומטית':'הפעלת החלפת התמונות האוטומטית');}
    pause.addEventListener('click',()=>{playing=!playing;explicitPlay=playing;labelPause();resetTimer();});labelPause();el.append(pause);
    el.addEventListener('focusin',()=>{focused=true;explicitPlay=false;resetTimer();});
    el.addEventListener('focusout',e=>{focused=el.contains(e.relatedTarget);if(!focused)explicitPlay=false;resetTimer();});
    el.addEventListener('mouseenter',()=>{hovered=true;explicitPlay=false;resetTimer();});
    el.addEventListener('mouseleave',()=>{hovered=false;resetTimer();});
    motion.addEventListener?.('change',e=>{if(e.matches){playing=false;labelPause();resetTimer();}});
    document.addEventListener('visibilitychange',()=>{resetTimer();preloadNext();});
   }
   if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resetTimer();initial.then(preloadNext);});observer.observe(el);
   }else{visible=true;initial.then(preloadNext);resetTimer();}
   el.append(count);
  }return el;
 }
 function card(p,featured){
  const el=document.createElement('article');el.className='game-card';el.id='game-'+p.id;
  const main=document.createElement('div');main.className='card-main';
  const content=document.createElement('div');content.innerHTML=p.details.replace(/(<iframe\b[^>]*?)\bsrc=/gi,'$1data-src=');
  const previewVideo=p.id==='workbook'?content.querySelector('iframe'):null;
  if(previewVideo){const wrapper=document.createElement('div');wrapper.className='card-video';wrapper.append(previewVideo);main.append(wrapper);prepareVideo(previewVideo);}
  else if(p.images.length)main.append(gallery(p.images,p.name,p.tag));else{const art=document.createElement('div');art.className='digital-art';art.innerHTML='<span aria-hidden="true">▤</span><strong>'+escape(p.name)+'</strong><small>'+escape(p.tag)+'</small>';main.append(art);}
  const copy=document.createElement('div');copy.className='card-copy';
  copy.innerHTML='<h3>'+escape(p.name)+'</h3>'+(p.summary?'<p>'+escape(p.summary)+'</p>':'')+'<div class="card-bottom">'+(p.outOfStock?'<span class="stock">אזל מהמלאי · לקבלת עדכון</span>':'<span class="price">'+p.price+' ₪</span>')+'</div>';
  const bottom=copy.querySelector('.card-bottom');
  if(p.badge){const badge=document.createElement('span');badge.className='product-sticker';badge.textContent=p.badge;copy.prepend(badge);}
  if(featured){const a=document.createElement('a');a.className='card-link';a.href=base+'pages/games/index.html#game-'+p.id;a.textContent='לפרטים ולהזמנה ←';markMeasurement(a,'featured_product_'+p.id,'hero',p.id);bottom.append(a);}
  else{
   const button=document.createElement('button');button.type='button';button.className='detail-toggle';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','details-'+p.id);button.setAttribute('aria-label','לפרטים ולהזמנה — '+p.name);button.innerHTML='לפרטים ולהזמנה <span aria-hidden="true">←</span>';bottom.append(button);
   markMeasurement(button,'catalog_details_'+p.id,'catalog',p.id);
   const details=document.createElement('div');details.className='game-details';details.id='details-'+p.id;details.hidden=true;details.append(...content.childNodes);
   const orderLink=details.querySelector('.whatsapp-button');
   if(orderLink)markMeasurement(orderLink,'catalog_order_'+p.id,'catalog',p.id);
   if(orderLink&&!['workbook','escape'].includes(p.id)){
    const delivery=document.createElement('p');delivery.className='product-delivery';
    delivery.textContent='משלוח עד הבית ב־35 ₪ בלבד · איסוף עצמי ללא עלות מבאר שבע';
    orderLink.before(delivery);
   }
   const pageLink=document.createElement('a');pageLink.className='product-page-link';pageLink.href=base+'pages/games/products/'+p.id+'/';pageLink.textContent='לעמוד המלא של '+p.name;details.append(pageLink);
   markMeasurement(pageLink,'catalog_product_page_'+p.id,'catalog',p.id);
   button.addEventListener('click',()=>{
    const open=details.hidden;details.hidden=!open;button.setAttribute('aria-expanded',String(open));button.innerHTML=open?'סגירת הפרטים <span aria-hidden="true">−</span>':'לפרטים ולהזמנה <span aria-hidden="true">←</span>';
    button.setAttribute('aria-label',(open?'סגירת הפרטים':'לפרטים ולהזמנה')+' — '+p.name);
    details.querySelectorAll('iframe').forEach(frame=>{if(open)prepareVideo(frame);else frame.removeAttribute('src');});
    if(open)measure('product_details_open',{product_id:p.id,placement:button.dataset.measurePlacement});
   });el.append(details);
  }
  main.append(copy);el.prepend(main);return el;
 }
 function createPackOffer(context='catalog'){
  const offer=document.createElement('aside');offer.className='pack-offer';offer.setAttribute('aria-label','מבצע על מארזי הקלפים');
  const heading=context==='advisor'?'h4':'h3';
  offer.innerHTML='<div class="pack-offer-copy"><'+heading+'>מבצע על מארזי הקלפים</'+heading+'><p class="pack-offer-prices"><strong>2 מארזים ב־320 ₪</strong><span class="pack-offer-separator" aria-hidden="true"> · </span><strong>3 מארזים ב־450 ₪</strong></p><p class="pack-offer-note">המבצע חל על מארזי הקלפים שמחירם 165 ₪ למארז.</p></div><a class="pack-offer-contact">לכמויות אחרות — שלחו הודעה ↗</a>';
  offer.querySelector('a').href=document.querySelector('.header-contact').href;
  markMeasurement(offer.querySelector('a'),'pack_offer_contact',context==='advisor'?'finder':context);
  return offer;
 }
 function mountFloatingOffer(){
  const section=document.querySelectorAll('.games-teaser, .catalog-section')[0];
  if(!section)return;
  const offer=createPackOffer('floating');offer.classList.add('floating-offer');offer.hidden=true;
  offer.querySelector('.pack-offer-note').textContent='למארזי הקלפים שמחירם 165 ₪.';
  const bundle=document.getElementById('bundle-offer');
  const quietSections=[bundle,...document.querySelectorAll('.games-teaser-actions, .catalog-advisor-invite, .contact-section, .site-footer')].filter(Boolean);
  const link=offer.querySelector('a');link.textContent='ומחכה גם מבצע על כל המוצרים ←';link.href=bundle?'#bundle-offer':base+'pages/games/index.html#bundle-offer';
  markMeasurement(link,'floating_bundle_offer','floating');
  const close=document.createElement('button');close.type='button';close.className='floating-offer-close';close.textContent='×';close.setAttribute('aria-label','סגירת תזכורת המבצעים');offer.prepend(close);
  let reachedGames=false,dismissed=false,observer;
  const visibleQuietSections=new Set();
  function update(){offer.hidden=dismissed||!reachedGames||visibleQuietSections.size>0;}
  close.addEventListener('click',()=>{dismissed=true;update();observer?.disconnect();});
  document.body.append(offer);
  if('IntersectionObserver' in window){
   observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(entry.target===section)reachedGames=entry.isIntersecting||entry.boundingClientRect.top<0;
     else if(entry.isIntersecting)visibleQuietSections.add(entry.target);else visibleQuietSections.delete(entry.target);
    }
    update();
   });
   observer.observe(section);quietSections.forEach(target=>observer.observe(target));
  }else{reachedGames=true;update();}
 }
 mountFloatingOffer();
 const target=document.getElementById('catalog');if(target)DERECH_CATALOG.forEach(p=>target.append(card(p,false)));
 const featured=document.getElementById('featured-games');
 if(featured){
  const selected=window.DERECH_FEATURED_GAMES ? window.DERECH_FEATURED_GAMES.map(id=>DERECH_CATALOG.find(p=>p.id===id)).filter(Boolean) : DERECH_CATALOG;
  selected.slice(0,2).forEach(p=>featured.append(card(p,true)));
 }
 const home=document.getElementById('home-gallery');if(home)home.append(gallery(DERECH_HOME_IMAGES,'פעילות דרך הכלב','',2000));
 const partners=document.getElementById('therapy-partners');
 if(partners)(window.DERECH_PARTNERS || []).forEach(partner=>{
  const item=document.createElement('li');
  if(partner.logo){const logo=document.createElement('img');logo.src=base+partner.logo;logo.alt='';logo.width=150;logo.height=64;logo.loading='lazy';logo.decoding='async';item.append(logo);}
  const name=document.createElement('span');name.textContent=partner.name;item.append(name);partners.append(item);
 });
 let advisorModule;
 document.querySelectorAll('[data-game-advisor]').forEach(button=>{
  if(!button.dataset.measureId)markMeasurement(button,'finder_open',button.closest('.hero')?'hero':'catalog');
  button.addEventListener('click',async()=>{
   button.disabled=true;button.setAttribute('aria-busy','true');
   try{
    advisorModule ||= import('./advisor.js?v=20261031-measurement').catch(error=>{advisorModule=undefined;throw error;});
    const advisor=await advisorModule;
    const bundleOffer=window.DERECH_BUNDLE_OFFER ? {...window.DERECH_BUNDLE_OFFER,href:base+'pages/games/index.html#bundle-offer'} : null;
    advisor.openGameAdvisor({base,catalog:DERECH_CATALOG,trigger:button,createPackOffer,prepareProductImage:image,bundleOffer});
    button.parentElement.querySelector('[data-advisor-error]')?.remove();
   }catch{
    let status=button.parentElement.querySelector('[data-advisor-error]');
    if(!status){status=document.createElement('p');status.dataset.advisorError='';status.setAttribute('role','status');button.after(status);}
    status.textContent='לא הצלחתי לפתוח את השאלון. נסו לרענן את העמוד, או פנו אליי בוואטסאפ לעזרה בבחירה.';
   }finally{button.disabled=false;button.removeAttribute('aria-busy');}
  });
 });
 // Run deep-link opening after the remaining DOM initializers (including consent
 // and measurement). This preserves stored approval without queuing earlier clicks.
 if(location.hash.startsWith('#game-')){const product=document.getElementById(location.hash.slice(1));if(product){requestAnimationFrame(()=>{product.querySelector('.detail-toggle')?.click();product.scrollIntoView();});}}
 document.querySelectorAll('a[target="_blank"]').forEach(link=>{
  link.rel='noopener noreferrer';
  if(!link.querySelector('.new-tab-notice')){const note=document.createElement('span');note.className='sr-only new-tab-notice';note.textContent=' (נפתח בלשונית חדשה)';link.append(note);}
 });
 document.querySelectorAll('[data-open-privacy]').forEach(button=>button.addEventListener('click',()=>window.DERECH_PRIVACY?.openPreferences(button)));
 const floatingContact=document.createElement('a');floatingContact.className='floating-contact';floatingContact.href='https://wa.me/972524013354';
 markMeasurement(floatingContact,'floating_whatsapp','floating');
 floatingContact.setAttribute('aria-label','יצירת קשר בוואטסאפ עם יוני');
 const whatsappIcon=document.createElement('img');whatsappIcon.src=base+'assets/icons/whatsapp.svg';whatsappIcon.alt='';whatsappIcon.width=28;whatsappIcon.height=28;whatsappIcon.setAttribute('aria-hidden','true');
 floatingContact.append(whatsappIcon);document.body.append(floatingContact);
});
