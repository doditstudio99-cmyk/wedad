// Scene timing for the DODIT Studio reels promo, in seconds.
// Each scene matches one line of the voiceover (public/dodit-promo/voiceover.mp3).
// If the voiceover is replaced, re-measure these so every price lands on its word.

export const FPS = 30;

export const SCENES = {
  hook: { from: 0, to: 3.7 }, // لسه بتصور ريل واحد...
  month: { from: 3.7, to: 9.5 }, // طيب، إيه رأيك تصور محتوى شهر كامل...
  intro: { from: 9.5, to: 13.1 }, // مع DODIT STUDIO عندك أربع باقات...
  p1: { from: 13.1, to: 14.85 }, // خمسة ريلز بألفين جنيه
  p2: { from: 14.85, to: 17.5 }, // عشرة ريلز بتلاتة آلاف وخمسمية جنيه
  p3: { from: 17.5, to: 22.7 }, // ولو عايز تكبر أكتر، عشرين ريل بستة آلاف وميتين وخمسين جنيه
  value: { from: 22.7, to: 30.5 }, // إحنا مش بنصورلك فيديوهات وبس...
  stop: { from: 30.5, to: 32.25 }, // بطل تأجل محتواك!
  book: { from: 32.25, to: 34.85 }, // واحجز باقتك دلوقتي مع DODIT STUDIO
  end: { from: 34.85, to: 40.5 }, // DODIT STUDIO... خلي محتواك يتكلم عنك!
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
  p2: { reels: 0.15, price: 0.95 },
  p3: { reels: 2.3, price: 3.2 },
} as const;

// When each of the four value lines starts (seconds into the value scene).
export const VALUE_BEATS = [0, 2.5, 4.4, 6.1];
