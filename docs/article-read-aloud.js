/* Browser speech, started by the reader. Voice services depend on the browser;
   site code does not send text through fetch, storage or measurement. */
(() => {
 'use strict';
 const widget = document.querySelector('[data-article-read-aloud]');
 if (!widget) return;
 const start = widget.querySelector('[data-read-start]');
 const pause = widget.querySelector('[data-read-pause]');
 const resume = widget.querySelector('[data-read-resume]');
 const stop = widget.querySelector('[data-read-stop]');
 const speed = widget.querySelector('[data-read-rate]');
 const voiceChoice = widget.querySelector('[data-read-voice]');
 const status = widget.querySelector('[data-read-status]');
 if (!start || !pause || !resume || !stop || !speed || !status) return;

 const unavailable = 'הקראה בעברית אינה זמינה בדפדפן הזה.';
 start.disabled = speed.disabled = true;
 pause.hidden = resume.hidden = stop.hidden = true;
 const synth = window.speechSynthesis;
 if (!synth || typeof window.SpeechSynthesisUtterance !== 'function'
  || ['getVoices', 'speak', 'cancel', 'pause', 'resume'].some(method => typeof synth[method] !== 'function')) {
  status.textContent = unavailable;
  return;
 }

 const heading = document.querySelector('.article-heading h1');
 const body = document.querySelector('.article-body');
 const textNodes = heading && body ? [heading, ...body.querySelectorAll('h2,h3,p,li')]
  .filter(node => !node.parentElement?.closest('li')) : [];
 // Keep each request short, including long sentences and paragraphs without punctuation.
 const chunks = [];
 for (const node of textNodes) {
  const text = (node.textContent || '').replace(/\s+/gu, ' ').trim();
  for (const sentence of text.match(/[^.!?…]+[.!?…]*|[.!?…]+/gu) || []) {
   let rest = sentence.trim();
   while (rest.length > 280) {
    let boundary = rest.lastIndexOf(' ', 280);
    if (boundary < 40) boundary = 280;
    // Do not split an emoji or another supplementary Unicode character.
    if (/[\uD800-\uDBFF]/u.test(rest[boundary - 1])) boundary--;
    chunks.push(rest.slice(0, boundary).trim());
    rest = rest.slice(boundary).trim();
   }
   if (rest) chunks.push(rest);
  }
 }

 let voice = null;
 let hebrewVoices = [];
 let state = 'idle';
 let position = 0;
 let generation = 0;
 let current = null; // Retain the utterance until its end/error callback.
 let rate = [0.8, 1, 1.2].includes(Number(speed.value)) ? Number(speed.value) : 1;

 function render(message) {
  const available = Boolean(voice && chunks.length);
  start.hidden = state !== 'idle';
  start.disabled = !available;
  pause.hidden = state !== 'playing';
  pause.disabled = state !== 'playing';
  resume.hidden = state !== 'paused';
  resume.disabled = state !== 'paused';
  stop.hidden = state === 'idle';
  stop.disabled = state === 'idle';
  speed.disabled = !available;
  if (voiceChoice) voiceChoice.disabled = !available || hebrewVoices.length < 2;
  widget.setAttribute('data-read-state', available ? state : 'unavailable');
  if (message !== undefined) status.textContent = message;
 }

 function finish(message, restoreFocus = true) {
  const focused = [pause, resume, stop].includes(document.activeElement);
  generation++;
  current = null;
  state = 'idle';
  position = 0;
  try { synth.cancel(); } catch { /* Controls remain usable if the browser loses speech. */ }
  render(message);
  if (restoreFocus && focused) (voice ? start : status).focus();
 }

 function failed() {
  finish('ההקראה נעצרה. אפשר לנסות שוב.');
 }

 function speakCurrent() {
  if (state !== 'playing' || !voice) return;
  if (position >= chunks.length) {
   finish('ההקראה הסתיימה.');
   return;
  }
  const token = generation;
  try {
   const utterance = new window.SpeechSynthesisUtterance(chunks[position]);
   utterance.lang = 'he-IL';
   utterance.voice = voice;
   utterance.rate = rate;
   current = utterance;
   utterance.onend = () => {
    if (token !== generation || current !== utterance) return;
    current = null;
    position++;
    if (state === 'playing') speakCurrent();
   };
   utterance.onerror = () => {
    if (token === generation && current === utterance) failed();
   };
   synth.speak(utterance);
  } catch { failed(); }
 }

 function refreshVoices() {
  let voices = [];
  try { voices = synth.getVoices(); } catch { /* A voice list may become available later. */ }
  const hebrew = Array.from(voices || []).filter(candidate => /^he(?:-|$)/iu.test(candidate.lang || ''));
  hebrew.sort((left, right) => Number(Boolean(right.localService)) - Number(Boolean(left.localService))
   || Number(/^he-IL$/iu.test(right.lang)) - Number(/^he-IL$/iu.test(left.lang)));
  const previous = voice?.voiceURI || voice?.name;
  hebrewVoices = hebrew;
  voice = hebrew.find(candidate => (candidate.voiceURI || candidate.name) === previous) || hebrew[0] || null;
  if (voiceChoice) {
   voiceChoice.replaceChildren(...hebrew.map((candidate, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = candidate.name + (candidate.localService ? ' — במכשיר' : ' — שירות מקוון');
    option.selected = candidate === voice;
    return option;
   }));
  }
  if (!voice || !chunks.length) {
   const message = chunks.length ? unavailable : 'לא נמצא טקסט להקראה.';
   if (state !== 'idle') finish(message);
   else render(message);
  } else if (state === 'idle') {
   render('אפשר להאזין למאמר בעברית.');
  }
 }

 voiceChoice?.addEventListener('change', () => {
  const selected = hebrewVoices[Number(voiceChoice.value)];
  if (!selected || selected === voice) return;
  voice = selected;
  if (state !== 'idle') {
   generation++;
   current = null;
   try {
    synth.cancel();
    if (state === 'playing') { synth.resume(); speakCurrent(); }
   } catch { failed(); }
  }
  render('קול ההקראה עודכן.');
 });

 start.addEventListener('click', () => {
  if (state !== 'idle' || !voice || !chunks.length) return;
  generation++;
  current = null;
  position = 0;
  state = 'playing';
  render('מקריאים את המאמר.');
  try {
   synth.cancel();
   synth.resume();
   speakCurrent();
  } catch { failed(); }
  if (state === 'playing') pause.focus();
 });
 pause.addEventListener('click', () => {
  if (state !== 'playing') return;
  state = 'paused';
  try {
   synth.pause();
   render('ההקראה מושהית.');
   resume.focus();
  } catch { failed(); }
 });
 resume.addEventListener('click', () => {
  if (state !== 'paused' || !voice) return;
  state = 'playing';
  try {
   synth.resume();
   render('ממשיכים בהקראה.');
   if (!current) speakCurrent();
   if (state === 'playing') pause.focus();
  } catch { failed(); }
 });
 stop.addEventListener('click', () => {
  if (state !== 'idle') finish('ההקראה נעצרה.');
 });
 speed.addEventListener('change', () => {
  const next = Number(speed.value);
  if (![0.8, 1, 1.2].includes(next)) {
   speed.value = String(rate);
   return;
  }
  if (next === rate) return;
  rate = next;
  if (state === 'idle') return;
  generation++;
  current = null;
  try {
   synth.cancel();
   if (state === 'playing') {
    synth.resume();
    speakCurrent();
   }
   if (state !== 'idle') render(state === 'paused' ? 'ההקראה מושהית.' : 'מהירות ההקראה עודכנה.');
  } catch { failed(); }
 });

 if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refreshVoices);
 window.addEventListener('pagehide', () => finish('ההקראה נעצרה.', false));
 refreshVoices();
})();
