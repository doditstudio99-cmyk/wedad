# DODIT Studio — إعلان باقات الريلز (Facebook Reels 9:16)

فيديو إعلان 1080×1920، ‏30fps، ‏45.5 ثانية، معمول بـ Remotion. الكود في `src/promo/`.

## التشغيل
```bash
npm install
npm run dev                      # معاينة: اختار DoditReelsPromo
npx remotion render DoditReelsPromo out/dodit-reels-promo.mp4 --crf=18
```

## التعليق الصوتي
- موجود في `public/dodit-promo/voiceover.mp3`: صوت بنت مصري (ElevenLabs v3، صوت Fatima)، ‏43.6 ثانية، ومتظبط على -14 LUFS.
- المشاهد متزامنة مع الكلام: الأوقات في `src/promo/timeline.ts` (`SCENES`، و`PRICE_TIMING` لظهور كل سعر مع نطقه، و`VALUE_BEATS`).
- لو غيّرت ملف الصوت، قيس الأوقات تاني وعدّلها في نفس الملف. لو الملف مش موجود، الفيديو بيطلع بالمزيكا بس.

## حاجات تتعدّل
- رقم الواتساب: `whatsapp` في `src/Root.tsx` (حالياً رقم مؤقت `+20 100 000 0000`).
- الباقات والأسعار: `src/promo/DoditPromo.tsx`.
- المزيكا والمؤثرات الصوتية متولّدة بالكود (من غير حقوق ملكية): `python3 promo/make_audio.py`.
- الخطوط (Cairo و Lalezar و Montserrat، رخصة OFL) محفوظة في `public/dodit-promo/fonts`.
