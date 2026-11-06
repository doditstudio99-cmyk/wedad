// Which back-end the site talks to.
//  - Empty (default): the Next.js API routes of this same site (/api/...) — local, Vercel, Render.
//  - The free static version (Netlify / GitHub Pages) gets the Google Apps Script URL written here
//    at build time from google-sheets/web-app-url.txt (see netlify.toml and .github/workflows/pages.yml).
window.DODIT_CONFIG = {
  apiUrl: '',
};
