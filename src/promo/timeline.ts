// Scene timing for the DODIT Studio reels promo, in seconds.
// Each scene matches one line of the voiceover. When the final voiceover is
// recorded, adjust these numbers so every price lands exactly on its word.

export const FPS = 30;

export const SCENES = {
  hook: { from: 0, to: 4.6 }, // لسه بتصور ريل واحد...
  month: { from: 4.6, to: 10.2 }, // طيب، إيه رأيك تصور محتوى شهر كامل...
  intro: { from: 10.2, to: 13.2 }, // مع DODIT STUDIO عندك أربع باقات...
  p1: { from: 13.2, to: 16.4 }, // خمسة ريلز بألفين جنيه
  p2: { from: 16.4, to: 19.8 }, // عشرة ريلز بتلاتة آلاف وخمسمية جنيه
  p3: { from: 19.8, to: 24.8 }, // عشرين ريل بستة آلاف وميتين وخمسين جنيه
  value: { from: 24.8, to: 31.6 }, // إحنا مش بنصورلك فيديوهات وبس...
  stop: { from: 31.6, to: 34.0 }, // بطل تأجل محتواك!
  book: { from: 34.0, to: 37.0 }, // واحجز باقتك دلوقتي
  end: { from: 37.0, to: 42.0 }, // DODIT STUDIO... خلي محتواك يتكلم عنك!
} as const;

export type SceneName = keyof typeof SCENES;

export const TOTAL_SECONDS = SCENES.end.to;
export const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FPS);

export const f = (sec: number) => Math.round(sec * FPS);

export const sceneFrames = (name: SceneName) => ({
  from: f(SCENES[name].from),
  duration: f(SCENES[name].to) - f(SCENES[name].from),
});

// The moment (seconds, inside the price scene) the price is spoken.
export const PRICE_HIT = 1.1;
