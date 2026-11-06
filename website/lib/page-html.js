// The site and admin pages keep their markup in public/index.html and public/admin/index.html,
// so the same files also work as a plain static site (the free Google Sheets version on Netlify
// or GitHub Pages). Next.js reads them at build time and renders the same markup.
import fs from 'node:fs';
import path from 'node:path';

function read(file) {
  // read at build time only; not part of the server bundle
  return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), file), 'utf8');
}

/** The <body> markup without its <script src> tags (the page loads those itself, in order) */
export function pageBody(file) {
  const html = read(file);
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  return body.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>\s*/g, '').trim();
}

/** The inline <script> in <head> (applies the saved light/dark theme before paint) */
export function headInlineScript(file) {
  const head = read(file).split('</head>')[0];
  const m = head.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1].trim() : '';
}

/** The <script src> files at the end of <body>, as absolute paths */
export function pageScripts(file) {
  const html = read(file);
  const body = html.slice(html.indexOf('<body>'));
  return [...body.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map((m) => '/' + m[1].replace(/^\//, ''));
}
