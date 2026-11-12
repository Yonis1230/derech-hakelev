'use strict';

// Shared source for every community invitation. Rebuild articles, then run
// node tools/sync-whatsapp-community.cjs after changing this file.
const url = 'https://chat.whatsapp.com/Cf17sNiT5aREVQLddv6Xx2';
const copy = {
 article: {
  title: 'רוצים עוד רעיונות וכלים לעבודה הטיפולית?',
  text: 'הצטרפו לקבוצת הוואטסאפ של דרך הכלב, שבה אני משתף מאמרים, רעיונות לפעילויות, כלים מקצועיים והטבות מיוחדות לחברי הקבוצה.',
  note: 'הקבוצה שקטה ברוב הזמן, וההצטרפות חופשית.',
  button: 'הצטרפות לקבוצת הוואטסאפ'
 },
 articles_index: {
  title: 'רוצים להישאר מעודכנים?',
  text: 'פתחתי קבוצת וואטסאפ מקצועית לכלבנים טיפוליים, מטפלים ואנשי חינוך. בקבוצה אני משתף מאמרים חדשים, רעיונות לפעילויות, כלים מהשטח והטבות מיוחדות.',
  button: 'הצטרפות לקבוצה'
 },
 home: {
  text: 'עוד רעיונות וכלים לעבודה הטיפולית בקבוצת דרך הכלב | ידע וכלים לטיפול.',
  button: 'הצטרפות לקבוצת הוואטסאפ המקצועית'
 }
};
function link(location, label, className = '') {
 return '<a class="community-link ' + className + '" data-community-location="' + location + '" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '<span class="sr-only"> (נפתח בחלון חדש)</span></a>';
}
function invitation(location) {
 const item = copy[location];
 if (!item) throw new Error('Unknown community invitation location');
 return '<!-- community:' + location + ':start --><' + (item.title ? 'section' : 'div') + ' class="community-invite community-invite--' + location + '"' + (item.title ? ' aria-labelledby="community-title"' : '') + '>' +
  (item.title ? '<h2 id="community-title">' + item.title + '</h2>' : '') + '<p>' + item.text + '</p>' +
  (item.note ? '<p class="community-note">' + item.note + '</p>' : '') + link(location, item.button, location === 'home' ? 'text-link' : 'button') +
  '</' + (item.title ? 'section' : 'div') + '><!-- community:' + location + ':end -->';
}
function footer() {
 return '<!-- community:footer:start -->' + link('footer', 'קבוצת הוואטסאפ המקצועית') + '<!-- community:footer:end -->';
}
module.exports = {url, invitation, footer};
