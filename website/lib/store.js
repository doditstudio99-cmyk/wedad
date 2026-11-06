// Where the site's data and uploaded files live.
//
//  - Files on disk (local, Render, VPS, Docker): DATA_DIR/db.json and DATA_DIR/uploads.
//  - Vercel (serverless, no lasting disk): Redis for the data (Upstash REST env vars or REDIS_URL)
//    and Vercel Blob for uploaded images.
//
// Every store offers the same methods: read, write, lock, snapshot, saveUpload, removeUpload.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const KEEP_DAILY = 14;
const DB_KEY = 'dodit:db';
const LOCK_KEY = 'dodit:lock';
const BACKUP_PREFIX = 'dodit:backup:';

export class StoreError extends Error {
  constructor(code, status = 500) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const day = () => new Date().toISOString().slice(0, 10);
const uploadName = (originalName) => {
  const ext = path.extname(originalName || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6);
  return Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
};

/* ------------------------------------------------------------------ */
/* Files on disk                                                       */
/* ------------------------------------------------------------------ */
function fileStore() {
  // runtime data folder, not part of the server bundle
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || path.join(process.cwd(), 'data'));
  const dbFile = path.join(dir, 'db.json');
  const uploadDir = path.join(dir, 'uploads');
  const backupDir = path.join(dir, 'backups');
  let queue = Promise.resolve();

  function dailyBackup() {
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      const file = path.join(backupDir, `daily-${day()}.json`);
      if (!fs.existsSync(file)) fs.copyFileSync(dbFile, file);
      const daily = fs.readdirSync(backupDir).filter((f) => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      for (const old of daily.slice(0, Math.max(0, daily.length - KEEP_DAILY))) fs.rmSync(path.join(backupDir, old), { force: true });
    } catch (err) {
      console.warn('daily backup failed', err.message);
    }
  }

  return {
    kind: 'file',
    uploadLimitBytes: 100 * 1024 * 1024,
    uploadDir,
    async read() {
      try {
        return JSON.parse(await fs.promises.readFile(dbFile, 'utf8'));
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async write(json) {
      await fs.promises.mkdir(dir, { recursive: true });
      const tmp = dbFile + '.' + process.pid + '.tmp';
      await fs.promises.writeFile(tmp, json);
      await fs.promises.rename(tmp, dbFile);
      dailyBackup();
    },
    /** One change at a time inside this server process */
    lock(fn) {
      const run = queue.then(fn, fn);
      queue = run.catch(() => {});
      return run;
    },
    async snapshot(name, json) {
      await fs.promises.mkdir(backupDir, { recursive: true });
      await fs.promises.writeFile(path.join(backupDir, name + '.json'), json);
    },
    async saveUpload(buffer, originalName) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const name = uploadName(originalName);
      await fs.promises.writeFile(path.join(uploadDir, name), buffer);
      return '/uploads/' + name;
    },
    removeUpload(url) {
      if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
      const file = path.join(uploadDir, path.basename(url));
      if (file.startsWith(uploadDir)) fs.rm(file, { force: true }, () => {});
    },
  };
}

/* ------------------------------------------------------------------ */
/* Redis (+ Vercel Blob for uploads)                                    */
/* ------------------------------------------------------------------ */
const restUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const restToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const hasBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** A tiny common interface over the Upstash REST client and node-redis */
async function redisClient() {
  if (restUrl() && restToken()) {
    const { Redis } = await import('@upstash/redis');
    const r = new Redis({ url: restUrl(), token: restToken(), automaticDeserialization: false });
    return {
      get: (k) => r.get(k),
      set: (k, v, opts = {}) => r.set(k, v, opts), // opts: { nx, px, ex }
      eval: (script, keys, args) => r.eval(script, keys, args),
    };
  }
  const { createClient } = await import('redis');
  globalThis.__doditRedis ||= createClient({ url: process.env.REDIS_URL }).on('error', (e) => console.error('redis', e.message));
  const c = globalThis.__doditRedis;
  if (!c.isOpen) await c.connect();
  return {
    get: (k) => c.get(k),
    set: (k, v, opts = {}) =>
      c.set(k, v, { ...(opts.nx ? { NX: true } : {}), ...(opts.px ? { PX: opts.px } : {}), ...(opts.ex ? { EX: opts.ex } : {}) }),
    eval: (script, keys, args) => c.eval(script, { keys, arguments: args }),
  };
}

const RELEASE_LOCK = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function redisStore() {
  let client;
  const r = async () => (client ||= await redisClient());
  return {
    kind: 'redis',
    // Vercel Functions accept at most 4.5 MB per request
    uploadLimitBytes: 4 * 1024 * 1024,
    async read() {
      const v = await (await r()).get(DB_KEY);
      return v ? JSON.parse(v) : null;
    },
    async write(json) {
      const c = await r();
      await c.set(DB_KEY, json);
      await c.set(BACKUP_PREFIX + 'daily-' + day(), json, { nx: true, ex: (KEEP_DAILY + 1) * 86400 });
    },
    /** One change at a time across every serverless instance (so a slot can't be booked twice) */
    async lock(fn) {
      const c = await r();
      const token = crypto.randomBytes(12).toString('hex');
      const deadline = Date.now() + 10000;
      while (!(await c.set(LOCK_KEY, token, { nx: true, px: 15000 }))) {
        if (Date.now() > deadline) throw new StoreError('busy', 503);
        await sleep(60 + Math.random() * 90);
      }
      try {
        return await fn();
      } finally {
        await c.eval(RELEASE_LOCK, [LOCK_KEY], [token]).catch(() => {});
      }
    },
    async snapshot(name, json) {
      await (await r()).set(BACKUP_PREFIX + name, json, { ex: 60 * 86400 });
    },
    async saveUpload(buffer, originalName, contentType) {
      if (!hasBlob()) throw new StoreError('uploads_not_configured', 400);
      const { put } = await import('@vercel/blob');
      const blob = await put('uploads/' + uploadName(originalName), buffer, { access: 'public', contentType });
      return blob.url;
    },
    removeUpload(url) {
      if (typeof url !== 'string' || !hasBlob() || !/\.blob\.vercel-storage\.com\//.test(url)) return;
      import('@vercel/blob').then(({ del }) => del(url)).catch((e) => console.warn('blob delete failed', e.message));
    },
  };
}

/* ------------------------------------------------------------------ */
function pick() {
  if ((restUrl() && restToken()) || process.env.REDIS_URL) return redisStore();
  if (process.env.VERCEL) {
    // Vercel has no lasting disk: refuse instead of silently losing bookings
    const fail = async () => {
      throw new StoreError('storage_not_configured', 500);
    };
    return { kind: 'none', uploadLimitBytes: 0, read: fail, write: fail, lock: fail, snapshot: fail, saveUpload: fail, removeUpload() {} };
  }
  return fileStore();
}

// One store per server process (kept across hot reloads in development)
export const store = (globalThis.__doditStore ||= pick());
