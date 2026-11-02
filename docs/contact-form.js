/* Contact details go only to the form delivery service, never to site measurement. */
(() => {
 'use strict';
 const endpoint = 'https://formsubmit.co/ajax/yonis1230@gmail.com';
 const production = ['derech-hakelev.com', 'www.derech-hakelev.com'].includes(location.hostname);
 const failure = 'לא הצלחנו לשלוח כרגע. אפשר לנסות שוב או לפנות בטלפון או במייל.';
 const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

 for (const form of document.querySelectorAll('[data-contact-form]')) {
  const name = form.elements.namedItem('name');
  const contact = form.elements.namedItem('contact');
  const message = form.elements.namedItem('message');
  const honey = form.elements.namedItem('_honey');
  const submit = form.querySelector('[data-contact-submit]');
  const status = form.querySelector('[data-contact-status]');
  if (!name || !contact || !message || !honey || !submit || !status) continue;
  let busy = false;

  function notify(text, state) {
   status.textContent = text;
   status.dataset.state = state;
   status.hidden = false;
  }
  function validValues() {
   const values = {name: name.value.trim(), contact: contact.value.trim(), message: message.value.trim()};
   const digits = values.contact.replace(/\D/g, '');
   const email = values.contact.length <= 254 && emailPattern.test(values.contact);
   const phone = values.contact.length <= 254 && /^\+?[\d\s().\-–—/]+$/.test(values.contact) && digits.length >= 7 && digits.length <= 15;
   name.setCustomValidity(!values.name || values.name.length > 80 ? 'יש להזין שם, עד 80 תווים.' : '');
   contact.setCustomValidity(!email && !phone ? 'יש להזין מספר טלפון או כתובת אימייל תקינים.' : '');
   message.setCustomValidity(values.message.length > 1000 ? 'אפשר לכתוב הודעה באורך של עד 1,000 תווים.' : '');
   return {values, email, phone, valid: Boolean(values.name && values.name.length <= 80 && (email || phone) && values.message.length <= 1000)};
  }

  for (const field of [name, contact, message]) field.addEventListener('input', () => field.setCustomValidity(''));

  form.addEventListener('submit', async event => {
   event.preventDefault();
   if (busy) return;
   const checked = validValues();
   if (!form.reportValidity() || !checked.valid) return;
   if (honey.value.trim()) {
    notify(failure, 'error');
    return;
   }
   if (!production) {
    notify('תצוגת בדיקה בלבד — הפנייה לא נשלחה. אפשר לשלוח מהאתר הפעיל.', 'preview');
    return;
   }

   const payload = {
    name: checked.values.name,
    contact: checked.values.contact,
    message: checked.values.message,
    ...(checked.email ? {email: checked.values.contact} : {phone: checked.values.contact}),
    _subject: 'פנייה חדשה מאתר דרך הכלב',
    _url: 'https://derech-hakelev.com/',
    _template: 'table',
    _captcha: 'false',
    _honey: ''
   };
   const controls = Array.from(form.elements).filter(control => 'disabled' in control).map(control => [control, control.disabled]);
   const controller = new AbortController();
   let timer;
   busy = true;
   form.setAttribute('aria-busy', 'true');
   for (const [control] of controls) control.disabled = true;
   notify('שולחים את הפנייה…', 'sending');

   try {
    timer = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(endpoint, {
     method: 'POST',
     mode: 'cors',
     credentials: 'omit',
     referrerPolicy: 'origin',
     headers: {'Content-Type': 'application/json', Accept: 'application/json'},
     body: JSON.stringify(payload),
     signal: controller.signal
    });
    if (!response.ok) throw new Error('delivery');
    const data = await response.json();
    if (!data || ![true, 'true'].includes(data.success) || /activat|pending/i.test(String(data.message || ''))) throw new Error('delivery');
    form.reset();
    notify('תודה, הפנייה התקבלה. אחזור אליכם בהקדם.', 'success');
   } catch {
    notify(failure, 'error');
   } finally {
    clearTimeout(timer);
    for (const [control, disabled] of controls) control.disabled = disabled;
    form.removeAttribute('aria-busy');
    busy = false;
   }
  });
 }
})();
