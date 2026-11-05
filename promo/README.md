# DODIT Studio — إعلان باقات الريلز (Facebook Reels 9:16)

فيديو إعلان 1080×1920، ‏30fps، ‏42 ثانية، معمول بـ Remotion. الكود في `src/promo/`.

## التشغيل
```bash
npm install
npm run dev                      # معاينة: اختار DoditReelsPromo
npx remotion render DoditReelsPromo out/dodit-reels-promo.mp4 --crf=18
```

## التعليق الصوتي
- حط ملف التعليق الصوتي (صوت بنت مصري) في `public/dodit-promo/voiceover.mp3`، والفيديو هيستخدمه لوحده ويوطّي المزيكا تحته.
- لو توقيت الكلام اختلف، عدّل الثواني في `src/promo/timeline.ts`: كل مشهد قصاده الجملة بتاعته.
  ظهور السعر بيحصل بعد `PRICE_HIT` ثانية من أول مشهد الباقة، وده لازم ييجي مع نطق السعر.

## حاجات تتعدّل
- رقم الواتساب: `whatsapp` في `src/Root.tsx` (حالياً رقم مؤقت `+20 100 000 0000`).
- الباقات والأسعار: `src/promo/DoditPromo.tsx`.
- المزيكا والمؤثرات الصوتية متولّدة بالكود (من غير حقوق ملكية): `python3 promo/make_audio.py`.
- الخطوط (Cairo و Lalezar و Montserrat، رخصة OFL) محفوظة في `public/dodit-promo/fonts`.
