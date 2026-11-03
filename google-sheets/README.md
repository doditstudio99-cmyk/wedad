# النسخة المجانية — Google Sheets + Netlify

مفيش كارت ولا اشتراك. الحجوزات بتنزل في Google Sheet على حسابك، وبيوصلك إيميل مع كل حجز.

## الخطوة ١: الشيت (مرة واحدة، حوالي ٥ دقايق)
1. افتح https://sheets.new واعمل شيت جديد، وسمّيه `Dodit Studio`.
2. من القائمة: **Extensions ← Apps Script**.
3. امسح الكود الموجود، والزق **كل** محتوى ملف [`Code.gs`](./Code.gs). من GitHub استخدم زرار النسخ (Copy raw file).
4. اضغط 💾 **Save**.
5. من فوق، اختار الدالة **`setup`** واضغط **Run**.
   - هيطلب صلاحيات: **Review permissions** ← اختار حسابك ← **Advanced** ← **Go to … (unsafe)** ← **Allow**. ده عادي، لإن الكود بتاعك وعلى حسابك.
   - ارجع للشيت، هتلاقي التبويبات اتعملت: الحجوزات، والخدمات، والأعمال، والآراء، ومواعيد العمل، وأيام الإجازة، والإعدادات.
6. **Deploy ← New deployment** ← اضغط ⚙️ واختار **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy**، وبعدين انسخ **Web app URL** (بيخلص بـ `/exec`).
7. حط الرابط في [`website/public/js/config.js`](../website/public/js/config.js) مكان `apiUrl: ''`.

## الخطوة ٢: الموقع على Netlify (مجاني)
1. ادخل https://app.netlify.com ← **Sign up with GitHub**.
2. **Add new site ← Import an existing project ← GitHub ← wedad**.
3. سيب كل الإعدادات زي ما هي (ملف `netlify.toml` بيظبطها)، واضغط **Deploy**.
4. هيطلعلك لينك زي `xxxx.netlify.app`. تقدر تغيّر الاسم من **Site configuration ← Change site name** لـ `dodit-studio`.

## الاستخدام اليومي
| عايز | تعمل إيه |
|---|---|
| تشوف الحجوزات | تبويب **الحجوزات**، والجديد لونه أصفر |
| تأكد أو تلغي حجز | غيّر عمود **الحالة**. "ملغي" بيرجّع المعاد متاح |
| تقفل معاد (حجز بالتليفون) | ضيف صف في الحجوزات باليوم (2026-11-20) والساعة (14:00) |
| تغيّر الأسعار والباقات | تبويب **الخدمات** |
| تضيف شغل | تبويب **الأعمال**: لينك الريل، أو لينك صورة من Google Drive (اعملها "Anyone with the link") |
| تغيّر الأيام والساعات | تبويب **مواعيد العمل**، وأيام الإجازة في تبويبها |
| تغيّر الواتساب والنصوص والسوشيال | تبويب **الإعدادات** |

التعديلات بتظهر في الموقع على طول، مش محتاج ترفع حاجة تاني.

## لو عدّلت Code.gs
- الملف ده **متولد تلقائياً**: عدّل `Code.template.gs`، وبعدين شغّل `node google-sheets/build.js`.
- بعد ما تلزق كود جديد في Apps Script: **Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy**، عشان الرابط يفضل زي ما هو.
