
document.addEventListener('DOMContentLoaded', () => {
 const base=document.body.dataset.base || '';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 function gallery(images,name,tag='',autoPlayMs=0) {
  const el=document.createElement('div');el.className='gallery';el.setAttribute('aria-label','גלריית '+name);
  let img=document.createElement('img');img.src=base+images[0];img.alt=name+' — תמונה 1';img.loading=autoPlayMs?'eager':'lazy';el.append(img);
  if(tag){const label=document.createElement('span');label.className='gallery-tag';label.textContent=tag;el.append(label);}
  if(images.length>1){
   let index=0,requestedIndex=0,requestId=0,pending=false,timer;
   const cache=new Map(),count=document.createElement('span');count.className='gallery-count';
   count.textContent='1 / '+images.length;
   function preload(i){
    if(!cache.has(i)){
     const ready=new Promise(resolve=>{
      const photo=new Image();
      photo.onload=async()=>{try{await photo.decode();}catch{}resolve(photo);};
      photo.onerror=()=>{cache.delete(i);resolve(null);};
      photo.src=base+images[i];
     });
     cache.set(i,ready);
    }return cache.get(i);
   }
   function preloadNeighbors(){preload((index+1)%images.length);preload((index-1+images.length)%images.length);}
   async function show(nextIndex){
    const token=++requestId;pending=true;el.setAttribute('aria-busy','true');
    const photo=await preload(nextIndex);
    if(token!==requestId)return;
    pending=false;el.setAttribute('aria-busy','false');
    if(!photo){requestedIndex=index;return;}
    photo.alt=name+' — תמונה '+(nextIndex+1);
    // Swap a loaded, decoded image and its counter together.
    img.replaceWith(photo);img=photo;index=nextIndex;requestedIndex=index;
    count.textContent=(index+1)+' / '+images.length;preloadNeighbors();
   }
   let playing=!!autoPlayMs&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function resetTimer(){
    clearInterval(timer);
    if(playing)timer=setInterval(()=>{
     if(!document.hidden&&!pending){requestedIndex=(index+1)%images.length;show(requestedIndex);}
    },autoPlayMs);
   }
   ['prev','next'].forEach((dir,i)=>{
    const b=document.createElement('button');b.type='button';b.className=dir;b.textContent=i?'←':'→';
    b.setAttribute('aria-label',(i?'התמונה הבאה':'התמונה הקודמת')+' — '+name);
    b.addEventListener('click',()=>{requestedIndex=(requestedIndex+(i?1:-1)+images.length)%images.length;show(requestedIndex);resetTimer();});
    el.append(b);
   });
   if(autoPlayMs){
    const pause=document.createElement('button');pause.type='button';pause.className='gallery-autoplay';
    function labelPause(){pause.textContent=playing?'השהיה Ⅱ':'הפעלה ▶';pause.setAttribute('aria-label',playing?'השהיית החלפת התמונות האוטומטית':'הפעלת החלפת התמונות האוטומטית');}
    pause.addEventListener('click',()=>{playing=!playing;labelPause();resetTimer();});
    labelPause();el.append(pause);resetTimer();
   }
   el.append(count);preloadNeighbors();
  }return el;
 }
 function card(p,featured){
  const el=document.createElement('article');el.className='game-card';el.id='game-'+p.id;
  const main=document.createElement('div');main.className='card-main';
  const content=document.createElement('div');content.innerHTML=p.details;
  const previewVideo=p.id==='workbook'?content.querySelector('iframe'):null;
  if(previewVideo){const media=document.createElement('div');media.className='card-video';media.append(previewVideo);main.append(media);}
  else if(p.images.length)main.append(gallery(p.images,p.name,p.tag));else{const art=document.createElement('div');art.className='digital-art';art.innerHTML='<span aria-hidden="true">▤</span><strong>'+escape(p.name)+'</strong><small>'+escape(p.tag)+'</small>';main.append(art);}
  const copy=document.createElement('div');copy.className='card-copy';
  copy.innerHTML='<h3>'+escape(p.name)+'</h3>'+(p.summary?'<p>'+escape(p.summary)+'</p>':'')+'<div class="card-bottom">'+(p.outOfStock?'<span class="stock">אזל מהמלאי · לקבלת עדכון</span>':'<span class="price">'+p.price+' ₪</span>')+'</div>';
  const bottom=copy.querySelector('.card-bottom');
  if(featured){const a=document.createElement('a');a.className='card-link';a.href=base+'pages/games/index.html#game-'+p.id;a.textContent='לפרטים ולהזמנה ←';bottom.append(a);}
  else{
   const button=document.createElement('button');button.type='button';button.className='detail-toggle';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','details-'+p.id);button.innerHTML='לפרטים ולהזמנה <span aria-hidden="true">←</span>';bottom.append(button);
   const details=document.createElement('div');details.className='game-details';details.id='details-'+p.id;details.hidden=true;details.append(...content.childNodes);
   details.querySelectorAll('a[target="_blank"]').forEach(a=>a.rel='noopener');
   button.addEventListener('click',()=>{const open=details.hidden;details.hidden=!open;button.setAttribute('aria-expanded',String(open));button.innerHTML=open?'סגירת הפרטים <span aria-hidden="true">−</span>':'לפרטים ולהזמנה <span aria-hidden="true">←</span>';if(!open)details.querySelectorAll('iframe').forEach(f=>{const src=f.src;f.src=src;});});
   el.append(details);
  }
  main.append(copy);el.prepend(main);return el;
 }
 const target=document.getElementById('catalog');if(target)DERECH_CATALOG.forEach(p=>target.append(card(p,false)));
 const featured=document.getElementById('featured-games');if(featured)DERECH_CATALOG.slice(0,2).forEach(p=>featured.append(card(p,true)));
 const home=document.getElementById('home-gallery');if(home)home.append(gallery(DERECH_HOME_IMAGES,'פעילות דרך הכלב','',2000));
 if(location.hash.startsWith('#game-')){const product=document.getElementById(location.hash.slice(1));if(product){product.querySelector('.detail-toggle')?.click();requestAnimationFrame(()=>product.scrollIntoView());}}
});
