// Guided game selection uses public product facts, without personal information.
// Keep option values stable: advisor.js passes these values to recommendGames().
export const QUESTIONS = [
 {id:'goal',title:'מה תרצו שיהיה במרכז המפגש?',multiple:true,hint:'אפשר לבחור יותר מנושא אחד.',options:[
  {value:'emotional',label:'שיח רגשי והיכרות עם רגשות'},
  {value:'problems',label:'התמודדות עם מצבים ופתרון בעיות'},
  {value:'stress',label:'לחץ, פחדים ודרכים להירגע'},
  {value:'thinking',label:'חשיבה גמישה ועבודה על מחשבות'},
  {value:'social',label:'תקשורת, שיתוף פעולה וקשר'},
  {value:'activity',label:'משחק ופעילות משותפת'}
 ]},
 {id:'age',title:'באיזה גיל המשתתפים?',multiple:true,hint:'אפשר לסמן כמה קבוצות גיל. ליד כל הצעה נציין לאילו גילים היא מתאימה.',options:[
  {value:'under4',label:'מתחת לגיל 4'},
  {value:'4',label:'גיל 4'},
  {value:'5',label:'גיל 5'},
  {value:'6to7',label:'גילי 6–7'},
  {value:'8to12',label:'גילי 8–12'},
  {value:'teen',label:'בני ובנות נוער'},
  {value:'adult',label:'מבוגרים'},
  {value:'unsure',label:'עדיין לא בטוחים'}
 ]},
 {id:'setting',title:'באיזו מסגרת תרצו להשתמש במשחק?',multiple:true,hint:'אפשר לבחור כמה מסגרות.',options:[
  {value:'individual',label:'מפגש פרטני'},
  {value:'group',label:'קבוצה או כיתה'},
  {value:'home',label:'בבית עם המשפחה'}
 ]},
 {id:'format',title:'מה מתאים לכם יותר?',options:[
  {value:'cards',label:'מארז קלפים'},
  {value:'digital',label:'קובץ דיגיטלי'},
  {value:'either',label:'שתי האפשרויות מתאימות'}
 ]}
];

// Scores rank documented activities; they are not a clinical assessment or a
// percentage of suitability. Zero relevance always excludes a product.
const FACTS = {
 resilience:{format:'cards',minAge:3,setting:{individual:3,group:3,home:2},
  ageNote:'מומלץ מגיל 3. אפשר להשתמש בקלפים לעבודה פרטנית וגם לפעילות קבוצתית.',
  goals:{
   emotional:[5,'הקלפים מחברים בין מצבים מעוררי לחץ, תחושות גוף ושיטות רגיעה, ויכולים לשמש לבחירה אישית ולשיחה על החוויה.'],
   stress:[10,'הקלפים עוסקים במצבים מעוררי לחץ, בתחושות הגוף ובשיטות רגיעה דרך המחשבות, הגוף והנשימה. אפשר לשוחח וגם להתנסות בשיטות.']
  }},
 thoughts:{format:'cards',minAge:8,setting:{individual:3,group:2,home:1},
  ageNote:'מומלץ מגיל 8. אפשר להתאים את העבודה לשפה ולרמת הבשלות של המשתתפים.',
  goals:{
   problems:[4,'קלפי המקרים מאפשרים לבחון איך מפרשים מצבים מהחיים, לזהות טעויות חשיבה ולשוחח על דרכים נוספות להסתכל על המצב.'],
   thinking:[10,'קלפי טעויות החשיבה, המקרים והקלפים הפתוחים נועדו לזיהוי דפוסי מחשבה ולתרגול הסתכלות גמישה ומאוזנת יותר.']
  }},
 solutions:{format:'cards',minAge:3,setting:{individual:3,group:3,home:3},
  ageNote:'מומלץ מגיל 3. בהוראות יש גם דרך משחק מודרכת לילדים צעירים.',
  goals:{
   emotional:[5,'קלפי הבעיות מציגים מצבים חברתיים ורגשיים מהחיים, ומזמינים לשוחח על התחושות ועל דרכי ההתמודדות האפשריות.'],
   problems:[10,'מציגים בעיה, מציעים פתרונות ומסבירים את הבחירה. קלפי הג׳וקר מאפשרים להציע רעיון נוסף, וקלפי המחמאות מזמינים לפרגן על העזרה.'],
   thinking:[6,'לאותה בעיה יכולים להתאים כמה פתרונות. המשחק מזמין להסביר בחירות ולהקשיב לרעיונות ולדרכי התמודדות שונות.'],
   social:[8,'המשתתפים יכולים לבקש עזרה, להציע פתרונות זה לזה ולפרגן על הקשבה, רעיונות ושיתוף פעולה באמצעות קלפי המחמאות.'],
   activity:[4,'משחק משותף של בעיות ופתרונות, עם מקום להצעות של המשתתפים ולפרגון באמצעות קלפי המחמאות.']
  }},
 drive:{format:'cards',minAge:6,setting:{individual:2,group:3,home:3},
  ageNote:'מומלץ מגיל 6, ל־2 עד 7 שחקנים. אפשר לפשט את המשחק באמצעות צמצום יכולות הקלפים.',
  goals:{
   activity:[9,'משחק אסטרטגיה שבו אוספים קלפי יצרים, מפעילים יכולות ומשלימים משימות כדי לצבור נקודות. מיועד ל־2 עד 7 שחקנים.']
  }},
 world:{format:'cards',minAge:4,setting:{individual:2,group:3,home:3},
  ageNote:'מומלץ מגיל 4, לשני שחקנים ומעלה. קלפי הרביעיות מסומנים בצבעים גם לילדים שעדיין לא קוראים.',
  goals:{
   social:[8,'רביעיות ודאבל מזמינים תקשורת ומשחק משותף. החוברת כוללת גם מערכים שעוסקים בשיתוף פעולה, בהיכרות ובאחריות.'],
   activity:[9,'שני משחקים מוכרים בגרסה כלבית: משלימים רביעיות או מחפשים סמלים משותפים בדאבל. החוברת מציעה כמה דרכי משחק.']
  }},
 emotions:{format:'cards',minAge:4,setting:{individual:3,group:3,home:3},
  ageNote:'מומלץ מגיל 4, לשני משתתפים ומעלה.',
  goals:{
   emotional:[10,'קלפי התמונות והרגשות מזמינים לבחור מילים לתחושות ולגלות שאותה תמונה יכולה לעורר רגשות שונים אצל משתתפים שונים.'],
   thinking:[3,'המשתתפים מתבוננים באותה תמונה ומסבירים רגשות ופרשנויות שונות. זו דרך לפתוח שיחה על נקודות מבט שונות.'],
   social:[6,'המשחק מזמין להקשיב לבחירות ולסיפורים של המשתתפים ולשוחח על נקודות מבט ועל רגשות שונים באותו מצב.'],
   activity:[3,'אפשר להתאים רגשות לתמונות, לבנות שרשרת רגשות או לספר סיפור משותף בעזרת הקלפים.']
  }},
 derech:{format:'cards',minAge:4,setting:{individual:3,group:3,home:3},
  ageNote:'פנטומימה וזיכרון מומלצים מגיל 4; משחקי התכונות מגיל 6. לשני משתתפים ומעלה.',
  goals:{
   emotional:[4,'התמונות, השאלות והמשימות מאפשרות לספר על חוויות ולהכיר את המשתתפים. משחקי התכונות מציעים גם שיחה על תכונות אופי, מגיל 6.'],
   thinking:[5,'מחברים בין תמונות לתכונות ומסבירים את הקשר, או ממציאים סיפור בעזרת הקלפים. משחקי התכונות מומלצים מגיל 6.'],
   social:[7,'פנטומימה, זיכרון עם שאלות ומשימות ומשחקי תכונות מציעים דרכים שונות להיכרות ולתקשורת בין המשתתפים.'],
   activity:[10,'שלושה משחקים במארז אחד: מציגים בפנטומימה, מוצאים זוגות בזיכרון או מחברים תמונות לתכונות. אפשר גם להמציא סיפורים ומשחקים נוספים.']
  }},
 workbook:{format:'digital',minAge:6,childrenOnly:true,setting:{individual:3,group:2,home:3},
  ageNote:'החוברת מיועדת לעבודה רגשית עם ילדים מגיל 6.',
  goals:{
   emotional:[8,'חוברת דיגיטלית עם כלים לעבודה רגשית עם ילדים בנושאי רגשות, ויסות, דימוי עצמי, הבעה, חוזקות והצלחות.'],
   problems:[6,'החוברת כוללת כלים בנושאי פתרון בעיות ויחסים חברתיים, לצד נושאים רגשיים נוספים לעבודה עם ילדים.'],
   stress:[6,'בחוברת יש כלים לעבודה עם ילדים בנושאי פחדים, ויסות וחוסן, שאפשר לשלב במפגש ובקשר עם ההורים.'],
   thinking:[7,'החוברת כוללת עבודה על טעויות חשיבה, לצד דחיית סיפוקים ונושאים רגשיים נוספים לעבודה עם ילדים.'],
   social:[5,'החוברת כוללת כלים בנושאי יחסים חברתיים ופתרון בעיות, ויכולה לחבר בין העבודה עם הילד לבין ההורים והבית.']
  }},
 escape:{format:'digital',minAge:5,setting:{individual:0,group:3,home:2},
  ageNote:'מומלץ מגיל 5. אפשר לבחור את החידות ואת הרמה בהתאם למשתתפים.',
  goals:{
   social:[5,'פעילות משותפת של פתרון חידות מעולם הכלבים בדרך לגילוי קוד התיבה. אפשר לבחור חידות ורמות שונות ולהתאים את הפעילות לקבוצה.'],
   activity:[10,'קבצים להדפסה עם חידות ופתרונות, ליצירת פעילות בסגנון חדר בריחה. להפעלה צריך להכין תיבה או קופסה ומנעול עם קוד.']
  }}
};

const VALID = Object.fromEntries(QUESTIONS.map(question => [question.id,new Set(question.options.map(option => option.value))]));
const AGE = {under4:0,'4':4,'5':5,'6to7':6,'8to12':8,teen:13,adult:18};
const AGE_LABEL = Object.fromEntries(QUESTIONS.find(question=>question.id==='age').options.map(option=>[option.value,option.label]));
const ORDER = Object.keys(FACTS);

function choices(value,id) {
 const values=Array.isArray(value) ? value : typeof value==='string' ? [value] : [];
 if(!values.length || values.some(item=>!VALID[id].has(item)))return null;
 const unique=new Set(values);
 // A known age always applies, even if an outdated caller also sends unsure.
 if(id==='age' && unique.size>1)unique.delete('unsure');
 return QUESTIONS.find(question=>question.id===id).options.map(option=>option.value).filter(value=>unique.has(value));
}

function ageEligible(facts,age,minimum=facts.minAge) {
 if(age==='unsure')return true;
 // The under4 cohort also contains age3. A documented3+ product can be shown
 // only with the narrower age qualification in its visible note below.
 if(age==='under4')return Boolean(facts.allAges) || (Number.isFinite(minimum) && minimum<=3);
 if(facts.childrenOnly && age==='adult')return false;
 return !minimum || AGE[age]>=minimum;
}

export function recommendGames(answers,catalog) {
 if(!answers || !Array.isArray(catalog) || !VALID.format.has(answers.format))return [];
 const goals=choices(answers.goal,'goal'),ages=choices(answers.age,'age'),settings=choices(answers.setting,'setting');
 if(!goals || !ages || !settings)return [];
 const knownAges=ages.filter(age=>age!=='unsure');
 const candidates=[],seen=new Set();
 for(const product of catalog){
  if(!product || seen.has(product.id))continue;
  seen.add(product.id);
  const facts=Object.hasOwn(FACTS,product.id) ? FACTS[product.id] : null;
  if(!facts || product.outOfStock || (answers.format!=='either' && facts.format!==answers.format))continue;
  // A practitioner may work with several separate age groups. Keep a product
  // if a documented activity matches at least one selected cohort, and disclose
  // that subset below instead of implying the same activity fits every age.
  const eligibleMatches=goals.filter(goal=>facts.goals[goal]).map(goal=>({
   goal,relevance:facts.goals[goal],
   ageGroups:ages.filter(age=>ageEligible(facts,age,product.id==='derech' && goal==='thinking' ? 6 : facts.minAge))
  })).filter(match=>match.ageGroups.length);
  if(!eligibleMatches.length)continue;
  const weights=eligibleMatches.map(({relevance})=>relevance[0]);
  const maximum=Math.max(...weights),average=weights.reduce((sum,value)=>sum+value,0)/goals.length;
  const coverage=eligibleMatches.length/goals.length;
  const eligibleAges=knownAges.filter(age=>eligibleMatches.some(match=>match.ageGroups.includes(age)));
  const ageCoverage=knownAges.length ? eligibleAges.length/knownAges.length : 1;
  const settingScore=settings.reduce((sum,setting)=>sum+(facts.setting[setting] || 0),0)/settings.length;
  const score=maximum*5+average*4+coverage*10+ageCoverage*15+settingScore;
  eligibleMatches.sort((a,b)=>b.relevance[0]-a.relevance[0] || goals.indexOf(a.goal)-goals.indexOf(b.goal));
  const reason=eligibleMatches.slice(0,2).map(({relevance})=>relevance[1]).join(' ');
  let ageNote=facts.ageNote;
  if(knownAges.length>1){
   const groups=eligibleAges.map(age=>AGE_LABEL[age]).join(', ');
   if(facts.childrenOnly && knownAges.includes('adult')){
    ageNote='ההצעה מתייחסת לקבוצות הילדים שבחרתם: '+groups+'. '+ageNote;
   }else if(eligibleAges.length<knownAges.length){
    ageNote=(facts.minAge || facts.allAges
     ? 'מתוך הגילים שבחרתם, ההצעה מתייחסת לקבוצות הבאות: '
     : 'מתוך הגילים שבחרתם, כדאי לברר התאמה לקבוצות הבאות: ')+groups+'. '+ageNote;
   }else{
    ageNote=(facts.minAge || facts.allAges
     ? 'ההצעה מתייחסת לכל קבוצות הגיל שבחרתם. '
     : 'לקבוצות הגיל שבחרתם נדרש בירור התאמה. ')+ageNote;
   }
  }
  if(eligibleAges.includes('under4') && !facts.allAges){
   ageNote='בקבוצת ״מתחת לגיל 4״, המשחק מתאים מגיל '+facts.minAge+'.';
   const otherGroups=eligibleAges.filter(age=>age!=='under4').map(age=>AGE_LABEL[age]);
   if(otherGroups.length)ageNote+=' ההצעה מתייחסת גם לקבוצות שבחרתם: '+otherGroups.join(', ')+'.';
  }
  candidates.push({product,reason,ageNote,score});
 }
 candidates.sort((a,b)=>b.score-a.score || ORDER.indexOf(a.product.id)-ORDER.indexOf(b.product.id));
 return candidates.slice(0,3).map(({product,reason,ageNote})=>({product,reason,ageNote}));
}
