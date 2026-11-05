// Scene timing for the DODIT Studio reels promo, in seconds.
// Each scene matches one line of the voiceover (public/dodit-promo/voiceover.mp3).
// If the voiceover is replaced, re-measure these so every price lands on its word.

export const FPS = 30;

export const SCENES = {
  hook: { from: 0, to: 4.3 }, // لسه بتصور ريل واحد...
  month: { from: 4.3, to: 10.9 }, // طيب، إيه رأيك تصور محتوى شهر كامل...
  intro: { from: 10.9, to: 14.6 }, // مع DODIT STUDIO عندك أربع باقات...
  p1: { from: 14.6, to: 16.7 }, // خمسة ريلز بألفين جنيه
  p2: { from: 16.7, to: 20.2 }, // عشرة ريلز بتلاتة آلاف وخمسمية جنيه
  p3: { from: 20.2, to: 26.2 }, // ولو عايز تكبر أكتر، عشرين ريل بستة آلاف وميتين وخمسين جنيه
  value: { from: 26.2, to: 34.65 }, // إحنا مش بنصورلك فيديوهات وبس...
  stop: { from: 34.65, to: 36.55 }, // بطل تأجل محتواك!
  book: { from: 36.55, to: 39.85 }, // واحجز باقتك دلوقتي مع DODIT STUDIO
  end: { from: 39.85, to: 45.5 }, // DODIT STUDIO... خلي محتواك يتكلم عنك!
} as const;

export type SceneName = keyof typeof SCENES;

export const TOTAL_SECONDS = SCENES.end.to;
export const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FPS);

export const f = (sec: number) => Math.round(sec * FPS);

export const sceneFrames = (name: SceneName) => ({
  from: f(SCENES[name].from),
  duration: f(SCENES[name].to) - f(SCENES[name].from),
});

// When (seconds after the scene starts) the voiceover says the number of
// reels and the price, measured from public/dodit-promo/voiceover.mp3.
export const PRICE_TIMING = {
  p1: { reels: 0.2, price: 1.0 },
  p2: { reels: 0.1, price: 1.0 },
  p3: { reels: 2.3, price: 3.2 },
} as const;

// When each of the four value lines starts (seconds into the value scene).
export const VALUE_BEATS = [0, 2.6, 4.8, 6.6];
