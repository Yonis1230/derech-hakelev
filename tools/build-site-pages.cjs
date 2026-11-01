// Support pages are generated from approved facts below and the existing shared shell.
// Run after editing the home header/footer. Never edits product content.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),docs=path.join(root,'docs');
const home=fs.readFileSync(path.join(docs,'index.html'),'utf8');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(docs,'catalog.js'),'utf8'),context);
const catalog=context.window.DERECH_CATALOG;
const policyLink='<button type="button" class="button" data-open-privacy>העדפות פרטיות ומדידה</button>';
const pages=[
{id:'privacy',title:'פרטיות ומדידה',description:'מידע על השימוש באתר דרך הכלב, מדידה בהסכמה, סרטונים חיצוניים ואפשרויות פנייה.',content:`
<p>האתר של דרך הכלב, בניהול יוני סויסה, מציג טיפול רגשי בעזרת כלבים ומשחקים וכלים לשיח רגשי. לפניות בנושא פרטיות: <a href="mailto:yonis1230@gmail.com">yonis1230@gmail.com</a> או <a href="tel:0524013354">052-4013354</a>.</p>
<h2>בחירת מדידה</h2><p>כלי המדידה באתר נטענים רק אחרי לחיצה על „אישור” בהודעה שבתחתית האתר. ללא אישור, ההודעה נשארת ואין טעינה של כלי המדידה. אפשר להמשיך לצפות בתוכן, להתנסות במשחקים וליצור קשר.</p>
<p>Clarity משמש להבנת השימוש באתר ולשיפורו, לרבות הקלטת אינטראקציות, לחיצות, גלילה ונתוני שימוש טכניים. הוא עשוי להשתמש בעוגיות ולתעד כתובות עמודים, מקורות הגעה וקישורים שנלחצו. הפרטים מפורטים ב־<a href="https://privacy.microsoft.com/privacystatement">מדיניות הפרטיות של Microsoft</a>.</p>
<p>בקטלוג ובדפי המוצרים נעשה שימוש גם ב־Google Analytics באמצעות Google Tag Manager, לאחר אישור, לצורך מדידת ביקורים ופעולות כגון לחיצה על קישור הזמנה, פתיחת פרטי משחק ושימוש בשאלון. אירועי המדידה המותאמים אינם כוללים את טקסט ההודעה בוואטסאפ או את תשובות השאלון. דף הבית והעמודים הטיפוליים אינם נכללים במדידת Google זו. פרטים על נתוני החיבור והשימוש בשירות מופיעים ב־<a href="https://policies.google.com/privacy?hl=he">מדיניות הפרטיות של Google</a>.</p>
<p>הבחירה נשמרת בדפדפן באחסון המקומי בשם <bdi dir="ltr">derech-analytics-consent-v1</bdi>. אפשר לבטל את ההסכמה בתחתית האתר. הביטול מפסיק את המדידה בהמשך הגלישה ומנסה להסיר את עוגיות המדידה שבשליטת האתר; הוא אינו מוחק מידע שכבר נשלח לספק.</p>${policyLink}
<h2>סרטונים ותוכן חיצוני</h2><p>סרטוני Facebook ו־YouTube מוצגים רק לאחר אישור המדידה או לאחר בחירה מפורשת להפעיל סרטון מסוים. הפעלת סרטון יוצרת חיבור לספק החיצוני, שעשוי לקבל נתוני חיבור ושימוש ולהשתמש בעוגיות לפי המדיניות שלו. אפשר לקרוא את <a href="https://www.facebook.com/privacy/policy/">מדיניות Meta</a> ואת <a href="https://policies.google.com/privacy?hl=he">מדיניות Google</a>. הפונטים והתמונות באתר מוגשים מקומית.</p>
<h2>שאלון בחירת המשחקים</h2><p>השאלון משתמש בבחירות כדי להציע משחקים בדפדפן. הוא אינו מבקש שם, טלפון, אבחנה או פרטים על ילד. אזור השאלון מסומן למיסוך ב־Clarity. אין להזין באתר או בפרמטרים של קישורים מידע אישי או טיפולי.</p>
<h2>יצירת קשר והזמנה</h2><p>הפנייה מתבצעת בוואטסאפ, בטלפון או בדוא״ל. קישורי הזמנת משחק עשויים להכין הודעה עם שם המוצר; ההודעה נשלחת רק אם בוחרים לשלוח אותה בשירות הרלוונטי. התוכן שמוסרים בשיחה מטופל בנפרד מהמדידה באתר. לבירור אופן השמירה, בקשת עיון, תיקון או מחיקה של מידע שנמסר, אפשר לפנות ליוני בפרטי הקשר שלמעלה.</p>
<h2>אירוח וקישורים</h2><p>האתר מאוחסן ב־GitHub Pages. עצם טעינת האתר מעבירה לשרתי האירוח נתוני חיבור הדרושים להצגת העמוד. בחירה לפתוח WhatsApp, Canva, רשת חברתית או אתר אחר מעבירה לשירות חיצוני, הכפוף לתנאי השימוש והפרטיות שלו. אין באתר טופס הרשמה לרשימת תפוצה או סליקה.</p>
<p class="information-date">עדכון טכני של העמוד: 31.10.2026.</p>`},
{id:'accessibility',title:'נגישות באתר',description:'כלי עזר לגלישה, שימוש במקלדת ודרכי יצירת קשר לקבלת סיוע בנגישות באתר דרך הכלב.',content:`
<p>חשוב לי שתוכלו לגלוש באתר בנוחות, להכיר את המפגשים ולמצוא את המשחקים והמידע שאתם צריכים.</p>
<h2>כלי עזר לגלישה</h2><p>כפתור הנגישות הצף בצד המסך פותח אפשרויות להגדלת הטקסט, לניגודיות גבוהה ולהדגשת קישורים. אפשר לבחור את ההתאמות שמתאימות לכם ולבטל אותן בכל שלב באמצעות „איפוס התצוגה”. הבחירה נשמרת בדפדפן שלכם.</p>
<h2>שימוש במקלדת ובהגדלת התצוגה</h2><ul><li>אפשר לעבור בין קישורים וכפתורים בעזרת <bdi dir="ltr">Tab</bdi>, ולחזור אחורה בעזרת <bdi dir="ltr">Shift + Tab</bdi>.</li><li>להפעלת קישור לחצו <bdi dir="ltr">Enter</bdi>. להפעלת כפתור אפשר להשתמש גם במקש הרווח.</li><li>הקישור „דלגו לתוכן” בתחילת העמוד מאפשר להגיע ישירות לתוכן הראשי.</li><li>לסגירת חלון פתוח אפשר להשתמש בכפתור הסגירה או במקש <bdi dir="ltr">Escape</bdi>.</li><li>באזורים שבהם התמונות או ההמלצות מתחלפות אוטומטית, אפשר לעצור אותן בכפתור „השהיה”.</li><li>להגדלה נוספת אפשר להשתמש בכלי ההגדלה של הדפדפן. במחשב: <bdi dir="ltr">Ctrl + +</bdi>, וב־Mac: <bdi dir="ltr">Command + +</bdi>.</li></ul>
<h2>מידע מתוך תמונות וסרטונים</h2><p>לצד צילומי ההמלצות מופיעים קטעים נבחרים בטקסט. אם תרצו לקבל את שאר המידע שבצילום, או אם קשה להשתמש בסרטון או בפעילות באתר חיצוני, מוזמנים לפנות אליי ואעזור לקבל את המידע.</p>
<h2>נתקלתם בקושי בגלישה?</h2><p>אפשר לפנות ליוני סויסה בטלפון <a href="tel:0524013354">052-4013354</a> או בדוא״ל <a href="mailto:yonis1230@gmail.com">yonis1230@gmail.com</a>. יעזור לצרף קישור לעמוד ותיאור קצר של הקושי. אם אפשר, ציינו גם באיזה מכשיר ודפדפן השתמשתם.</p>
<p>לשאלות על נגישות במפגש עצמו, מוזמנים ליצור קשר לפני ההגעה.</p>
<p class="information-date">עודכן: 31.10.2026.</p>`},
{id:'faq',title:'שאלות נפוצות',description:'איך מזמינים משחקים, משלוח ואיסוף בבאר שבע, קבצים דיגיטליים, גילאים ועזרה בבחירה.',content:`
<p>כמה תשובות קצרות על המשחקים ועל המפגשים. לשאלה נוספת אפשר <a href="https://wa.me/972524013354">לפנות ליוני בוואטסאפ</a>.</p>
<details><summary>איך מזמינים משחק?</summary><p>בקטלוג פותחים „לפרטים ולהזמנה”, קוראים את התכולה ובוחרים בקישור ההזמנה בוואטסאפ. אפשר גם לפתוח את עמוד המוצר המלא. התיאום וההזמנה מתבצעים בשיחה עם יוני.</p></details>
<details><summary>כמה עולה משלוח, והאם אפשר לאסוף?</summary><p>משלוח עד הבית בעלות של 35 ₪ בלבד. אפשר גם לאסוף ללא עלות מבאר שבע, בתיאום עם יוני.</p></details>
<details><summary>מה מקבלים בקבצים הדיגיטליים?</summary><p>„ארגז הכלים לשיח רגשי” הוא חוברת דיגיטלית בת 60 דפים. תיבת הבריחה כוללת קבצים מוכנים להדפסה; להפעלה נדרשים תיבה או קופסה ומנעול עם קוד ספרתי. את התכולה המלאה אפשר לקרוא בעמוד של כל מוצר.</p></details>
<details><summary>איך יודעים איזה משחק מתאים?</summary><p>בקטלוג מופיעים תיאורים, גילאים ותמונות. אפשר להיעזר ב„בואו נמצא יחד” ולסמן כמה תשובות, או לפנות ליוני לעזרה בבחירה. לכל משחק אופן שימוש אחר, ולכן כדאי לקרוא גם את הפרטים המלאים.</p></details>
<details><summary>איפה מתקיימים המפגשים ולמי הם מיועדים?</summary><p>יוני סויסה מציע מפגשים פרטניים וקבוצתיים לילדים, לבני נוער ולמבוגרים, בבאר שבע והסביבה, וכן הדרכת הורים ומפגשי הורה־ילד. פרטים ותיאום נעשים בפנייה אישית.</p></details>
<details><summary>אפשר לקבל טיפול דרך מסלול הטבות או חוסן?</summary><p>יוני הוא ספק גם דרך תכנית עמית, אגף השיקום במשרד הביטחון ו־MOVE. לתושבי נתיבות, מרחבים ובני שמעון אפשר לבדוק אפשרות דרך מרכז חוסן אמ״ן. הזכאות ואופן המימוש תלויים במסלול ובאישור המתאים; פנייה אינה הבטחה לזכאות. <a href="../../index.html#therapy-benefits">לפרטים על המסלולים</a>.</p></details>
<p style="margin-top:28px"><a class="button" href="../games/">לכל המשחקים והכלים</a></p>`}
];
function shell(fragment){return fragment.replace(/(href|src)="(?!https?:|mailto:|tel:|#)([^"]+)"/g,(_,a,url)=>`${a}="../../${url}"`);}
function contactMarkers(fragment){return fragment.replace(/<a\b[^>]*href="(https:\/\/wa\.me\/[^\"]+|tel:[^\"]+|mailto:[^\"]+)"[^>]*>/g,(tag,url)=>{
 const channel=url.startsWith('tel:')?'phone':url.startsWith('mailto:')?'email':'whatsapp';
 return tag.includes('data-measure-id=')?tag:tag.replace('<a','<a data-measure-id="content_'+channel+'" data-measure-placement="contact"');
});}
const header=shell(home.match(/<header\b[\s\S]*?<\/header>/)[0]);
const footer=shell(home.match(/<footer\b[\s\S]*?<\/footer>/)[0]);
for(const p of pages){
 const url=`https://derech-hakelev.com/pages/${p.id}/`;
 const html=`<!doctype html>\n<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(p.title)} | דרך הכלב</title><meta name="description" content="${escape(p.description)}"><link rel="canonical" href="${url}">
<meta property="og:title" content="${escape(p.title)} | דרך הכלב"><meta property="og:description" content="${escape(p.description)}"><meta property="og:url" content="${url}"><meta property="og:type" content="website"><meta property="og:locale" content="he_IL"><meta property="og:image" content="https://derech-hakelev.com/assets/optimized/brand/logo-128.webp">
<link rel="icon" href="../../assets/optimized/favicon-32.png"><link rel="stylesheet" href="../../styles.css?v=20261101-whatsapp-desktop">
<script src="../../scripts.js?v=20261031-measurement" defer></script><script src="../../accessibility.js?v=20261031-accessibility-menu" defer></script><script src="../../analytics.js?v=20261031-measurement" defer></script><script src="../../measurement.js?v=20261031-ga4" defer></script></head>
<body data-base="../../"><a class="skip-link" href="#main">דלגו לתוכן</a>${header}
<main id="main" class="information-page"><h1>${escape(p.title)}</h1>${contactMarkers(p.content)}</main>${footer}</body></html>\n`;
 const dir=path.join(docs,'pages',p.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
// Only real public canonical pages. No previews, reports, or external destinations.
const routes=['','pages/games/',...pages.map(p=>`pages/${p.id}/`),...catalog.map(p=>`pages/games/products/${p.id}/`)];
fs.writeFileSync(path.join(docs,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+routes.map(r=>`  <url><loc>https://derech-hakelev.com/${r}</loc></url>`).join('\n')+'\n</urlset>\n');
// No new wildcard or AI-training bot permissions.
fs.writeFileSync(path.join(docs,'robots.txt'),'User-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nSitemap: https://derech-hakelev.com/sitemap.xml\n');
console.log('Generated 3 support pages and sitemap for '+routes.length+' public pages.');
