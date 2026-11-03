/*
 * Dodit Studio — website server
 * - Serves the public bilingual site (public/) and the admin panel (public/admin/)
 * - Stores everything in a JSON file under DATA_DIR (default ./data)
 * - Online booking with working hours, closed days and busy-slot detection
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { defaultData } = require('./seed');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const COOKIE = 'dodit_admin';
const SESSION_HOURS = 24 * 7;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */
let db;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    db = defaultData();
  }
  // fill in anything missing (e.g. after an upgrade)
  const defaults = defaultData();
  for (const key of Object.keys(defaults)) if (db[key] === undefined) db[key] = defaults[key];
  db.settings = { ...defaults.settings, ...db.settings };
  db.schedule = { ...defaults.schedule, ...db.schedule };

  if (!db.auth || !db.auth.hash) {
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = crypto.randomBytes(6).toString('base64url');
      console.log('\n==============================================');
      console.log('  No ADMIN_PASSWORD set. Generated admin password:');
      console.log('  ' + password);
      console.log('  Change it from the admin panel → Settings.');
      console.log('==============================================\n');
    }
    db.auth = { ...hashPassword(password), secret: crypto.randomBytes(32).toString('hex') };
  }
  // Allow resetting the password from the environment at any time
  if (process.env.ADMIN_PASSWORD && process.env.RESET_ADMIN_PASSWORD === 'true') {
    db.auth = { ...db.auth, ...hashPassword(process.env.ADMIN_PASSWORD) };
  }
  saveDb();
}

function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

loadDb();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const newId = () => crypto.randomBytes(8).toString('hex');
const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bi = (v, max) => ({ ar: str(v && v.ar, max), en: str(v && v.en, max) });
const biList = (v) => ({
  ar: Array.isArray(v && v.ar) ? v.ar.map((x) => str(x, 200)).filter(Boolean).slice(0, 20) : [],
  en: Array.isArray(v && v.en) ? v.en.map((x) => str(x, 200)).filter(Boolean).slice(0, 20) : [],
});
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const safeUrl = (u) => {
  const s = str(u, 1000);
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s;
  try {
    const parsed = new URL(s);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? s : '';
  } catch {
    return '';
  }
};

function nowInTz(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Returns { open, reason, slots: [{time, status: 'available'|'booked'|'past'}] } */
function slotsFor(date) {
  const s = db.schedule;
  const tz = db.settings.timezone || 'Africa/Cairo';
  const now = nowInTz(tz);
  if (date < now.date) return { open: false, reason: 'past', slots: [] };
  if (date > addDays(now.date, Number(s.maxDaysAhead) || 60)) return { open: false, reason: 'too_far', slots: [] };
  if ((s.closedDates || []).includes(date)) return { open: false, reason: 'closed', slots: [] };
  const day = s.days[new Date(date + 'T00:00:00Z').getUTCDay()];
  if (!day || !day.open || !isTime(day.start) || !isTime(day.end)) return { open: false, reason: 'closed', slots: [] };

  const step = Math.max(15, Number(s.slotMinutes) || 60);
  let start = toMin(day.start);
  let end = toMin(day.end);
  if (end <= start) end += 24 * 60; // working past midnight
  const taken = new Set(
    db.bookings.filter((b) => b.date === date && b.status !== 'cancelled').map((b) => b.time)
  );
  const minNotice = Number(s.minNoticeMinutes) || 0;
  const slots = [];
  for (let m = start; m + step <= end; m += step) {
    if (m >= 24 * 60) break; // slots after midnight belong to the next day
    const time = toTime(m);
    let status = 'available';
    if (taken.has(time)) status = 'booked';
    else if (date === now.date && m < now.minutes + minNotice) status = 'past';
    slots.push({ time, status });
  }
  return { open: true, slots };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', db.auth.secret).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', db.auth.secret).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.v !== db.auth.hash.slice(0, 12)) return null; // invalidated by password change
    return payload;
  } catch {
    return null;
  }
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function requireAdmin(req, res, next) {
  if (verify(cookies(req)[COOKIE])) return next();
  res.status(401).json({ error: 'unauthorized' });
}

function checkPassword(password) {
  const { hash } = hashPassword(password, db.auth.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(db.auth.hash));
}

/* Simple in-memory rate limiter */
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length <= max;
}
setInterval(() => hits.clear(), 6 * 60 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// The Node server is its own back-end, so the Google Sheets API URL is never used here
app.get('/js/config.js', (req, res) => {
  res.type('application/javascript').send("window.DODIT_CONFIG = { apiUrl: '' };\n");
});
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ---------- public API ---------- */
app.get('/api/site', (req, res) => {
  res.json({
    settings: db.settings,
    services: db.services.filter((s) => s.visible !== false),
    portfolio: db.portfolio.filter((p) => p.visible !== false),
    testimonials: db.testimonials.filter((t) => t.visible !== false),
    booking: {
      slotMinutes: db.schedule.slotMinutes,
      maxDaysAhead: db.schedule.maxDaysAhead,
      today: nowInTz(db.settings.timezone || 'Africa/Cairo').date,
      days: db.schedule.days,
      closedDates: db.schedule.closedDates,
    },
  });
});

app.get('/api/slots', (req, res) => {
  const date = str(req.query.date, 10);
  if (!isDate(date)) return res.status(400).json({ error: 'invalid_date' });
  res.json({ date, ...slotsFor(date) });
});

app.post('/api/bookings', (req, res) => {
  if (!rateLimit('book:' + req.ip, 8, 60 * 60 * 1000)) return res.status(429).json({ error: 'too_many_requests' });
  const b = req.body || {};
  if (str(b.website)) return res.status(400).json({ error: 'invalid' }); // honeypot
  const date = str(b.date, 10);
  const time = str(b.time, 5);
  const name = str(b.name, 100);
  const phone = str(b.phone, 30);
  const notes = str(b.notes, 1000);
  const category = str(b.category, 50);
  const service = db.services.find((s) => s.id === b.serviceId);

  if (!isDate(date) || !isTime(time)) return res.status(400).json({ error: 'invalid_slot' });
  if (name.length < 2) return res.status(400).json({ error: 'invalid_name' });
  if (!/^\+?[\d\s-]{7,20}$/.test(phone)) return res.status(400).json({ error: 'invalid_phone' });
  if (!service) return res.status(400).json({ error: 'invalid_service' });

  // Checking and writing happen in the same synchronous tick, so two people can't take the same slot.
  const slot = slotsFor(date).slots.find((s) => s.time === time);
  if (!slot) return res.status(400).json({ error: 'invalid_slot' });
  if (slot.status !== 'available') return res.status(409).json({ error: 'slot_taken' });

  const booking = {
    id: newId(),
    ref: 'DS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    date,
    time,
    name,
    phone,
    notes,
    category,
    serviceId: service.id,
    serviceTitle: service.title,
    status: 'pending',
    source: 'website',
    createdAt: new Date().toISOString(),
  };
  db.bookings.push(booking);
  saveDb();
  res.status(201).json({ ok: true, ref: booking.ref, date, time });
});

/* ---------- admin auth ---------- */
app.post('/api/admin/login', (req, res) => {
  if (!rateLimit('login:' + req.ip, 10, 15 * 60 * 1000)) return res.status(429).json({ error: 'too_many_requests' });
  if (!checkPassword(str(req.body && req.body.password, 200))) return res.status(401).json({ error: 'wrong_password' });
  const token = sign({ exp: Date.now() + SESSION_HOURS * 3600 * 1000, v: db.auth.hash.slice(0, 12) });
  const secure = req.secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure}`
  );
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.use('/api/admin', requireAdmin);

app.get('/api/admin/me', (req, res) => res.json({ ok: true }));

app.post('/api/admin/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(str(current, 200))) return res.status(400).json({ error: 'wrong_password' });
  if (str(next, 200).length < 6) return res.status(400).json({ error: 'too_short' });
  db.auth = { ...db.auth, ...hashPassword(str(next, 200)) };
  saveDb();
  const token = sign({ exp: Date.now() + SESSION_HOURS * 3600 * 1000, v: db.auth.hash.slice(0, 12) });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`);
  res.json({ ok: true });
});

/* ---------- admin: settings & schedule ---------- */
app.get('/api/admin/data', (req, res) => {
  const { auth, ...rest } = db;
  res.json(rest);
});

app.put('/api/admin/settings', (req, res) => {
  const b = req.body || {};
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
    social,
  };
  try {
    nowInTz(db.settings.timezone);
  } catch {
    db.settings.timezone = 'Africa/Cairo';
  }
  saveDb();
  res.json(db.settings);
});

app.put('/api/admin/schedule', (req, res) => {
  const b = req.body || {};
  const days = {};
  for (let i = 0; i < 7; i++) {
    const d = (b.days && b.days[i]) || {};
    days[i] = {
      open: !!d.open,
      start: isTime(d.start) ? d.start : '12:00',
      end: isTime(d.end) ? d.end : '22:00',
    };
  }
  db.schedule = {
    slotMinutes: Math.min(480, Math.max(15, Number(b.slotMinutes) || 60)),
    maxDaysAhead: Math.min(365, Math.max(1, Number(b.maxDaysAhead) || 60)),
    minNoticeMinutes: Math.min(10080, Math.max(0, Number(b.minNoticeMinutes) || 0)),
    days,
    closedDates: [...new Set((b.closedDates || []).filter(isDate))].sort(),
  };
  saveDb();
  res.json(db.schedule);
});

/* ---------- admin: bookings ---------- */
app.get('/api/admin/slots', (req, res) => {
  const date = str(req.query.date, 10);
  if (!isDate(date)) return res.status(400).json({ error: 'invalid_date' });
  res.json({ date, ...slotsFor(date) });
});

app.post('/api/admin/bookings', (req, res) => {
  // Manual booking (phone/WhatsApp) or blocking a slot
  const b = req.body || {};
  const date = str(b.date, 10);
  const time = str(b.time, 5);
  if (!isDate(date) || !isTime(time)) return res.status(400).json({ error: 'invalid_slot' });
  if (db.bookings.some((x) => x.date === date && x.time === time && x.status !== 'cancelled'))
    return res.status(409).json({ error: 'slot_taken' });
  const service = db.services.find((s) => s.id === b.serviceId);
  const booking = {
    id: newId(),
    ref: 'DS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    date,
    time,
    name: str(b.name, 100) || '—',
    phone: str(b.phone, 30),
    notes: str(b.notes, 1000),
    category: str(b.category, 50),
    serviceId: service ? service.id : '',
    serviceTitle: service ? service.title : { ar: '', en: '' },
    status: 'confirmed',
    source: 'admin',
    createdAt: new Date().toISOString(),
  };
  db.bookings.push(booking);
  saveDb();
  res.status(201).json(booking);
});

app.patch('/api/admin/bookings/:id', (req, res) => {
  const booking = db.bookings.find((x) => x.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'not_found' });
  const status = str(req.body && req.body.status, 20);
  if (!['pending', 'confirmed', 'cancelled', 'done'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
  if (
    booking.status === 'cancelled' &&
    status !== 'cancelled' &&
    db.bookings.some((x) => x.id !== booking.id && x.date === booking.date && x.time === booking.time && x.status !== 'cancelled')
  )
    return res.status(409).json({ error: 'slot_taken' });
  booking.status = status;
  saveDb();
  res.json(booking);
});

app.delete('/api/admin/bookings/:id', (req, res) => {
  const before = db.bookings.length;
  db.bookings = db.bookings.filter((x) => x.id !== req.params.id);
  if (db.bookings.length === before) return res.status(404).json({ error: 'not_found' });
  saveDb();
  res.json({ ok: true });
});

/* ---------- admin: content collections ---------- */
const CATEGORIES = ['doctors', 'lawyers', 'teachers', 'realestate', 'business', 'other'];
const collections = {
  services: (b) => ({
    title: bi(b.title, 150),
    description: bi(b.description, 1000),
    price: str(String(b.price ?? ''), 30),
    priceNote: bi(b.priceNote, 100),
    features: biList(b.features),
    icon: ['reels', 'board', 'combo', 'camera', 'star'].includes(b.icon) ? b.icon : 'reels',
    featured: !!b.featured,
    visible: b.visible !== false,
  }),
  portfolio: (b) => ({
    title: bi(b.title, 150),
    category: CATEGORIES.includes(b.category) ? b.category : 'other',
    type: ['image', 'video', 'link'].includes(b.type) ? b.type : 'image',
    url: safeUrl(b.url),
    thumb: safeUrl(b.thumb),
    visible: b.visible !== false,
  }),
  testimonials: (b) => ({
    name: str(b.name, 100),
    role: bi(b.role, 150),
    text: bi(b.text, 1000),
    rating: Math.min(5, Math.max(1, Number(b.rating) || 5)),
    visible: b.visible !== false,
  }),
};

function removeUpload(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  if (file.startsWith(UPLOAD_DIR)) fs.rm(file, { force: true }, () => {});
}

for (const [name, clean] of Object.entries(collections)) {
  app.post(`/api/admin/${name}`, (req, res) => {
    const item = { id: newId(), ...clean(req.body || {}) };
    db[name].push(item);
    saveDb();
    res.status(201).json(item);
  });
  app.put(`/api/admin/${name}/:id`, (req, res) => {
    const i = db[name].findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not_found' });
    const old = db[name][i];
    db[name][i] = { id: old.id, ...clean(req.body || {}) };
    for (const k of ['url', 'thumb']) if (old[k] && old[k] !== db[name][i][k]) removeUpload(old[k]);
    saveDb();
    res.json(db[name][i]);
  });
  app.delete(`/api/admin/${name}/:id`, (req, res) => {
    const item = db[name].find((x) => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    db[name] = db[name].filter((x) => x.id !== req.params.id);
    removeUpload(item.url);
    removeUpload(item.thumb);
    saveDb();
    res.json({ ok: true });
  });
  app.post(`/api/admin/${name}/:id/move`, (req, res) => {
    const list = db[name];
    const i = list.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'not_found' });
    const j = req.body && req.body.dir === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
    saveDb();
    res.json({ ok: true });
  });
}

/* ---------- admin: uploads ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6);
      cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime))$/.test(file.mimetype);
    cb(ok ? null : new Error('unsupported_file'), ok);
  },
});

app.post('/api/admin/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : err.message });
    if (!req.file) return res.status(400).json({ error: 'no_file' });
    res.status(201).json({ url: '/uploads/' + req.file.filename, type: req.file.mimetype.split('/')[0] });
  });
});

/* ---------- fallbacks ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => {
  console.log(`Dodit Studio running on http://localhost:${PORT}`);
  console.log(`Admin panel:          http://localhost:${PORT}/admin`);
});
