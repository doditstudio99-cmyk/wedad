/**
 * Dodit Studio — النسخة المجانية (Google Sheets)
 * ------------------------------------------------
 * الكود ده بيخلي Google Sheet يشتغل كـ "سيرفر" للموقع:
 *  - الحجوزات بتتسجل في تبويب "الحجوزات"
 *  - الخدمات والأسعار والأعمال والآراء ومواعيد العمل بتتعدل من التبويبات
 *  - بيوصلك إيميل مع كل حجز جديد
 *
 * طريقة التركيب (مرة واحدة):
 *  1) من الشيت: Extensions ← Apps Script ← امسح الموجود والزق الكود ده ← Save
 *  2) اختار الدالة setup من فوق واضغط Run ← وافق على الصلاحيات
 *  3) Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone ← Deploy
 *  4) انسخ رابط الـ Web app وابعته
 */

const TZ = 'Africa/Cairo';
const SH = {
  settings: 'الإعدادات',
  services: 'الخدمات',
  portfolio: 'الأعمال',
  testimonials: 'الآراء',
  schedule: 'مواعيد العمل',
  closed: 'أيام الإجازة',
  bookings: 'الحجوزات',
};
const CATS = { 'دكاترة': 'doctors', 'محامين': 'lawyers', 'مدرسين': 'teachers', 'عقارات': 'realestate', 'أصحاب أعمال': 'business', 'أخرى': 'other' };
const CAT_AR = Object.keys(CATS).reduce((o, k) => ((o[CATS[k]] = k), o), {});
const STATUS = ['جديد', 'مؤكد', 'تم التصوير', 'ملغي'];
const CANCELLED = 'ملغي';
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ICONS = ['reels', 'board', 'combo', 'camera', 'star'];

/* ================= Web app ================= */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'slots') return json(Object.assign({ date: p.date }, slotsFor(String(p.date || ''))));
    return json(siteData());
  } catch (err) {
    return json({ error: 'server_error', message: String(err) });
  }
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: 'invalid' });
  }
  try {
    if (body.action === 'book') return json(book(body));
    return json({ error: 'not_found' });
  } catch (err) {
    return json({ error: 'server_error', message: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ================= Helpers ================= */

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name) { return ss().getSheetByName(name); }
function rows(name) {
  const sh = sheet(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function pad(n) { return String(n).padStart(2, '0'); }
function txt(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function bool(v) { return v === true || /^(true|نعم|yes|1|✓|✔)$/i.test(txt(v)); }
function lines(v) { return txt(v).split(/\r?\n/).map((s) => s.trim()).filter(String); }

function dateStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, ss().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const s = txt(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); // day/month/year
  if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
  return '';
}

function timeStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, ss().getSpreadsheetTimeZone(), 'HH:mm');
  const s = txt(v).toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)?$/);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if ((m[3] === 'pm' || m[3] === 'م') && h < 12) h += 12;
  if ((m[3] === 'am' || m[3] === 'ص') && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return pad(h) + ':' + pad(min);
}

function toMin(t) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }
function toTime(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function nowCairo() {
  const d = new Date();
  return { date: Utilities.formatDate(d, TZ, 'yyyy-MM-dd'), minutes: Number(Utilities.formatDate(d, TZ, 'H')) * 60 + Number(Utilities.formatDate(d, TZ, 'm')) };
}
function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Google Drive share links → direct image links */
function mediaUrl(v) {
  const s = txt(v);
  const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
  return /^https?:\/\//i.test(s) ? s : '';
}
function mediaType(url) {
  if (!url) return 'image';
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return 'video';
  if (/googleusercontent\.com|\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return 'image';
  return 'link';
}

/* ================= Data ================= */

function settingsMap() {
  const map = {};
  rows(SH.settings).forEach((r) => {
    const key = txt(r[0]);
    if (key) map[key] = { ar: txt(r[2]), en: txt(r[3]) || txt(r[2]) };
  });
  return map;
}

function schedule() {
  const s = settingsMap();
  const num = (k, d) => {
    const n = Number(s[k] && s[k].ar);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  const days = {};
  for (let i = 0; i < 7; i++) days[i] = { open: false, start: '12:00', end: '22:00' };
  rows(SH.schedule).forEach((r) => {
    const i = DAY_NAMES.indexOf(txt(r[0]));
    if (i < 0) return;
    days[i] = { open: bool(r[1]), start: timeStr(r[2]) || '12:00', end: timeStr(r[3]) || '22:00' };
  });
  return {
    slotMinutes: Math.max(15, num('slotMinutes', 60)),
    minNoticeMinutes: s.minNoticeMinutes ? Number(s.minNoticeMinutes.ar) || 0 : 120,
    maxDaysAhead: num('maxDaysAhead', 60),
    days: days,
    closedDates: rows(SH.closed).map((r) => dateStr(r[0])).filter(String),
  };
}

function siteData() {
  const s = settingsMap();
  const bi = (k) => s[k] || { ar: '', en: '' };
  const one = (k) => (s[k] ? s[k].ar : '');
  const sch = schedule();

  const services = [];
  rows(SH.services).forEach((r, i) => {
    if (!bool(r[0]) || !txt(r[1])) return;
    services.push({
      id: 's' + (i + 2),
      title: { ar: txt(r[1]), en: txt(r[2]) || txt(r[1]) },
      description: { ar: txt(r[3]), en: txt(r[4]) || txt(r[3]) },
      price: txt(r[5]),
      priceNote: { ar: txt(r[6]), en: txt(r[7]) || txt(r[6]) },
      features: { ar: lines(r[8]), en: lines(r[9]).length ? lines(r[9]) : lines(r[8]) },
      icon: ICONS.indexOf(txt(r[10])) >= 0 ? txt(r[10]) : 'reels',
      featured: bool(r[11]),
    });
  });

  const portfolio = [];
  rows(SH.portfolio).forEach((r) => {
    if (!bool(r[0]) || !txt(r[1])) return;
    const url = mediaUrl(r[5]);
    portfolio.push({
      title: { ar: txt(r[1]), en: txt(r[2]) || txt(r[1]) },
      category: CATS[txt(r[3])] || 'other',
      url: url,
      type: mediaType(url),
      thumb: mediaUrl(r[6]),
    });
    // r[4] is a free note column for the owner
  });

  const testimonials = [];
  rows(SH.testimonials).forEach((r) => {
    if (!bool(r[0]) || !txt(r[1])) return;
    testimonials.push({
      name: txt(r[1]),
      role: { ar: txt(r[2]), en: txt(r[3]) || txt(r[2]) },
      text: { ar: txt(r[4]), en: txt(r[5]) || txt(r[4]) },
      rating: Math.min(5, Math.max(1, Number(r[6]) || 5)),
    });
  });

  return {
    settings: {
      studioName: one('studioName') || 'Dodit Studio',
      tagline: bi('tagline'),
      heroTitle: bi('heroTitle'),
      heroSubtitle: bi('heroSubtitle'),
      about: bi('about'),
      address: bi('address'),
      workingHoursNote: bi('workingHoursNote'),
      currency: bi('currency'),
      phone: one('phone'),
      whatsapp: one('whatsapp').replace(/\D/g, ''),
      email: one('email'),
      mapQuery: one('mapQuery'),
      heroVideo: mediaUrl(one('heroVideo')),
      timezone: TZ,
      social: {
        instagram: one('instagram'), facebook: one('facebook'), tiktok: one('tiktok'), youtube: one('youtube'),
        snapchat: one('snapchat'), x: one('x'), linkedin: one('linkedin'),
      },
    },
    services: services,
    portfolio: portfolio,
    testimonials: testimonials,
    booking: {
      slotMinutes: sch.slotMinutes,
      maxDaysAhead: sch.maxDaysAhead,
      today: nowCairo().date,
      days: sch.days,
      closedDates: sch.closedDates,
    },
  };
}

function slotsFor(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { open: false, reason: 'invalid', slots: [] };
  const s = schedule();
  const now = nowCairo();
  if (date < now.date || date > addDays(now.date, s.maxDaysAhead)) return { open: false, reason: 'out_of_range', slots: [] };
  if (s.closedDates.indexOf(date) >= 0) return { open: false, reason: 'closed', slots: [] };
  const day = s.days[new Date(date + 'T00:00:00Z').getUTCDay()];
  if (!day || !day.open) return { open: false, reason: 'closed', slots: [] };

  const taken = {};
  rows(SH.bookings).forEach((r) => {
    if (dateStr(r[1]) === date && txt(r[8]) !== CANCELLED) taken[timeStr(r[2])] = true;
  });

  const step = s.slotMinutes;
  const start = toMin(day.start);
  let end = toMin(day.end);
  if (end <= start) end = 24 * 60;
  const slots = [];
  for (let m = start; m + step <= end && m < 24 * 60; m += step) {
    const time = toTime(m);
    let status = 'available';
    if (taken[time]) status = 'booked';
    else if (date === now.date && m < now.minutes + s.minNoticeMinutes) status = 'past';
    slots.push({ time: time, status: status });
  }
  return { open: true, slots: slots };
}

function safeCell(v) {
  const s = txt(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s; // never let user input become a formula
}

function book(b) {
  if (txt(b.website)) return { error: 'invalid' }; // honeypot
  const date = txt(b.date);
  const time = txt(b.time);
  const name = txt(b.name).slice(0, 100);
  const phone = txt(b.phone).slice(0, 20);
  const notes = txt(b.notes).slice(0, 1000);
  const category = txt(b.category);
  if (name.length < 2) return { error: 'invalid_name' };
  if (!/^\+?[\d\s-]{7,20}$/.test(phone)) return { error: 'invalid_phone' };

  const service = siteData().services.filter((x) => x.id === b.serviceId)[0];
  if (!service) return { error: 'invalid_service' };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const slot = slotsFor(date).slots.filter((x) => x.time === time)[0];
    if (!slot) return { error: 'invalid_slot' };
    if (slot.status !== 'available') return { error: 'slot_taken' };
    const ref = 'DS-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    sheet(SH.bookings).appendRow([
      ref, date, time, safeCell(name), "'" + phone, service.title.ar, CAT_AR[category] || '', safeCell(notes),
      STATUS[0], Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'),
    ]);
    SpreadsheetApp.flush();
    notify(ref, date, time, name, phone, service.title.ar, notes);
    return { ok: true, ref: ref, date: date, time: time };
  } finally {
    lock.releaseLock();
  }
}

function notify(ref, date, time, name, phone, service, notes) {
  try {
    const s = settingsMap();
    const to = (s.notifyEmail && s.notifyEmail.ar) || Session.getEffectiveUser().getEmail();
    if (!to) return;
    MailApp.sendEmail({
      to: to,
      subject: 'حجز جديد ' + ref + ' — ' + date + ' ' + time,
      body: 'حجز جديد من موقع Dodit Studio\n\n' +
        'رقم الحجز: ' + ref + '\nاليوم: ' + date + '\nالساعة: ' + time + '\nالاسم: ' + name +
        '\nالموبايل: ' + phone + '\nالخدمة: ' + service + (notes ? '\nملاحظات: ' + notes : '') +
        '\n\nالشيت: ' + ss().getUrl(),
    });
  } catch (err) {
    console.warn('notify failed', err);
  }
}

/* ================= Setup (run once) ================= */

const SEED = __SEED__;

function setup() {
  const book = ss();
  book.setSpreadsheetTimeZone(TZ);

  const make = (name, headers, data, widths) => {
    let sh = book.getSheetByName(name);
    if (!sh) sh = book.insertSheet(name);
    sh.setRightToLeft(true);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      if (data.length) sh.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ff6b00').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    (widths || []).forEach((w, i) => w && sh.setColumnWidth(i + 1, w));
    sh.getDataRange().setWrap(true).setVerticalAlignment('top');
    return sh;
  };
  const checkboxes = (sh, col) => sh.getRange(2, col, 100, 1).insertCheckboxes();
  const dropdown = (sh, col, list) =>
    sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build()
    );

  // Settings
  const st = make(SH.settings, ['key', 'الإعداد', 'عربي', 'English'], SEED.settings, [110, 240, 380, 380]);
  st.hideColumns(1);

  // Services
  const sv = make(SH.services,
    ['ظاهرة؟', 'الاسم (عربي)', 'Name (EN)', 'الوصف (عربي)', 'Description (EN)', 'السعر', 'وحدة السعر (عربي)', 'Price unit (EN)', 'المميزات (عربي) — سطر لكل ميزة', 'Features (EN) — one per line', 'الأيقونة', 'الأكثر طلباً؟'],
    SEED.services, [70, 170, 170, 260, 260, 80, 120, 120, 260, 260, 90, 90]);
  checkboxes(sv, 1); checkboxes(sv, 12); dropdown(sv, 11, ICONS);

  // Portfolio
  const pf = make(SH.portfolio,
    ['ظاهر؟', 'العنوان (عربي)', 'Title (EN)', 'المجال', 'ملاحظة لك', 'اللينك (ريل إنستجرام/تيك توك/يوتيوب، أو صورة من Google Drive)', 'صورة الغلاف (اختياري — لينك Google Drive)'],
    SEED.portfolio, [70, 200, 200, 110, 140, 380, 300]);
  checkboxes(pf, 1); dropdown(pf, 4, Object.keys(CATS));

  // Testimonials
  const ts = make(SH.testimonials,
    ['ظاهر؟', 'اسم العميل', 'الوظيفة (عربي)', 'Role (EN)', 'الرأي (عربي)', 'Review (EN)', 'التقييم (1-5)'],
    SEED.testimonials, [70, 150, 150, 150, 320, 320, 90]);
  checkboxes(ts, 1); dropdown(ts, 7, ['5', '4', '3', '2', '1']);

  // Working hours
  const sc = make(SH.schedule, ['اليوم', 'شغالين؟', 'من (مثلاً 12:00)', 'إلى (مثلاً 22:00)'], SEED.schedule, [120, 80, 140, 140]);
  sc.getRange('C:D').setNumberFormat('@');
  sc.getRange(2, 2, 7, 1).insertCheckboxes();

  // Days off
  const cl = make(SH.closed, ['التاريخ', 'السبب (اختياري)'], [], [160, 260]);
  cl.getRange('A2:A').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build()).setNumberFormat('yyyy-mm-dd');

  // Bookings
  const bk = make(SH.bookings, ['رقم الحجز', 'اليوم', 'الساعة', 'الاسم', 'الموبايل', 'الخدمة', 'المجال', 'ملاحظات', 'الحالة', 'وقت الطلب'], [], [100, 110, 80, 160, 140, 170, 100, 240, 110, 140]);
  bk.getRange('B:C').setNumberFormat('@');
  bk.getRange('E:E').setNumberFormat('@');
  dropdown(bk, 9, STATUS);
  const rules = bk.getConditionalFormatRules().concat([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('جديد').setBackground('#fff4d6').setRanges([bk.getRange('I2:I')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('مؤكد').setBackground('#dcf5e6').setRanges([bk.getRange('I2:I')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ملغي').setBackground('#fbe4e2').setRanges([bk.getRange('A2:J')]).build(),
  ]);
  bk.setConditionalFormatRules(rules);

  // Remove the default empty sheet
  book.getSheets().forEach((sh) => {
    if (Object.values(SH).indexOf(sh.getName()) < 0 && sh.getLastRow() === 0 && book.getSheets().length > 1) book.deleteSheet(sh);
  });
  book.setActiveSheet(bk);
  book.moveActiveSheet(1);

  // Ask for e-mail permission now so booking notifications work
  MailApp.getRemainingDailyQuota();
  console.log('Setup done ✓');
}

/* Menu inside the sheet */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dodit Studio')
    .addItem('افتح الموقع', 'openSite_')
    .addToUi();
}
function openSite_() {
  const url = (settingsMap().siteUrl || {}).ar;
  const html = url
    ? '<p><a href="' + url + '" target="_blank">افتح الموقع ↗</a></p>'
    : '<p>اكتب لينك الموقع في تبويب الإعدادات (siteUrl).</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(300).setHeight(80), 'Dodit Studio');
}
