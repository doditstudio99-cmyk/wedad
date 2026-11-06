import { headInlineScript } from '@/lib/page-html.js';

export const metadata = {
  title: 'Dodit Studio | دوديت ستوديو',
  description: 'Dodit Studio — تصوير ريلز وفيديوهات سمارت بورد للدكاترة والمحامين والمدرسين وأصحاب العقارات.',
  icons: { icon: '/favicon.svg' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#FF6B00' };

const themeScript = headInlineScript('public/index.html');

export default function SiteLayout({ children }) {
  return (
    // The page's own script changes lang/dir (language switch) and data-theme (dark mode)
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
        <link rel="stylesheet" href="/css/style.css" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
