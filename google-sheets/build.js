// Generates Code.gs (the Google Apps Script backend) from Code.template.gs,
// filling the starting content from ../website/seed.js so both versions share it.
// Run: node google-sheets/build.js
const fs = require('fs');
const path = require('path');
const { defaultData } = require('../website/seed');

const d = defaultData();
const s = d.settings;
const CAT_AR = { doctors: 'دكاترة', lawyers: 'محامين', teachers: 'مدرسين', realestate: 'عقارات', business: 'أصحاب أعمال', other: 'أخرى' };
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const bi = (key, label, v) => [key, label, v.ar, v.en];
const one = (key, label, v) => [key, label, String(v ?? ''), ''];

const settings = [
  one('studioName', 'اسم الاستوديو', s.studioName),
  bi('tagline', 'الشعار الصغير فوق العنوان', s.tagline),
  bi('heroTitle', 'العنوان الرئيسي', s.heroTitle),
  bi('heroSubtitle', 'الوصف تحت العنوان', s.heroSubtitle),
  bi('about', 'من نحن', s.about),
  one('whatsapp', 'رقم الواتساب (دولي بدون +، مثلاً 201012345678)', s.whatsapp),
  one('phone', 'رقم التليفون اللي يظهر', s.phone),
  one('email', 'الإيميل', s.email),
  bi('address', 'العنوان', s.address),
  one('mapQuery', 'مكان الخريطة (عنوان أو اسم المكان على جوجل ماب)', s.mapQuery),
  bi('workingHoursNote', 'نص أيام العمل', s.workingHoursNote),
  bi('currency', 'العملة', s.currency),
  one('instagram', 'Instagram (سيبه فاضي لو مش عايزه يظهر)', s.social.instagram),
  one('facebook', 'Facebook', s.social.facebook),
  one('tiktok', 'TikTok', s.social.tiktok),
  one('youtube', 'YouTube', s.social.youtube),
  one('snapchat', 'Snapchat', s.social.snapchat),
  one('x', 'X (Twitter)', s.social.x),
  one('linkedin', 'LinkedIn', s.social.linkedin),
  one('heroVideo', 'فيديو أول الصفحة (لينك MP4 مباشر — اختياري)', s.heroVideo),
  one('slotMinutes', 'مدة كل معاد بالدقائق', d.schedule.slotMinutes),
  one('minNoticeMinutes', 'أقل وقت قبل الحجز بالدقائق', d.schedule.minNoticeMinutes),
  one('maxDaysAhead', 'الحجز متاح لكام يوم قدام', d.schedule.maxDaysAhead),
  one('notifyEmail', 'إيميل إشعارات الحجز (فاضي = إيميل صاحب الشيت)', ''),
  one('siteUrl', 'لينك الموقع', ''),
];

const services = d.services.map((x) => [
  x.visible !== false, x.title.ar, x.title.en, x.description.ar, x.description.en, x.price,
  x.priceNote.ar, x.priceNote.en, x.features.ar.join('\n'), x.features.en.join('\n'), x.icon, !!x.featured,
]);
const portfolio = d.portfolio.map((x) => [x.visible !== false, x.title.ar, x.title.en, CAT_AR[x.category], 'مثال — بدّله بشغلك', '', '']);
const testimonials = d.testimonials.map((x) => [x.visible !== false, x.name, x.role.ar, x.role.en, x.text.ar, x.text.en, String(x.rating)]);
// Week starting Saturday
const schedule = [6, 0, 1, 2, 3, 4, 5].map((i) => [DAY_NAMES[i], d.schedule.days[i].open, d.schedule.days[i].start, d.schedule.days[i].end]);

const seed = { settings, services, portfolio, testimonials, schedule };
const tpl = fs.readFileSync(path.join(__dirname, 'Code.template.gs'), 'utf8');
const out = '// ⚠️ ملف متولد تلقائياً من Code.template.gs — انسخه كله في Apps Script\n' + tpl.replace('__SEED__', JSON.stringify(seed, null, 2));
fs.writeFileSync(path.join(__dirname, 'Code.gs'), out);
console.log('Code.gs written', (out.length / 1024).toFixed(1) + 'KB');
