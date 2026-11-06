// Writes website/public/js/config.js for the free static version, pointing it at the Google Apps Script web app.
// Used by netlify.toml and the GitHub Pages workflow. Usage: node google-sheets/write-config.cjs
const fs = require('fs');
const path = require('path');
const url = fs.readFileSync(path.join(__dirname, 'web-app-url.txt'), 'utf8').trim();
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) throw new Error('web-app-url.txt does not hold an Apps Script /exec URL');
fs.writeFileSync(path.join(__dirname, '..', 'website', 'public', 'js', 'config.js'), `window.DODIT_CONFIG = { apiUrl: ${JSON.stringify(url)} };\n`);
console.log('config.js → ' + url);
