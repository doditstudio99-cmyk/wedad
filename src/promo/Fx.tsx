import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { C, cairo, montserrat } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Dark studio backdrop with slowly drifting orange light. */
export const StudioBackground: React.FC<{ tint?: string; intensity?: number }> = ({
  tint = C.orange,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const a = frame / 40;
  const x1 = 50 + Math.sin(a) * 25;
  const y1 = 30 + Math.cos(a * 0.7) * 15;
  const x2 = 50 + Math.cos(a * 0.8) * 30;
  const y2 = 75 + Math.sin(a * 0.6) * 12;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x1}% ${y1}%, ${tint}${hex(0.55 * intensity)} 0%, transparent 45%),
          radial-gradient(circle at ${x2}% ${y2}%, ${C.orange2}${hex(0.35 * intensity)} 0%, transparent 40%),
          linear-gradient(180deg, ${C.dark} 0%, ${C.ink} 100%)`,
      }}
    >
      <StudioGrid />
    </AbsoluteFill>
  );
};

const hex = (alpha: number) =>
  Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .replace(/^(.)$/, "0$1");

/** Perspective floor grid, like a lit studio cyclorama. */
const StudioGrid: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ perspective: 900, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "-50%",
          right: "-50%",
          bottom: -400,
          height: 1200,
          transform: "rotateX(72deg)",
          backgroundImage: `linear-gradient(${C.orange}33 2px, transparent 2px), linear-gradient(90deg, ${C.orange}33 2px, transparent 2px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `0 ${(frame * 6) % 120}px`,
          maskImage: "linear-gradient(to top, black 10%, transparent 70%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Film grain + vignette + soft light leak: the "graded" look on top of everything. */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const leak = interpolate(Math.sin(frame / 23), [-1, 1], [0.05, 0.2]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(115deg, transparent 30%, ${C.orange2} 50%, transparent 70%)`,
          opacity: leak,
          mixBlendMode: "screen",
          transform: `translateX(${Math.sin(frame / 50) * 300}px)`,
        }}
      />
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Whip-zoom in / out around a scene, plus a slight camera push. */
export const SceneShell: React.FC<{
  duration: number;
  children: React.ReactNode;
  push?: number;
}> = ({ duration, children, push = 0.06 }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outP = interpolate(frame, [duration - 7, duration], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const scale = interpolate(inP, [0, 1], [1.35, 1]) * (1 + push * (frame / duration)) * interpolate(outP, [0, 1], [1, 1.6]);
  const blur = (1 - inP) * 24 + outP * 30;
  const opacity = Math.min(inP * 1.5, 1 - outP * 0.9);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

/** Short light flash at each cut. */
export const Flash: React.FC<{ color?: string }> = ({ color = "#fff" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 2, 8], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen" }} />;
};

/** Camera viewfinder overlay (REC, timecode, focus brackets). */
export const Viewfinder: React.FC<{ startAt?: number }> = ({ startAt = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame + startAt;
  const sec = Math.floor(t / fps);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const ff = pad(t % fps);
  const tc = `00:00:${pad(sec)}:${ff}`;
  const blink = Math.floor(frame / 15) % 2 === 0;
  const b = 70;
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: "absolute",
        width: b,
        height: b,
        borderTop: "6px solid rgba(255,255,255,0.85)",
        borderLeft: "6px solid rgba(255,255,255,0.85)",
        transform: `rotate(${rot}deg)`,
        ...pos,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ fontFamily: montserrat, color: "white" }}>
      {corner({ top: 150, left: 60 }, 0)}
      {corner({ top: 150, right: 60 }, 90)}
      {corner({ bottom: 150, right: 60 }, 180)}
      {corner({ bottom: 150, left: 60 }, 270)}
      <div style={{ position: "absolute", top: 240, left: 100, display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 800 }}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: "#ff2a2a", opacity: blink ? 1 : 0.2 }} />
        REC
      </div>
      <div style={{ position: "absolute", top: 240, right: 100, fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>{tc}</div>
      <div style={{ position: "absolute", bottom: 230, left: 100, fontSize: 28, fontWeight: 800, opacity: 0.8 }}>4K · 60FPS</div>
      <div style={{ position: "absolute", bottom: 230, right: 100, fontSize: 28, fontWeight: 800, opacity: 0.8 }}>ISO 400</div>
    </AbsoluteFill>
  );
};

/** DODIT Studio logo: orange "D" mark + wordmark (same as the website). */
export const Logo: React.FC<{ size?: number; glow?: number }> = ({ size = 1, glow = 0.35 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 22 * size, direction: "ltr" }}>
    <div
      style={{
        width: 110 * size,
        height: 110 * size,
        borderRadius: 32 * size,
        background: `linear-gradient(135deg, ${C.orange2}, ${C.orange})`,
        display: "grid",
        placeItems: "center",
        color: "white",
        fontFamily: montserrat,
        fontWeight: 900,
        fontSize: 72 * size,
        boxShadow: `0 ${12 * size}px ${40 * size}px rgba(255,107,0,${glow})`,
      }}
    >
      D
    </div>
    <div style={{ fontFamily: montserrat, fontSize: 74 * size, letterSpacing: -2 * size, color: "white", fontWeight: 800 }}>
      dodit<span style={{ color: C.orange, fontWeight: 900 }}>studio</span>
    </div>
  </div>
);

/** Small persistent logo bug in the corner. */
export const LogoBug: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 15], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: o * 0.95 }}>
      <Logo size={0.5} glow={0.2} />
    </div>
  );
};

/** Arabic headline that pops in word by word. */
export const PopText: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  stagger?: number;
  highlight?: string[];
  font?: string;
  weight?: number;
}> = ({ text, delay = 0, size = 110, color = "white", stagger = 3, highlight = [], font = cairo, weight = 900 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        direction: "rtl",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${size * 0.28}px`,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.35,
        color,
        textAlign: "center",
        padding: "0 70px",
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
        const hl = highlight.indexOf(w) !== -1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - s) * 60}px) scale(${0.6 + s * 0.4})`,
              opacity: Math.min(1, s * 1.4),
              color: hl ? C.orange : undefined,
              textShadow: hl ? `0 0 40px ${C.orange}aa` : "0 8px 30px rgba(0,0,0,0.6)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Little vertical reel thumbnail (phone-shaped card with a play button). */
export const ReelCard: React.FC<{ w?: number; hue?: number; label?: string; style?: React.CSSProperties }> = ({
  w = 160,
  hue = 0,
  label,
  style,
}) => {
  const h = w * 1.78;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.14,
        background: `linear-gradient(160deg, hsl(${24 + hue}, 100%, 58%), hsl(${10 + hue}, 90%, 30%))`,
        border: `${Math.max(2, w * 0.03)}px solid rgba(255,255,255,0.9)`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45), transparent 45%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: w * 0.34,
          height: w * 0.34,
          marginLeft: -w * 0.17,
          marginTop: -w * 0.17,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.92)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: w * 0.03,
            borderTop: `${w * 0.07}px solid transparent`,
            borderBottom: `${w * 0.07}px solid transparent`,
            borderLeft: `${w * 0.11}px solid ${C.orange}`,
          }}
        />
      </div>
      {label ? (
        <div
          style={{
            position: "absolute",
            bottom: w * 0.08,
            left: 0,
            right: 0,
            textAlign: "center",
            color: "white",
            fontFamily: cairo,
            fontWeight: 800,
            fontSize: w * 0.14,
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: w * 0.05, left: w * 0.08, right: w * 0.08, height: w * 0.025, background: "rgba(255,255,255,0.4)", borderRadius: 4 }} />
    </div>
  );
};

/** Deterministic random helper for staggered layouts. */
export const rnd = (seed: string) => random(seed);
