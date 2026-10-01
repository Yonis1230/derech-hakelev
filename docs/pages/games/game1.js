
document.addEventListener('DOMContentLoaded',()=>{
 const board=document.getElementById('gameBoard'),status=document.getElementById('game-status');if(!board)return;
 let selected=[],locked=false,timer;
 function start(){clearTimeout(timer);selected=[];locked=false;board.replaceChildren();status.textContent='';
  const cards=Array.from({length:5},(_,i)=>[{id:i,src:'p'+(i+1)},{id:i,src:'s'+(i+1)}]).flat();
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  cards.forEach((data,i)=>{const b=document.createElement('button');b.className='card';b.type='button';b.textContent='?';b.setAttribute('aria-label','הפיכת קלף '+(i+1));b.addEventListener('click',()=>{
   if(locked||b.classList.contains('flipped')||b.classList.contains('matched'))return;
   b.classList.add('flipped');b.textContent='';b.style.backgroundImage="url('../../assets/images/games/1/"+data.src+".webp')";b.setAttribute('aria-label',(data.src[0]==='p'?'בעיה':'פתרון')+' '+(data.id+1));selected.push({b,data});
   if(selected.length===2){locked=true;timer=setTimeout(()=>{if(selected[0].data.id===selected[1].data.id){selected.forEach(({b})=>{b.classList.add('matched');b.disabled=true;});status.textContent='מצאתם זוג!';if(board.querySelectorAll('.matched').length===10)status.textContent='ניצחתם! מצאתם את כל הפתרונות.';}else{selected.forEach(({b})=>{b.classList.remove('flipped');b.style.backgroundImage='none';b.textContent='?';b.setAttribute('aria-label','הפיכת קלף');});}selected=[];locked=false;},1200);}
  });board.append(b);});
 }document.getElementById('restart-game').addEventListener('click',start);start();
});
