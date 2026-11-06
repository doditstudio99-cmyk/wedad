export const metadata = {
  title: 'لوحة التحكم | Dodit Studio',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export const viewport = { width: 'device-width', initialScale: 1 };

export default function AdminLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" />
        <link rel="stylesheet" href="/admin/admin.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
