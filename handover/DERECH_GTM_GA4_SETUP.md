# דרך הכלב — חיבור Google Tag Manager ו־Google Analytics 4

עודכן: 1.11.2026. זהו מדריך להגדרה בחשבון. **שני תגי GTM, הטריגר ומשתני המדידה נבדקו בייצוא אמיתי ותואמים לקוד. לפי סיכום תוסף הדפדפן שבעל האתר העביר, נשמרו גם הגדרות GA4 והממדים הנדרשים. קליטת אירועים בפועל עדיין לא אומתה.** אין צורך ליצור מחדש רכיבים שכבר הוגדרו; ההוראות להלן נשארות לתיעוד ולתחזוקה.

מזהים שסופקו על ידי בעל האתר:

- קונטיינר GTM: **`GTM-5PGV5KCD`**.
- מזהה מדידה GA4: **`G-603TM871H0`**.
- האתר: `https://derech-hakelev.com/`.

המזהים ציבוריים; הם אינם סיסמאות. אין צורך למסור כאן סיסמה, קוד כניסה או אסימון גישה.

## הצעד הראשון בחשבון

בתוך הקונטיינר **GTM-5PGV5KCD**: פותחים **Tags → New**, נותנים את השם **DERECH - Google tag**, בוחרים **Google Tag**, ובשדה **Tag ID** מזינים **G-603TM871H0**. ממשיכים עם המשתנים וההגדרות למטה לפני Preview או Publish.

אם כבר קיים תג Google או GA4 עבור אותו מזהה, בודקים אותו ומשלימים את ההגדרות במקום ליצור עותק נוסף. שומרים תחילה Export של המצב הקיים. המדריך אינו דורש מחיקת תגים קיימים, החלפת קונטיינר או שינוי Clarity.

## 1. הגדרות ב־Google Analytics לפני חיבור האתר

ב־GA4 בוחרים את הנכס ואת זרם ה־Web שמציג **G-603TM871H0**. פותחים **Admin → Data streams → זרם האתר**:

1. מכבים **Enhanced measurement**. בהגדרות המפורטות מוודאים שגם **Page changes based on browser history events** כבוי. אין להפעיל מדידה אוטומטית של קישורים יוצאים, חיפוש, טפסים, הורדות או סרטונים.
2. בהגדרות Google tag בודקים שאין הפעלה נוספת של זיהוי האירועים האוטומטיים האלה. שמות התפריטים עשויים להשתנות; יש לבדוק בפועל את זרם הנתונים ואת הגדרות התג.
3. ב־**Admin → Data collection** משאירים **Google signals** ו־**User-provided data collection** כבויים.
4. אין ליצור חיבור Google Ads חדש לצורך ההטמעה הזאת, להפעיל פרסום מותאם אישית, להגדיר User-ID או להזין שמות, טלפונים, אימיילים או פרטי טיפול. לפי הדיווח שהתקבל נמצא קישור Ads קיים מיוני 2024 עם התאמה אישית כבויה; הוא נשאר כפי שהיה. שלושת סוגי הסכמת הפרסום בקוד נשארים denied.

האתר שולח צפיות ולחיצות במפורש. מדידת קישורים יוצאים אוטומטית עלולה להעביר את כתובת WhatsApp המלאה עם תוכן ההודעה; לכן היא נשארת כבויה. [הסבר Google על Enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en)

## 2. משתני Data Layer ב־GTM

ב־**Variables → User-Defined Variables → New** יוצרים לכל שורה משתנה מסוג **Data Layer Variable**, עם **Data Layer Version = Version 2**. אין להחליף את השדות במשתנים המובנים Page URL, Page Title, Referrer, Click URL או Click Text.

| שם המשתנה ב־GTM | Data Layer Variable Name |
|---|---|
| DERECH - Context location | `derech_page_context.page_location` |
| DERECH - Context referrer | `derech_page_context.page_referrer` |
| DERECH - Context title | `derech_page_context.page_title` |
| DERECH - Event name | `derech_event_name` |
| DERECH - Event location | `derech_event_params.page_location` |
| DERECH - Event referrer | `derech_event_params.page_referrer` |
| DERECH - Event title | `derech_event_params.page_title` |
| DERECH - Placement | `derech_event_params.placement` |
| DERECH - Channel | `derech_event_params.channel` |
| DERECH - Button ID | `derech_event_params.button_id` |
| DERECH - Product ID | `derech_event_params.product_id` |
| DERECH - Game ID | `derech_event_params.game_id` |

שלושת משתני Context קיימים לפני `gtm.js` ומתאימים לאתחול Google Tag. משתני Event זמינים באירוע `derech_event`; אין להשתמש בהם במקום Context באתחול. הערכים הם כתובת קנונית ללא שאילתה או מקטע, referrer ריק וכותרת קבועה. הקוד אינו מעביר UTM או מקור הפניה גולמי; חיבור זה אינו מבטיח דוחות ייחוס מלאים.

## 3. Google Tag והגדרות משותפות

בתג **DERECH - Google tag** מגדירים **Tag ID = G-603TM871H0**. תחת **Configuration settings** מוסיפים:

| Configuration parameter | ערך |
|---|---|
| `send_page_view` | Boolean `false` |
| `allow_google_signals` | Boolean `false` |
| `allow_ad_personalization_signals` | Boolean `false` |
| `allow_interest_groups` | Boolean `false` |
| `page_location` | `{{DERECH - Context location}}` |
| `page_referrer` | `{{DERECH - Context referrer}}` |
| `page_title` | `{{DERECH - Context title}}` |

ארבעת ערכי `false` צריכים להיות **ערכים בוליאניים**, ולא המחרוזת `"false"`. אם ממשק התג מציע בחירת Boolean, בוחרים בה. אם השדה אינו מאפשר זאת, אפשר ליצור משתנה **Custom JavaScript** בשם **DERECH - Boolean false**, שתוכנו בלבד הוא `function () { return false; }`, ולהפנות אליו בארבע השורות. זהו משתנה ערך בלבד; אין להוסיף תג Custom HTML או קוד טעינת Google נוסף.

יוצרים משתנה מסוג **Google Tag: Event Settings**, בשם **DERECH - Safe shared event settings**, עם שלושה פרמטרים:

| Event parameter | ערך |
|---|---|
| `page_location` | `{{DERECH - Context location}}` |
| `page_referrer` | `{{DERECH - Context referrer}}` |
| `page_title` | `{{DERECH - Context title}}` |

ב־Google Tag בוחרים את המשתנה תחת **Shared event settings**. כך גם אירועים שהתג אוסף אוטומטית מקבלים את הקשר העמוד המסונן. אין להוסיף User Properties.

ב־**Triggering** של Google Tag בוחרים **Initialization - All Pages**. זהו אתחול בלבד: `send_page_view=false` מונע את צפיית ברירת המחדל. ההגבלה לקטלוג ולמוצרים והאישור מתבצעת בקוד עוד לפני טעינת GTM; אין Google בדף הבית ובדפי הטיפול או המידע. צפיות ואינטראקציות עצמן יישלחו רק דרך הטריגר בסעיף הבא. [התקנת Google Tag ב־GTM](https://support.google.com/tagmanager/answer/9442095?hl=en), [הגדרות אירועים משותפות](https://support.google.com/tagmanager/answer/13438771?hl=en)

ב־**Advanced Settings → Consent Settings**, אם הממשק מאפשר, מגדירים בנוסף לאישורים המובנים **Require additional consent for tag to fire → analytics_storage**. אין לדרוש אישורי פרסום לצורך המדידה ואין להעניק אותם. הקוד טוען GTM רק לאחר אישור המדידה; `ad_storage`, `ad_user_data`, `ad_personalization` נשארים denied. [Basic Consent Mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic)

## 4. טריגר לאירועים המפורשים של האתר

יוצרים **Triggers → New → Custom Event**, בשם **DERECH - Approved website event**:

- **Event name:** `derech_event` — התאמה מדויקת, בלי התאמת Regex לשדה זה.
- בוחרים **Some Custom Events**.
- תנאי: `{{DERECH - Event name}}` **matches RegEx**:

```text
^(page_view|contact_click|product_details_open|finder_start|finder_complete|canva_game_open|memory_game_complete)$
```

אין להוסיף טריגרים של All Links, Click, History Change, Form Submission או צפייה נוספת בעמוד.

## 5. תג GA4 Event אחד

יוצרים תג בשם **DERECH - Website events**, מסוג **Google Analytics: GA4 Event**:

- **Measurement ID:** `G-603TM871H0`.
- **Event Name:** `{{DERECH - Event name}}` — אין להשתמש במשתנה המובנה Event, שערכו יהיה `derech_event` במקום שם הפעולה.
- **Event Parameters:** הטבלה הבאה בלבד.

| Event parameter | ערך |
|---|---|
| `page_location` | `{{DERECH - Event location}}` |
| `page_referrer` | `{{DERECH - Event referrer}}` |
| `page_title` | `{{DERECH - Event title}}` |
| `placement` | `{{DERECH - Placement}}` |
| `channel` | `{{DERECH - Channel}}` |
| `button_id` | `{{DERECH - Button ID}}` |
| `product_id` | `{{DERECH - Product ID}}` |
| `game_id` | `{{DERECH - Game ID}}` |

לכל אירוע יש רק את הפרמטרים הרלוונטיים; ערכים שאינם קיימים צריכים להישאר לא מוגדרים, בלי ערך ברירת מחדל ובלי ערך מהאירוע הקודם. האתר מאפס את אובייקט הפרמטרים לפני כל אירוע כדי למנוע שאריות במודל Data Layer Version 2.

**Triggering:** בוחרים רק **DERECH - Approved website event**. משאירים **Tag firing options = Once per event**; אין לבחור Once per page, כי לחיצות נוספות הן פעולות אמיתיות שצריך לספור. מוסיפים דרישת `analytics_storage` כמו בתג Google.

אין להפעיל Ecommerce data, User-ID, User Properties או User-provided data. אין ליצור תג נוסף ל־Clarity; הוא כבר נטען דרך מערכת האישור של האתר. [הגדרת תגי GA4 Event](https://support.google.com/tagmanager/answer/13034206?hl=en)

## 6. הצגת הנתונים בדוחות

ב־GA4 אפשר ליצור **Custom definitions → Custom dimensions**, בהיקף **Event**, עבור `channel`, `button_id`, `placement`, `product_id`, `game_id`. שמות מובנים כגון `page_location` ו־`page_title` אינם דורשים הגדרה מותאמת נוספת.

אפשר לסמן `contact_click` כ־Key event אם זו מטרת המדידה של העסק. הוא מציין לחיצה על אמצעי קשר; הוא אינו מאשר שנשלחה הודעה, שהתקבל ליד או שהתבצעה מכירה. אין להגדיר `purchase`, הכנסות או שווי רכישה בלי מידע על עסקה שהושלמה.

## 7. בדיקה לפני פרסום ולאחריו

שומרים את הגדרות GTM כטיוטה בחשבון. לפני Publish בודקים שאין תג Google/GA4 נוסף לאותו מזהה, שלא נוסף תג פרסום במסגרת ההטמעה וש־Enhanced Measurement ו־Google Signals כבויים. הקישור הקיים ל־Ads תועד ונשמר; אין למחוק אותו כחלק מהשלמת המדריך. פרסום קונטיינר GTM ופרסום קוד האתר הם פעולות נפרדות; יש לבצע אותן רק לאחר בדיקת ההגדרה ואישור בעל האתר.

בדיקת קוד מקומית בלבד אינה יכולה להוכיח קליטה בחשבון: `measurement.js` אינו טוען Google ב־localhost או בדומיין תצוגה מקדימה. גם הקוד המקומי המעודכן אינו משנה את האתר הפעיל עד פרסומו.

לאחר שאושרה ונוצרה אפשרות לבדוק את ההטמעה בדומיין האמיתי, משתמשים ב־**GTM Preview / Tag Assistant**, בבקשות הרשת וב־GA4 **Realtime / DebugView**:

1. ללא אישור: אין טעינת `gtm.js` ואין בקשות GA4; לחיצות שנעשו קודם אינן משוחזרות לאחר אישור.
2. לאחר אישור בקטלוג או במוצר: מזהה הקונטיינר הוא **GTM-5PGV5KCD**, יעד המדידה הוא **G-603TM871H0**, ונספרת צפייה אחת בלבד בעמוד.
3. בכל בקשת מדידה בודקים שכתובת העמוד קנונית ונקייה, שהכותרת קבועה ושאין שאילתות, fragments, referrer גולמי, הודעות WhatsApp, מידע מהשאלון או פרטים מזהים. בודקים גם אירועים אוטומטיים כגון `session_start`, `first_visit` או `user_engagement`, אם נשלחו.
4. בודקים לחיצת WhatsApp, טלפון ומייל, פתיחת פרטי מוצר, התחלה וסיום השאלון, פתיחת משחק Canva וסיום אמיתי של משחק הזיכרון. כל פעולה נספרת פעם אחת; לחיצה נוספת נפרדת יכולה להיספר שוב. תשובות השאלון אינן נשלחות.
5. Google לא נטען בדף הבית, בעמודי טיפול או בעמודי מידע; כפתורים טיפוליים מוחרגים גם אם הועתקו לעמוד מוצר. המדידה הקיימת ב־Clarity תלויה באישור הקיים ואינה מוכפלת דרך GTM.
6. ביטול הסכמה דרך תחתית האתר מפעיל מיד את `ga-disable-G-603TM871H0`, מעדכן consent ל־denied, מפסיק שליחות מקוד האתר, מוחק עוגיות GA שבשליטתו ומרענן את העמוד ללא כלי המדידה. בודקים בפועל שלא יוצא אירוע אוטומטי בזמן יציאה או רענון לאחר הביטול. הסרת רכיב script בלבד אינה פורקת קוד ספק שכבר רץ; אין להסיר את הרענון שבמנגנון הביטול. הפעולה אינה מבטיחה מחיקת מידע שכבר נקלט אצל הספק. [מנגנון הביטול הרשמי של Google](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics)

אין לפרסם על סמך הודעת "Tag found" בלבד. אם מופיעים ערכים גולמיים או אירועים כפולים, מתקנים ובודקים שוב לפני הפעלה לציבור. [שליטה בצפיות ומניעת כפילויות](https://developers.google.com/analytics/devguides/collection/ga4/views), [הנחיות Google למניעת PII](https://support.google.com/analytics/answer/6366371)

## קובץ הייצוא שהתקבל ונבדק

ב־1.11.2026 התקבל מבעל האתר `C:\Users\USER\Downloads\GTM-5PGV5KCD-draft.json`. עותק זהה נשמר ב־`artifacts/analytics/GTM-5PGV5KCD-draft-20261101.json`, מחוץ לאתר הציבורי, עם תיעוד מקור ו־SHA-256 בקובץ provenance לצדו.

נבדקו שני תגים מובנים, טריגר מותאם אחד ו־15 משתנים, ובהם כל 12 משתני שכבת הנתונים. המזהים, ערכי false הבוליאניים, ההסכמה, שדות העמוד וטריגר האירועים תואמים ל־`docs/measurement.js`. המשתנה הריק `Google Tag Configuration Settings` אינו משנה את ההגדרות, ואין צורך למחוק אותו לצורך החיבור. לא נמצא צורך בקובץ ייבוא מתוקן.

הייצוא אינו כולל את הגדרות Enhanced Measurement, Google Signals, איסוף מידע שסופק בידי משתמשים, הגדרות יעדי Google או הממדים המותאמים בחשבון GA4. בהמשך התקבל דיווח התוסף שהגדרות המדידה כובו ושחמשת הממדים נוצרו. הסיכום נשמר ב־`artifacts/analytics/GA4-settings-report-20261101.md`; זהו דיווח שהועבר על ידי הבעלים, ולא בדיקת חשבון עצמאית שלנו. נותרו פרסום מאושר ובדיקת הרשת והאירועים. `containerVersionId=0` מתאר את הטיוטה שבקובץ ואינו קובע מה פורסם בחשבון לאחר יצירתו.

**לא בוצעו ייבוא, שינוי בחשבון, Preview או Publish במסגרת בדיקת הקובץ.** דוח הבדיקה: `reports/gtm-export-review-20261101.md`. אם בעתיד מייבאים שינויים, בוחרים **Merge** ובודקים התנגשויות; אין לבחור Overwrite של תוכן הקונטיינר הקיים. [הנחיות הייצוא והייבוא של Google](https://support.google.com/tagmanager/answer/6106997?hl=en)
