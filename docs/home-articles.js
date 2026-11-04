'use strict';
document.querySelectorAll('[data-home-articles]').forEach(section => {
 const cards = [...section.querySelectorAll('.home-article-card')];
 if (cards.length < 2) return;
 const controls = section.querySelector('.home-articles-controls');
 const count = section.querySelector('[data-article-count]');
 const play = section.querySelector('[data-article-play]');
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 let current = 0, paused = motion.matches, hovering = false, focused = false, visible = true, timer;
 function schedule() {
  clearTimeout(timer);
  if (!paused && !hovering && !focused && visible && !document.hidden) timer = setTimeout(() => { show(current + 1); schedule(); }, 7000);
 }
 function show(index) {
  cards[current].hidden = true;
  current = (index + cards.length) % cards.length;
  cards[current].hidden = false;
  count.textContent = (current + 1) + ' / ' + cards.length;
 }
 function label() { play.textContent = paused ? 'הפעלה' : 'השהיה'; }
 controls.hidden = false;
 section.querySelector('[data-article-prev]').addEventListener('click', () => { paused = true; show(current - 1); label(); schedule(); });
 section.querySelector('[data-article-next]').addEventListener('click', () => { paused = true; show(current + 1); label(); schedule(); });
 play.addEventListener('click', () => { paused = !paused; label(); schedule(); });
 section.addEventListener('mouseenter', () => { hovering = true; schedule(); });
 section.addEventListener('mouseleave', () => { hovering = false; schedule(); });
 section.addEventListener('focusin', () => { focused = true; schedule(); });
 section.addEventListener('focusout', event => { focused = section.contains(event.relatedTarget); schedule(); });
 document.addEventListener('visibilitychange', schedule);
 motion.addEventListener('change', () => { if (motion.matches) paused = true; label(); schedule(); });
 if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(section);
 label(); schedule();
});
