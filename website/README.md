# Dodit Studio — موقع الاستوديو (Next.js)

موقع كامل لاستوديو تصوير الريلز والسمارت بورد: عربي وإنجليزي، ووضع غامق، وحجز مواعيد أونلاين، وباقات العملاء، ولوحة تحكم بتعدّلي منها كل حاجة.
المشروع **Next.js (App Router)**: الصفحات والـ API في نفس المشروع، من غير سيرفر منفصل.

## المميزات
- **الموقع:** الرئيسية، والمجالات، ومن نحن، والخدمات والأسعار، ومعرض الأعمال، وآراء العملاء، والحجز، والتواصل (واتساب وسوشيال وخريطة). وفيه زرار عربي ⇄ English، وزرار فاتح ⇄ غامق.
- **الحجز:** المواعيد المحجوزة بتظهر **"محجوز"**، ومستحيل نفس المعاد يتحجز مرتين، حتى على Vercel مع أكتر من نسخة شغالة في نفس الوقت. وفيه كمان **حجز من رصيد الباقة**.
- **لوحة التحكم `/admin`:** الحجوزات، وباقات العملاء (الاستهلاك ورسالة واتساب)، ومواعيد العمل، والخدمات، والأعمال، والآراء، والإعدادات، والنسخة الاحتياطية (تحميل JSON، وExcel، واسترجاع).

## تنظيم المشروع
```
website/
  app/
    (site)/            ← الصفحة الرئيسية /
    (admin)/admin/     ← لوحة التحكم /admin
    api/**/route.js    ← كل الـ API (Route Handlers)
    uploads/[name]/    ← عرض الصور المرفوعة لما تكون محفوظة على الديسك
  lib/
    endpoints.js       ← منطق كل endpoint
    core.js            ← التحقق، والمواعيد، وتسجيل الدخول، والـ wrapper اللي بيحمّل ويحفظ البيانات تحت قفل
    store.js           ← التخزين: ملفات على الديسك، أو Redis + Vercel Blob
    seed.js            ← المحتوى المبدئي
  public/              ← الواجهة (HTML/CSS/JS). نفس الملفات بتشتغل كموقع ثابت في النسخة المجانية
```

## التشغيل على جهازك
```bash
cd website
npm install
npm run build
ADMIN_PASSWORD=كلمة-سر-قوية npm start      # أو: npm run dev
```
افتحي `http://localhost:3000` للموقع، و`http://localhost:3000/admin` للوحة التحكم.

## الرفع على Vercel
Vercel مفيهوش ديسك دائم، فالبيانات بتتحفظ في **Redis**، والصور في **Vercel Blob**. الاتنين بيتوصلوا من داخل Vercel.

1. **Add New → Project**، واختاري الريبو `wedad`.
2. **Root Directory = `website`** (مهم). الـ Framework هيتعرف لوحده: **Next.js**.
3. **Environment Variables:** ضيفي `ADMIN_PASSWORD` = كلمة سر لوحة التحكم.
4. اضغطي **Deploy**.
5. بعد ما يخلص، من صفحة المشروع اختاري **Storage** ← **Create / Connect**:
   - **Upstash for Redis** (أو أي Redis من الـ Marketplace) ← Connect للمشروع. ده للحجوزات والبيانات، وهو إجباري.
   - **Blob** ← Connect للمشروع. ده لرفع الصور من لوحة التحكم، وهو اختياري.
6. **Deployments ← Redeploy**، عشان المتغيرات الجديدة تتقري.

الكود بيتعرف على Redis لوحده من أي متغيرات من دول: `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN`، أو `KV_REST_API_URL` و`KV_REST_API_TOKEN`، أو `REDIS_URL`. وBlob من `BLOB_READ_WRITE_TOKEN` أو `BLOB_STORE_ID`.
لو الموقع اترفع على Vercel من غير Redis، الـ API بيرد `storage_not_configured` بدل ما يضيّع الحجوزات.

**حدود Vercel:** أقصى حجم لأي طلب **4.5MB**، فرفع الصور على Vercel لحد **4MB**. للفيديوهات حطي **لينك** (يوتيوب / إنستجرام / تيك توك / درايف) في معرض الأعمال.
**خطة Hobby المجانية** في Vercel للاستخدام الشخصي غير التجاري بس. موقع الاستوديو تجاري، فالمفروض خطة **Pro**.

## الرفع على Render أو VPS (ديسك دائم)
- **Render:** [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/doditstudio99-cmyk/wedad). الإعدادات في `render.yaml`: build بـ `npm ci && npm run build`، وديسك على `/var/data`.
- **Docker:**
  ```bash
  cd website
  docker build -t dodit-studio .
  docker run -d -p 80:3000 -e ADMIN_PASSWORD=... -v dodit-data:/data dodit-studio
  ```

## متغيرات البيئة
| المتغير | الوظيفة |
|---|---|
| `ADMIN_PASSWORD` | كلمة سر لوحة التحكم أول مرة (بعدها بتتغير من الإعدادات). لو مش موجودة، بيتعمل باسورد عشوائي ويظهر في الـ logs. |
| `RESET_ADMIN_PASSWORD=true` | لو نسيتي كلمة السر: حطيها مع `ADMIN_PASSWORD` جديدة، واعملي redeploy أو restart، وبعدين شيليها. |
| `DATA_DIR` | مكان البيانات والصور على الديسك (الافتراضي `website/data`). مش بيُستخدم على Vercel. |
| Redis / Blob | شوفي جزء Vercel فوق. |

## ملاحظات
- **على الديسك:** البيانات في `DATA_DIR/db.json`، والصور في `DATA_DIR/uploads`، ونسخة يومية في `DATA_DIR/backups` (آخر ١٤ يوم).
- **على Redis:** البيانات في المفتاح `dodit:db`، والنسخ اليومية في `dodit:backup:daily-*` (بتتمسح بعد ١٥ يوم).
- كل التعديلات بتتنفذ واحدة واحدة تحت قفل (على الديسك جوه السيرفر، وعلى Redis بين كل النسخ)، فمفيش حجزين على نفس المعاد.
- الأوقات بتوقيت القاهرة (`Africa/Cairo`).
- **النسخة المجانية** (Google Sheets + Netlify أو GitHub Pages) بتستخدم نفس `public/`، ورابط الشيت بيتكتب في `js/config.js` وقت الـ build من `google-sheets/web-app-url.txt`.
