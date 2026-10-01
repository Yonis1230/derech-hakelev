
document.addEventListener('DOMContentLoaded', () => {
 const base=document.body.dataset.base || '';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function gallery(images,name,tag='') {
  const el=document.createElement('div');el.className='gallery';el.setAttribute('aria-label','גלריית '+name);
  const img=document.createElement('img');img.src=base+images[0];img.alt=name+' — תמונה 1';img.loading='lazy';el.append(img);
  if(tag){const label=document.createElement('span');label.className='gallery-tag';label.textContent=tag;el.append(label);}
  if(images.length>1){
   let index=0;const count=document.createElement('span');count.className='gallery-count';
   const show=()=>{img.src=base+images[index];img.alt=name+' — תמונה '+(index+1);count.textContent=(index+1)+' / '+images.length;};
   ['prev','next'].forEach((dir,i)=>{const b=document.createElement('button');b.type='button';b.className=dir;b.textContent=i?'←':'→';b.setAttribute('aria-label',(i?'התמונה הבאה':'התמונה הקודמת')+' — '+name);b.addEventListener('click',()=>{index=(index+(i?1:-1)+images.length)%images.length;show();});el.append(b);});
   el.append(count);show();
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
 const home=document.getElementById('home-gallery');if(home)home.append(gallery(DERECH_HOME_IMAGES,'פעילות דרך הכלב'));
 if(location.hash.startsWith('#game-')){const product=document.getElementById(location.hash.slice(1));if(product){product.querySelector('.detail-toggle')?.click();requestAnimationFrame(()=>product.scrollIntoView());}}
});
