
document.addEventListener('DOMContentLoaded', () => {
 const gameImage = src => '../../' + (window.DERECH_MEDIA?.['assets/images/games/1/' + src + '.webp']?.src || 'assets/images/games/1/' + src + '.webp');
 const board = document.getElementById('gameBoard');
 const status = document.getElementById('game-status');
 if (!board || !status) return;

 // Descriptions of the existing illustrations, available only after a card is revealed.
 const descriptions = {
  p1: 'כלב שרצועתו הסתבכה סביב גופו וסביב עץ',
  s1: 'מספריים',
  p2: 'כלב עם משקפי שמש ומקל לבן עומד ליד בור פתוח בכביש',
  s2: 'מכסה עגול שסוגר פתח באדמה',
  p3: 'כלב בתוך באר עמוקה מביט כלפי מעלה',
  s3: 'סולם',
  p4: 'כלב מכוסה בשלג עומד בחוץ בזמן שיורד שלג',
  s4: 'כובע צמר וזוג כפפות',
  p5: 'כלב מכוסה בבוץ עומד בשלולית בוץ',
  s5: 'אמבטיה מלאה במים ובקצף'
 };
 let selected = [];
 let locked = false;
 let timer;
 let matchedPairs = 0;
 let completionMeasured = false;
 status.setAttribute('aria-atomic', 'true');

 function hiddenLabel(position) {
  return 'קלף ' + position + ', סגור. הפכו את הקלף';
 }

 function revealedLabel(data, position) {
  return 'קלף ' + position + ', ' + (data.src[0] === 'p' ? 'בעיה: ' : 'פתרון: ') + descriptions[data.src];
 }

 function start() {
  clearTimeout(timer);
  selected = [];
  locked = false;
  matchedPairs = 0;
  completionMeasured = false;
  board.replaceChildren();
  status.textContent = 'משחק חדש. הפכו שני קלפים ומצאו זוג של בעיה ופתרון.';
  const cards = Array.from({length: 5}, (_, i) => [{id: i, src: 'p' + (i + 1)}, {id: i, src: 's' + (i + 1)}]).flat();
  for (let i = cards.length - 1; i > 0; i--) {
   const j = Math.floor(Math.random() * (i + 1));
   [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach((data, i) => {
   const button = document.createElement('button');
   const position = i + 1;
   button.className = 'card';
   button.type = 'button';
   button.textContent = '?';
   button.setAttribute('aria-label', hiddenLabel(position));
   button.addEventListener('click', () => {
    if (locked || button.classList.contains('flipped') || button.classList.contains('matched')) return;
    button.classList.add('flipped');
    button.textContent = '';
    button.style.backgroundImage = "url('" + gameImage(data.src) + "')";
    button.setAttribute('aria-label', revealedLabel(data, position));
    selected.push({button, data, position});
    status.textContent = 'נפתח ' + revealedLabel(data, position) + (selected.length === 1 ? '. בחרו קלף נוסף.' : '. בודקים אם נמצא זוג.');
    if (selected.length !== 2) return;
    locked = true;
    timer = setTimeout(() => {
     if (selected[0].data.id === selected[1].data.id) {
      matchedPairs++;
      selected.forEach(({button, data, position}) => {
       button.classList.add('matched');
       // Keep the focused card in the keyboard order so its description remains readable.
       button.setAttribute('aria-disabled', 'true');
       button.setAttribute('aria-label', revealedLabel(data, position) + '. זוג שנמצא');
      });
      status.textContent = matchedPairs === 5
       ? 'ניצחתם! מצאתם את כל חמשת הזוגות של הבעיות והפתרונות.'
       : 'מצאתם זוג! ' + matchedPairs + ' מתוך 5 זוגות.';
      if (matchedPairs === 5 && !completionMeasured) {
       completionMeasured = true;
       try { window.DERECH_MEASUREMENT?.track('memory_game_complete', {game_id: 'solutions_memory', placement: 'sample_game'}); } catch {}
      }
     } else {
      selected.forEach(({button, position}) => {
       button.classList.remove('flipped');
       button.style.backgroundImage = 'none';
       button.textContent = '?';
       button.setAttribute('aria-label', hiddenLabel(position));
      });
      status.textContent = 'הקלפים אינם זוג. הם נסגרו, ואפשר לנסות שוב.';
     }
     selected = [];
     locked = false;
    }, 1200);
   });
   board.append(button);
  });
 }
 document.getElementById('restart-game').addEventListener('click', start);
 start();
});
