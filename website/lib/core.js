// Shared helpers for the API routes: validation, dates, data loading, admin auth and the route wrapper.
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { defaultData } from './seed.js';
import { store, StoreError } from './store.js';

export const COOKIE = 'dodit_admin';
export const SESSION_HOURS = 24 * 7;

/* ---------- small helpers ---------- */
export const newId = () => crypto.randomBytes(8).toString('hex');
export const newRef = () => 'DS-' + crypto.randomBytes(3).toString('hex').toUpperCase();
export const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const bi = (v, max) => ({ ar: str(v && v.ar, max), en: str(v && v.en, max) });
export const biList = (v) => ({
  ar: Array.isArray(v && v.ar) ? v.ar.map((x) => str(x, 200)).filter(Boolean).slice(0, 20) : [],
  en: Array.isArray(v && v.en) ? v.en.map((x) => str(x, 200)).filter(Boolean).slice(0, 20) : [],
});
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const isPhone = (s) => /^\+?[\d\s-]{7,20}$/.test(s);
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

export function safeUrl(u) {
  const s = str(u, 1000);
  if (!s) return '';
  if (s.startsWith('/uploads/')) return s;
  try {
    const parsed = new URL(s);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? s : '';
  } catch {
    return '';
  }
}

export function nowInTz(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
export const today = (db) => nowInTz(db.settings.timezone).date;

export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** { open, reason, slots: [{time, status: 'available'|'booked'|'past'}] } */
export function slotsFor(db, date) {
  const s = db.schedule;
  const now = nowInTz(db.settings.timezone);
  if (date < now.date) return { open: false, reason: 'past', slots: [] };
  if (date > addDays(now.date, Number(s.maxDaysAhead) || 60)) return { open: false, reason: 'too_far', slots: [] };
  if ((s.closedDates || []).includes(date)) return { open: false, reason: 'closed', slots: [] };
  const day = s.days[new Date(date + 'T00:00:00Z').getUTCDay()];
  if (!day || !day.open || !isTime(day.start) || !isTime(day.end)) return { open: false, reason: 'closed', slots: [] };

  const step = Math.max(15, Number(s.slotMinutes) || 60);
  const start = toMin(day.start);
  let end = toMin(day.end);
  if (end <= start) end += 24 * 60; // working past midnight
  const taken = new Set(db.bookings.filter((b) => b.date === date && b.status !== 'cancelled').map((b) => b.time));
  const minNotice = Number(s.minNoticeMinutes) || 0;
  const slots = [];
  for (let m = start; m + step <= end && m < 24 * 60; m += step) {
    const time = toTime(m);
    let status = 'available';
    if (taken.has(time)) status = 'booked';
    else if (date === now.date && m < now.minutes + minNotice) status = 'past';
    slots.push({ time, status });
  }
  return { open: true, slots };
}

/* ---------- client packages ---------- */
export const usedOf = (p) => p.usage.reduce((sum, u) => sum + u.qty, 0);
export const withTotals = (p) => ({ ...p, used: usedOf(p), remaining: p.total - usedOf(p) });
export const findPackage = (db, id) => db.clientPackages.find((x) => x.id === id);

/** 01012345678, +20 101 234 5678 and 00201012345678 all become 01012345678 */
export function normPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return d;
}
/** The client's package that still has balance and hasn't expired (oldest first, so it gets used up first) */
export function activePackageFor(db, phone) {
  const t = today(db);
  const n = normPhone(phone);
  return (
    db.clientPackages
      .filter((p) => normPhone(p.phone) === n && p.total - usedOf(p) > 0 && !(p.expiryDate && p.expiryDate < t))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0] || null
  );
}
export const packageTitle = (pkg) => ({ ar: 'من رصيد الباقة: ' + (pkg.title || pkg.unit), en: 'From package: ' + (pkg.title || pkg.unit) });

/* ---------- password & sessions ---------- */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString('hex') };
}
export function checkPassword(db, password) {
  const { hash } = hashPassword(password, db.auth.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(db.auth.hash));
}
function sign(db, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', db.auth.secret).update(body).digest('base64url');
}
function verify(db, token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', db.auth.secret).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.v !== db.auth.hash.slice(0, 12)) return null; // invalidated by a password change
    return payload;
  } catch {
    return null;
  }
}
export function sessionCookie(db, req) {
  const token = sign(db, { exp: Date.now() + SESSION_HOURS * 3600 * 1000, v: db.auth.hash.slice(0, 12) });
  const https = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${https ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
const isAdmin = (db, req) => !!verify(db, req.cookies.get(COOKIE)?.value);

/* ---------- simple in-memory rate limiter (per server instance) ---------- */
const hits = (globalThis.__doditHits ||= new Map());
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length <= max;
}
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

/* ---------- loading the data ---------- */
function migrate(db) {
  const defaults = defaultData();
  for (const key of Object.keys(defaults)) if (db[key] === undefined) db[key] = defaults[key];
  db.settings = { ...defaults.settings, ...db.settings, social: { ...defaults.settings.social, ...(db.settings && db.settings.social) } };
  db.schedule = { ...defaults.schedule, ...db.schedule };
  return db;
}

function newAuth() {
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = crypto.randomBytes(6).toString('base64url');
    console.log('\n==============================================');
    console.log('  No ADMIN_PASSWORD set. Generated admin password:');
    console.log('  ' + password);
    console.log('  Change it from the admin panel → Settings.');
    console.log('==============================================\n');
  }
  return { ...hashPassword(password), secret: crypto.randomBytes(32).toString('hex') };
}

/** Reads the data; creates it on the very first run. Returns [db, changed] */
async function load() {
  let db = await store.read();
  let changed = false;
  if (!db) {
    // first run: create it once, even if several requests arrive together
    db = await store.lock(async () => {
      const again = await store.read();
      if (again) return again;
      const fresh = { ...defaultData(), auth: newAuth() };
      await store.write(JSON.stringify(fresh));
      return fresh;
    });
  }
  migrate(db);
  if (!db.auth || !db.auth.hash) {
    db.auth = newAuth();
    changed = true;
  }
  // RESET_ADMIN_PASSWORD=true + ADMIN_PASSWORD lets the owner reset a forgotten password
  if (process.env.RESET_ADMIN_PASSWORD === 'true' && process.env.ADMIN_PASSWORD && !checkPassword(db, process.env.ADMIN_PASSWORD)) {
    db.auth = { ...db.auth, ...hashPassword(process.env.ADMIN_PASSWORD) };
    changed = true;
  }
  return [db, changed];
}

/* ---------- responses ---------- */
export const json = (body, status = 200, headers = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export const fail = (error, status = 400) => json({ error }, status);

/**
 * Wraps a route: loads the data, checks the admin session, parses the body and saves changes.
 * Changing routes run one at a time (a lock across all server instances), so two people
 * can never take the same slot.
 *
 *   handler(async ({ db, body, params, req, save }) => json(...), { admin: true, mutate: true })
 */
export function handler(fn, { admin = false, mutate = false, body: parseBody = 'json' } = {}) {
  return async (req, ctx) => {
    const params = (ctx && ctx.params ? await ctx.params : {}) || {};
    const run = async () => {
      const [db, changed] = await load();
      let dirty = changed;
      if (admin && !isAdmin(db, req)) return fail('unauthorized', 401);
      let body = {};
      if (parseBody === 'json' && req.method !== 'GET' && req.method !== 'DELETE') {
        const text = await req.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            return fail('invalid_json');
          }
        }
      }
      const res = await fn({ req, db, body, params, save: () => (dirty = true) });
      if (dirty) await store.write(JSON.stringify(db));
      return res;
    };
    try {
      return mutate ? await store.lock(run) : await run();
    } catch (err) {
      if (err instanceof StoreError) return fail(err.code, err.status);
      console.error(err);
      return fail('server_error', 500);
    }
  };
}
