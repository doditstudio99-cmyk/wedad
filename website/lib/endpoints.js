// Every API endpoint. app/api/**/route.js files only point here.
import { defaultData } from './seed.js';
import { store } from './store.js';
import {
  handler, json, fail, str, bi, biList, isDate, isTime, isPhone, safeUrl, nowInTz, today, slotsFor, newId, newRef,
  usedOf, withTotals, findPackage, activePackageFor, packageTitle, hashPassword, checkPassword, sessionCookie,
  clearCookie, rateLimit, clientIp,
} from './core.js';

/* ====================================================================== */
/* Public                                                                  */
/* ====================================================================== */
export const getSite = handler(async ({ db }) =>
  json({
    settings: db.settings,
    services: db.services.filter((s) => s.visible !== false),
    portfolio: db.portfolio.filter((p) => p.visible !== false),
    testimonials: db.testimonials.filter((t) => t.visible !== false),
    booking: {
      slotMinutes: db.schedule.slotMinutes,
      maxDaysAhead: db.schedule.maxDaysAhead,
      today: today(db),
      days: db.schedule.days,
      closedDates: db.schedule.closedDates,
    },
    // Lets the booking form offer "book from my package" (the Google Sheets back-end doesn't support it)
    features: { packageBooking: true },
  })
);

async function slotsOfDay({ db, req }) {
  const date = str(req.nextUrl.searchParams.get('date') || '', 10);
  if (!isDate(date)) return fail('invalid_date');
  return json({ date, ...slotsFor(db, date) });
}
export const getSlots = handler(slotsOfDay);

export const postBooking = handler(
  async ({ db, body: b, req, save }) => {
    if (!rateLimit('book:' + clientIp(req), 8, 60 * 60 * 1000)) return fail('too_many_requests', 429);
    if (str(b.website)) return fail('invalid'); // honeypot
    const date = str(b.date, 10);
    const time = str(b.time, 5);
    const name = str(b.name, 100);
    const phone = str(b.phone, 30);
    const usePackage = b.usePackage === true;
    const service = usePackage ? null : db.services.find((s) => s.id === b.serviceId);

    if (!isDate(date) || !isTime(time)) return fail('invalid_slot');
    if (name.length < 2) return fail('invalid_name');
    if (!isPhone(phone)) return fail('invalid_phone');
    if (!usePackage && !service) return fail('invalid_service');
    const pkg = usePackage ? activePackageFor(db, phone) : null;
    if (usePackage && !pkg) return fail('no_active_package');

    // This runs under the store lock, so two people can't take the same slot
    const slot = slotsFor(db, date).slots.find((s) => s.time === time);
    if (!slot) return fail('invalid_slot');
    if (slot.status !== 'available') return fail('slot_taken', 409);

    const booking = {
      id: newId(), ref: newRef(), date, time, name, phone,
      notes: str(b.notes, 1000), category: str(b.category, 50),
      serviceId: service ? service.id : '',
      serviceTitle: service ? service.title : packageTitle(pkg),
      packageId: pkg ? pkg.id : '',
      status: 'pending', source: 'website', createdAt: new Date().toISOString(),
    };
    db.bookings.push(booking);
    save();
    return json(
      {
        ok: true, ref: booking.ref, date, time,
        // Only what the client already knows about their own package
        package: pkg ? { title: pkg.title, unit: pkg.unit, total: pkg.total, remaining: pkg.total - usedOf(pkg) } : null,
      },
      201
    );
  },
  { mutate: true }
);

/* ====================================================================== */
/* Admin: session                                                          */
/* ====================================================================== */
export const postLogin = handler(async ({ db, body, req }) => {
  if (!rateLimit('login:' + clientIp(req), 10, 15 * 60 * 1000)) return fail('too_many_requests', 429);
  if (!checkPassword(db, str(body.password, 200))) return fail('wrong_password', 401);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(db, req) });
});

export const postLogout = handler(async () => json({ ok: true }, 200, { 'Set-Cookie': clearCookie() }));

export const getMe = handler(async () => json({ ok: true }), { admin: true });

export const postPassword = handler(
  async ({ db, body, req, save }) => {
    if (!checkPassword(db, str(body.current, 200))) return fail('wrong_password');
    if (str(body.next, 200).length < 6) return fail('too_short');
    db.auth = { ...db.auth, ...hashPassword(str(body.next, 200)) };
    save();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(db, req) });
  },
  { admin: true, mutate: true }
);

/* ====================================================================== */
/* Admin: data, settings, schedule                                         */
/* ====================================================================== */
export const getData = handler(async ({ db }) => {
  const { auth, ...rest } = db;
  return json(rest);
}, { admin: true });

export const putSettings = handler(
  async ({ db, body: b, save }) => {
    const social = {};
    for (const k of Object.keys(db.settings.social)) social[k] = safeUrl(b.social && b.social[k]);
    db.settings = {
      ...db.settings,
      studioName: str(b.studioName, 100) || 'Dodit Studio',
      tagline: bi(b.tagline, 200),
      heroTitle: bi(b.heroTitle, 200),
      heroSubtitle: bi(b.heroSubtitle, 500),
      about: bi(b.about, 3000),
      address: bi(b.address, 300),
      workingHoursNote: bi(b.workingHoursNote, 200),
      phone: str(b.phone, 30),
      whatsapp: str(b.whatsapp, 20).replace(/\D/g, ''),
      email: str(b.email, 120),
      mapQuery: str(b.mapQuery, 300),
      currency: bi(b.currency, 20),
      timezone: str(b.timezone, 60) || 'Africa/Cairo',
      heroVideo: safeUrl(b.heroVideo),
      packageMessage: str(b.packageMessage, 1500) || defaultData().settings.packageMessage,
      social,
    };
    try {
      nowInTz(db.settings.timezone);
    } catch {
      db.settings.timezone = 'Africa/Cairo';
    }
    save();
    return json(db.settings);
  },
  { admin: true, mutate: true }
);

export const putSchedule = handler(
  async ({ db, body: b, save }) => {
    const days = {};
    for (let i = 0; i < 7; i++) {
      const d = (b.days && b.days[i]) || {};
      days[i] = { open: !!d.open, start: isTime(d.start) ? d.start : '12:00', end: isTime(d.end) ? d.end : '22:00' };
    }
    db.schedule = {
      slotMinutes: Math.min(480, Math.max(15, Number(b.slotMinutes) || 60)),
      maxDaysAhead: Math.min(365, Math.max(1, Number(b.maxDaysAhead) || 60)),
      minNoticeMinutes: Math.min(10080, Math.max(0, Number(b.minNoticeMinutes) || 0)),
      days,
      closedDates: [...new Set((b.closedDates || []).filter(isDate))].sort(),
    };
    save();
    return json(db.schedule);
  },
  { admin: true, mutate: true }
);

export const getAdminSlots = handler(slotsOfDay, { admin: true });

/* ====================================================================== */
/* Admin: bookings                                                         */
/* ====================================================================== */
export const postAdminBooking = handler(
  async ({ db, body: b, save }) => {
    // Manual booking (phone/WhatsApp) or blocking a slot
    const date = str(b.date, 10);
    const time = str(b.time, 5);
    if (!isDate(date) || !isTime(time)) return fail('invalid_slot');
    if (db.bookings.some((x) => x.date === date && x.time === time && x.status !== 'cancelled')) return fail('slot_taken', 409);
    const service = db.services.find((s) => s.id === b.serviceId);
    const pkg = b.packageId ? findPackage(db, str(b.packageId, 40)) : null;
    const booking = {
      id: newId(), ref: newRef(), date, time,
      name: str(b.name, 100) || (pkg ? pkg.name : '—'),
      phone: str(b.phone, 30) || (pkg ? pkg.phone : ''),
      notes: str(b.notes, 1000), category: str(b.category, 50),
      serviceId: service ? service.id : '',
      serviceTitle: service ? service.title : pkg ? packageTitle(pkg) : { ar: '', en: '' },
      packageId: pkg ? pkg.id : '',
      status: 'confirmed', source: 'admin', createdAt: new Date().toISOString(),
    };
    db.bookings.push(booking);
    save();
    return json(booking, 201);
  },
  { admin: true, mutate: true }
);

export const patchBooking = handler(
  async ({ db, body, params, save }) => {
    const booking = db.bookings.find((x) => x.id === params.id);
    if (!booking) return fail('not_found', 404);
    const status = str(body.status, 20);
    if (!['pending', 'confirmed', 'cancelled', 'done'].includes(status)) return fail('invalid_status');
    if (
      booking.status === 'cancelled' && status !== 'cancelled' &&
      db.bookings.some((x) => x.id !== booking.id && x.date === booking.date && x.time === booking.time && x.status !== 'cancelled')
    )
      return fail('slot_taken', 409);
    booking.status = status;
    save();
    return json(booking);
  },
  { admin: true, mutate: true }
);

export const deleteBooking = handler(
  async ({ db, params, save }) => {
    const before = db.bookings.length;
    db.bookings = db.bookings.filter((x) => x.id !== params.id);
    if (db.bookings.length === before) return fail('not_found', 404);
    save();
    return json({ ok: true });
  },
  { admin: true, mutate: true }
);

/* ====================================================================== */
/* Admin: client packages (usage tracking)                                 */
/* ====================================================================== */
function cleanPackage(b) {
  return {
    name: str(b.name, 100),
    phone: str(b.phone, 30),
    title: str(b.title, 150),
    unit: str(b.unit, 30) || 'ريل',
    total: Math.round(Number(b.total)),
    startDate: isDate(str(b.startDate, 10)) ? str(b.startDate, 10) : '',
    expiryDate: isDate(str(b.expiryDate, 10)) ? str(b.expiryDate, 10) : '',
    notes: str(b.notes, 1000),
  };
}
function packageError(p) {
  if (p.name.length < 2) return 'invalid_name';
  if (!isPhone(p.phone)) return 'invalid_phone';
  if (!Number.isInteger(p.total) || p.total < 1 || p.total > 10000) return 'invalid_total';
  return null;
}

export const getPackages = handler(async ({ db }) => json(db.clientPackages.map(withTotals)), { admin: true });

export const postPackage = handler(
  async ({ db, body, save }) => {
    const p = cleanPackage(body);
    const err = packageError(p);
    if (err) return fail(err);
    const item = { id: newId(), ...p, usage: [], createdAt: new Date().toISOString() };
    db.clientPackages.push(item);
    save();
    return json(withTotals(item), 201);
  },
  { admin: true, mutate: true }
);

export const putPackage = handler(
  async ({ db, body, params, save }) => {
    const item = findPackage(db, params.id);
    if (!item) return fail('not_found', 404);
    const p = cleanPackage(body);
    const err = packageError(p);
    if (err) return fail(err);
    if (p.total < usedOf(item)) return fail('total_below_used');
    Object.assign(item, p);
    save();
    return json(withTotals(item));
  },
  { admin: true, mutate: true }
);

export const deletePackage = handler(
  async ({ db, params, save }) => {
    const before = db.clientPackages.length;
    db.clientPackages = db.clientPackages.filter((x) => x.id !== params.id);
    if (db.clientPackages.length === before) return fail('not_found', 404);
    save();
    return json({ ok: true });
  },
  { admin: true, mutate: true }
);

export const postUsage = handler(
  async ({ db, body, params, save }) => {
    const item = findPackage(db, params.id);
    if (!item) return fail('not_found', 404);
    const qty = Math.round(Number(body.qty));
    const date = str(body.date, 10);
    if (!Number.isInteger(qty) || qty < 1) return fail('invalid_qty');
    if (qty > item.total - usedOf(item)) return fail('exceeds_remaining');
    const entry = { id: newId(), qty, date: isDate(date) ? date : today(db), note: str(body.note, 300), createdAt: new Date().toISOString() };
    item.usage.push(entry);
    save();
    return json({ entry, package: withTotals(item) }, 201);
  },
  { admin: true, mutate: true }
);

export const deleteUsage = handler(
  async ({ db, params, save }) => {
    const item = findPackage(db, params.id);
    if (!item) return fail('not_found', 404);
    const before = item.usage.length;
    item.usage = item.usage.filter((u) => u.id !== params.uid);
    if (item.usage.length === before) return fail('not_found', 404);
    save();
    return json(withTotals(item));
  },
  { admin: true, mutate: true }
);

/* ====================================================================== */
/* Admin: content collections (services, portfolio, testimonials)         */
/* ====================================================================== */
const CATEGORIES = ['doctors', 'lawyers', 'teachers', 'realestate', 'business', 'other'];
const collections = {
  services: (b) => ({
    title: bi(b.title, 150), description: bi(b.description, 1000), price: str(String(b.price ?? ''), 30),
    priceNote: bi(b.priceNote, 100), features: biList(b.features),
    icon: ['reels', 'board', 'combo', 'camera', 'star'].includes(b.icon) ? b.icon : 'reels',
    featured: !!b.featured, visible: b.visible !== false,
  }),
  portfolio: (b) => ({
    title: bi(b.title, 150), category: CATEGORIES.includes(b.category) ? b.category : 'other',
    type: ['image', 'video', 'link'].includes(b.type) ? b.type : 'image',
    url: safeUrl(b.url), thumb: safeUrl(b.thumb), visible: b.visible !== false,
  }),
  testimonials: (b) => ({
    name: str(b.name, 100), role: bi(b.role, 150), text: bi(b.text, 1000),
    rating: Math.min(5, Math.max(1, Number(b.rating) || 5)), visible: b.visible !== false,
  }),
};
const collectionOf = (params) => (Object.hasOwn(collections, params.collection) ? params.collection : null);

export const postItem = handler(
  async ({ db, body, params, save }) => {
    const name = collectionOf(params);
    if (!name) return fail('not_found', 404);
    const item = { id: newId(), ...collections[name](body) };
    db[name].push(item);
    save();
    return json(item, 201);
  },
  { admin: true, mutate: true }
);

export const putItem = handler(
  async ({ db, body, params, save }) => {
    const name = collectionOf(params);
    if (!name) return fail('not_found', 404);
    const i = db[name].findIndex((x) => x.id === params.id);
    if (i < 0) return fail('not_found', 404);
    const old = db[name][i];
    db[name][i] = { id: old.id, ...collections[name](body) };
    for (const k of ['url', 'thumb']) if (old[k] && old[k] !== db[name][i][k]) store.removeUpload(old[k]);
    save();
    return json(db[name][i]);
  },
  { admin: true, mutate: true }
);

export const deleteItem = handler(
  async ({ db, params, save }) => {
    const name = collectionOf(params);
    if (!name) return fail('not_found', 404);
    const item = db[name].find((x) => x.id === params.id);
    if (!item) return fail('not_found', 404);
    db[name] = db[name].filter((x) => x.id !== params.id);
    store.removeUpload(item.url);
    store.removeUpload(item.thumb);
    save();
    return json({ ok: true });
  },
  { admin: true, mutate: true }
);

export const moveItem = handler(
  async ({ db, body, params, save }) => {
    const name = collectionOf(params);
    if (!name) return fail('not_found', 404);
    const list = db[name];
    const i = list.findIndex((x) => x.id === params.id);
    if (i < 0) return fail('not_found', 404);
    const j = body.dir === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
    save();
    return json({ ok: true });
  },
  { admin: true, mutate: true }
);

/* ====================================================================== */
/* Admin: uploads                                                          */
/* ====================================================================== */
const ALLOWED = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime))$/;

export const postUpload = handler(
  async ({ req }) => {
    let form;
    try {
      form = await req.formData();
    } catch {
      return fail('file_too_large', 413);
    }
    const file = form.get('file');
    if (!file || typeof file === 'string') return fail('no_file');
    if (!ALLOWED.test(file.type)) return fail('unsupported_file');
    if (file.size > store.uploadLimitBytes) return fail('file_too_large', 413);
    const url = await store.saveUpload(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    return json({ url, type: file.type.split('/')[0] }, 201);
  },
  { admin: true, body: 'none' }
);

/* ====================================================================== */
/* Admin: backup, export, restore                                          */
/* ====================================================================== */
const download = (body, name, type) =>
  new Response(body, {
    headers: { 'Content-Type': type, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  });

export const getBackup = handler(async ({ db }) => {
  const { auth, ...rest } = db;
  const body = JSON.stringify({ app: 'dodit-studio', version: 1, exportedAt: new Date().toISOString(), data: rest }, null, 2);
  return download(body, `dodit-backup-${today(db)}.json`, 'application/json; charset=utf-8');
}, { admin: true });

/** CSV that opens correctly in Excel (UTF-8 BOM) and can't smuggle in spreadsheet formulas */
function csv(rows) {
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s-]*$/.test(s))) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
const STATUS_AR = { pending: 'في الانتظار', confirmed: 'مؤكد', done: 'تم التصوير', cancelled: 'ملغي' };
const CAT_AR = { doctors: 'دكاترة', lawyers: 'محامين', teachers: 'مدرسين', realestate: 'عقارات', business: 'أصحاب أعمال', other: 'أخرى' };
// An invisible left-to-right mark keeps Excel from turning 0101… into a number (and dropping the 0)
const asText = (v) => (v ? '‎' + v : '');

export const getExport = handler(async ({ db, params }) => {
  if (params.file === 'bookings.csv') {
    const rows = [['رقم الحجز', 'اليوم', 'الساعة', 'الاسم', 'الموبايل', 'الخدمة', 'من باقة', 'المجال', 'الحالة', 'ملاحظات', 'المصدر', 'وقت الطلب']];
    for (const b of [...db.bookings].sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time))) {
      const p = b.packageId ? findPackage(db, b.packageId) : null;
      rows.push([
        b.ref, b.date, b.time, b.name, asText(b.phone), (b.serviceTitle && b.serviceTitle.ar) || '', p ? p.title || p.unit : '',
        CAT_AR[b.category] || b.category, STATUS_AR[b.status] || b.status, b.notes, b.source === 'admin' ? 'يدوي' : 'الموقع', b.createdAt,
      ]);
    }
    return download(csv(rows), `dodit-bookings-${today(db)}.csv`, 'text/csv; charset=utf-8');
  }
  if (params.file === 'packages.csv') {
    const rows = [['اسم العميل', 'الموبايل', 'الباقة', 'الوحدة', 'العدد الكلي', 'المستهلك', 'المتبقي', 'تاريخ البداية', 'تنتهي يوم', 'ملاحظات', 'سجل الاستهلاك']];
    for (const p of db.clientPackages) {
      const used = usedOf(p);
      const log = p.usage.map((u) => `${u.date}: ${u.qty}${u.note ? ' (' + u.note + ')' : ''}`).join(' | ');
      rows.push([p.name, asText(p.phone), p.title, p.unit, p.total, used, p.total - used, p.startDate, p.expiryDate, p.notes, log]);
    }
    return download(csv(rows), `dodit-packages-${today(db)}.csv`, 'text/csv; charset=utf-8');
  }
  return fail('not_found', 404);
}, { admin: true });

export const postRestore = handler(
  async ({ db, body: b, save }) => {
    const data = b.app === 'dodit-studio' && b.data ? b.data : null;
    const lists = ['services', 'portfolio', 'testimonials', 'bookings', 'clientPackages'];
    if (!data || typeof data.settings !== 'object' || typeof data.schedule !== 'object' || !lists.every((k) => Array.isArray(data[k] || [])))
      return fail('invalid_backup');
    // keep a copy of what is being replaced, just in case
    const { auth, ...current } = db;
    await store.snapshot('before-restore-' + Date.now(), JSON.stringify(current));
    const defaults = defaultData();
    const restored = {
      ...defaults,
      ...Object.fromEntries(lists.map((k) => [k, data[k] || []])),
      settings: { ...defaults.settings, ...data.settings, social: { ...defaults.settings.social, ...(data.settings.social || {}) } },
      schedule: { ...defaults.schedule, ...data.schedule },
      auth, // the password is never part of a backup
    };
    for (const k of Object.keys(db)) delete db[k];
    Object.assign(db, restored);
    save();
    return json({ ok: true, counts: Object.fromEntries(lists.map((k) => [k, db[k].length])) });
  },
  { admin: true, mutate: true }
);
