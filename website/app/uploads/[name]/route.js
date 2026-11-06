// Serves files uploaded from the admin panel when they are kept on disk (local, Render, VPS).
// On Vercel uploads live in Vercel Blob and have their own https:// address instead.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { store } from '@/lib/store.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

export async function GET(req, { params }) {
  const { name } = await params;
  if (store.kind !== 'file' || !/^[\w.-]+$/.test(name)) return new Response('Not found', { status: 404 });
  const file = path.join(store.uploadDir, path.basename(name));
  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.get('range');
  // Videos need byte ranges so browsers can seek
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? Number(m[1]) : 0;
    const end = m && m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
      status: 206,
      headers: {
        'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), {
    headers: {
      'Content-Type': type, 'Content-Length': String(stat.size), 'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800', 'X-Content-Type-Options': 'nosniff',
    },
  });
}
