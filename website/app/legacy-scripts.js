'use client';
// Loads the page's scripts one after another once the markup is on the page.
import { useEffect } from 'react';

export default function LegacyScripts({ srcs }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of srcs) {
        if (cancelled) return;
        if (document.querySelector(`script[data-page-script="${src}"]`)) continue; // already loaded
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.dataset.pageScript = src;
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });
      }
    })().catch((err) => console.error('Could not load page script', err));
    return () => {
      cancelled = true;
    };
  }, [srcs]);
  return null;
}
