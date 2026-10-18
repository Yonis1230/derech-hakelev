document.addEventListener('DOMContentLoaded', () => {
 const base=document.body.dataset.base || '';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const media=window.DERECH_MEDIA || {};
 function image(photo,path,sizes) {
  photo.decoding='async';
  const entry=media[path];
  if(entry){photo.width=entry.width;photo.height=entry.height;photo.sizes=sizes;photo.srcset=entry.srcset.split(', ').map(part=>base+part).join(', ');}
  photo.src=base+(entry?.src || path);
 }
 const videoObserver='IntersectionObserver' in window ? new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{if(isIntersecting){target.src=target.dataset.src;videoObserver.unobserve(target);}});
 },{rootMargin:'150px'}) : null;
 function prepareVideo(frame) {
  if(!frame.dataset.src){frame.dataset.src=frame.getAttribute('src');frame.removeAttribute('src');}
  frame.loading='lazy';
  if(videoObserver)videoObserver.observe(frame);else frame.src=frame.dataset.src;
 }
 document.querySelectorAll('iframe[data-src]').forEach(prepareVideo);

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
   let playing=!!autoPlayMs&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function resetTimer(){
    clearInterval(timer);
    if(playing&&visible&&!document.hidden)timer=setInterval(()=>{
     if(!pending&&img.complete&&img.naturalWidth){requestedIndex=(index+1)%images.length;show(requestedIndex);}
    },autoPlayMs);
   }
   ['prev','next'].forEach((dir,i)=>{
    const b=document.createElement('button');b.type='button';b.className=dir;b.textContent=i?'←':'→';
    b.setAttribute('aria-label',(i?'התמונה הבאה':'התמונה הקודמת')+' — '+name);
    b.addEventListener('click',()=>{requestedIndex=(requestedIndex+(i?1:-1)+images.length)%images.length;show(requestedIndex);resetTimer();});el.append(b);
   });
   if(autoPlayMs){
    const pause=document.createElement('button');pause.type='button';pause.className='gallery-autoplay';
    function labelPause(){pause.textContent=playing?'השהיה Ⅱ':'הפעלה ▶';pause.setAttribute('aria-label',playing?'השהיית החלפת התמונות האוטומטית':'הפעלת החלפת התמונות האוטומטית');}
    pause.addEventListener('click',()=>{playing=!playing;labelPause();resetTimer();});labelPause();el.append(pause);
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
  if(featured){const a=document.createElement('a');a.className='card-link';a.href=base+'pages/games/index.html#game-'+p.id;a.textContent='לפרטים ולהזמנה ←';bottom.append(a);}
  else{
   const button=document.createElement('button');button.type='button';button.className='detail-toggle';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','details-'+p.id);button.innerHTML='לפרטים ולהזמנה <span aria-hidden="true">←</span>';bottom.append(button);
   const details=document.createElement('div');details.className='game-details';details.id='details-'+p.id;details.hidden=true;details.append(...content.childNodes);
   details.querySelectorAll('a[target="_blank"]').forEach(a=>a.rel='noopener');
   button.addEventListener('click',()=>{
    const open=details.hidden;details.hidden=!open;button.setAttribute('aria-expanded',String(open));button.innerHTML=open?'סגירת הפרטים <span aria-hidden="true">−</span>':'לפרטים ולהזמנה <span aria-hidden="true">←</span>';
    details.querySelectorAll('iframe').forEach(frame=>{if(open)prepareVideo(frame);else{videoObserver?.unobserve(frame);frame.removeAttribute('src');}});
   });el.append(details);
  }
  main.append(copy);el.prepend(main);return el;
 }
 const target=document.getElementById('catalog');if(target)DERECH_CATALOG.forEach(p=>target.append(card(p,false)));
 const featured=document.getElementById('featured-games');if(featured)DERECH_CATALOG.slice(0,2).forEach(p=>featured.append(card(p,true)));
 const home=document.getElementById('home-gallery');if(home)home.append(gallery(DERECH_HOME_IMAGES,'פעילות דרך הכלב','',2000));
 if(location.hash.startsWith('#game-')){const product=document.getElementById(location.hash.slice(1));if(product){product.querySelector('.detail-toggle')?.click();requestAnimationFrame(()=>product.scrollIntoView());}}
});
