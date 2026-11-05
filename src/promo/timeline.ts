// Scene timing for the DODIT Studio reels promo, in seconds.
// Each scene matches one line of the voiceover (public/dodit-promo/voiceover.mp3).
// If the voiceover is replaced, re-measure these so every price lands on its word.

export const FPS = 30;

export const SCENES = {
  hook: { from: 0, to: 3.9 }, // لسه بتصور ريل واحد...
  month: { from: 3.9, to: 10.1 }, // طب، إيه رأيك تصور محتوى شهر كامل...
  intro: { from: 10.1, to: 13.8 }, // مع DODIT STUDIO عندك تلات باقات...
  p1: { from: 13.8, to: 15.7 }, // خمس ريلز بألفين جنيه
  p2: { from: 15.7, to: 18.6 }, // عشر ريلز بتلات تلاف وخمسمية جنيه
  p3: { from: 18.6, to: 24.0 }, // ولو عايز تكبر أكتر، عشرين ريل بست تلاف وميتين وخمسين جنيه
  value: { from: 24.0, to: 32.1 }, // إحنا مش بنصورلك فيديوهات وبس...
  stop: { from: 32.1, to: 34.1 }, // بطل تأجل محتواك!
  book: { from: 34.1, to: 37.05 }, // واحجز باقتك دلوقتي مع DODIT STUDIO
  end: { from: 37.05, to: 42.5 }, // DODIT STUDIO... خلي محتواك يتكلم عنك!
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
  p1: { reels: 0.2, price: 0.9 },
  p2: { reels: 0.2, price: 1.0 },
  p3: { reels: 2.1, price: 3.2 },
} as const;

// When each of the four value lines starts (seconds into the value scene).
export const VALUE_BEATS = [0, 2.8, 4.8, 6.5];
