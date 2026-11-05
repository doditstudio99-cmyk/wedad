import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Logo,
  PopText,
  ReelCard,
  rnd,
  StudioBackground,
  Viewfinder,
} from "./Fx";
import { arNum, C, cairo, lalezar, montserrat } from "./theme";
import { f, VALUE_BEATS } from "./timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------------------------------------------------------------------------
// 1. Hook: لسه بتصور ريل واحد؟
// ---------------------------------------------------------------------------
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  const wobble = Math.sin(frame / 6) * 3;
  // at the second line, the lonely reel "shrinks" with a little shake
  const doubt = interpolate(frame, [f(1.7), f(2.2)], [1, 0.82], clamp);
  const shake = frame > f(1.7) && frame < f(2.3) ? Math.sin(frame * 3) * 10 : 0;
  return (
    <AbsoluteFill>
      <StudioBackground intensity={0.6} />
      <AbsoluteFill style={{ alignItems: "center", top: 330 }}>
        <div
          style={{
            transform: `translateX(${shake}px) rotate(${-6 + wobble}deg) scale(${cardIn * doubt})`,
          }}
        >
          <ReelCard w={300} label="ريل واحد" />
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: lalezar,
            fontSize: 90,
            color: C.orange,
            opacity: cardIn,
          }}
        >
          ١ / ٣٠
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 330 }}>
        <PopText
          text="لسه بتصوّر ريل واحد؟"
          delay={3}
          size={112}
          highlight={["واحد؟"]}
        />
        <div style={{ height: 20 }} />
        <PopText
          text="ومفكّر إنك كده عملت محتوى؟!"
          delay={f(1.6)}
          size={84}
          color={C.cream}
          stagger={2}
        />
      </AbsoluteFill>
      <Viewfinder />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2. A whole month of content, filling a calendar
// ---------------------------------------------------------------------------
export const MonthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = 6;
  const tile = 128;
  const gap = 18;
  const days = 30;
  const titleS = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <StudioBackground />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
        <div
          style={{
            fontFamily: cairo,
            fontWeight: 800,
            fontSize: 64,
            color: C.cream,
            direction: "rtl",
            opacity: titleS,
            transform: `translateY(${(1 - titleS) * 40}px)`,
          }}
        >
          طيب، إيه رأيك تصوّر
        </div>
        <div
          style={{
            fontFamily: lalezar,
            fontSize: 132,
            lineHeight: 1.2,
            color: "white",
            direction: "rtl",
            transform: `scale(${0.7 + titleS * 0.3})`,
            textShadow: `0 0 60px ${C.orange}`,
          }}
        >
          محتوى <span style={{ color: C.orange }}>شهر كامل</span>
        </div>
        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${tile}px)`,
            gap,
            direction: "rtl",
            padding: 26,
            borderRadius: 36,
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(255,255,255,0.12)",
          }}
        >
          {Array.from({ length: days }).map((_, i) => {
            const s = spring({
              frame: frame - 10 - i * 1.6,
              fps,
              config: { damping: 11, stiffness: 200 },
            });
            return (
              <div
                key={i}
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: 22,
                  position: "relative",
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(150deg, ${C.orange2}, hsl(${15 + rnd(`m${i}`) * 20}, 90%, 38%))`,
                    transform: `scale(${s})`,
                    borderRadius: 22,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "18px solid transparent",
                      borderBottom: "18px solid transparent",
                      borderLeft: "28px solid white",
                      marginLeft: 6,
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 12,
                    fontFamily: lalezar,
                    fontSize: 30,
                    color: "white",
                  }}
                >
                  {arNum(i + 1)}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 230 }}>
        <PopText
          text="وبأسعار تخلّيك تبدأ من غير ما تفكّر كتير!"
          delay={f(3.2)}
          size={70}
          stagger={2}
          highlight={["تبدأ"]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3. Brand slam: مع DODIT STUDIO عندك باقات
// ---------------------------------------------------------------------------
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({
    frame: frame - 2,
    fps,
    config: { damping: 9, stiffness: 160 },
  });
  const sweep = interpolate(frame, [8, 30], [-120, 220], clamp);
  return (
    <AbsoluteFill>
      <StudioBackground intensity={1.3} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: cairo,
            fontWeight: 800,
            fontSize: 80,
            color: C.cream,
            opacity: slam,
            marginBottom: 40,
          }}
        >
          مع
        </div>
        <div
          style={{
            position: "relative",
            transform: `scale(${interpolate(slam, [0, 1], [3, 1.25])})`,
            opacity: Math.min(1, slam * 2),
          }}
        >
          <Logo size={1.2} glow={0.7} />
          <div
            style={{
              position: "absolute",
              inset: -20,
              background: `linear-gradient(100deg, transparent ${sweep - 20}%, rgba(255,255,255,0.7) ${sweep}%, transparent ${sweep + 20}%)`,
              mixBlendMode: "overlay",
            }}
          />
        </div>
        <div style={{ height: 120 }} />
        <PopText
          text="عندك باقات تختار منها"
          delay={f(1.1)}
          size={92}
          highlight={["باقات"]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4-6. Price reveals (synced to the spoken price)
// ---------------------------------------------------------------------------
export const PriceScene: React.FC<{
  index: number;
  reels: number;
  reelWord: string;
  price: number;
  tagline?: string;
  badge?: string;
  /** seconds into the scene when the reel count and the price are spoken */
  reelsAt: number;
  priceAt: number;
  /** show the tagline before the price (when the voiceover says it first) */
  taglineFirst?: boolean;
}> = ({
  index,
  reels,
  reelWord,
  price,
  tagline,
  badge,
  reelsAt,
  priceAt,
  taglineFirst = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = f(priceAt);
  const head = spring({
    frame: frame - f(reelsAt) + 6,
    fps,
    config: { damping: 13 },
  });
  const count = interpolate(frame, [hit - 8, hit + 6], [0, price], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const priceS = spring({
    frame: frame - (hit - 8),
    fps,
    config: { damping: 8, stiffness: 170 },
  });
  const ring = interpolate(frame, [hit, hit + 18], [0, 1], clamp);
  const cards = Math.min(reels, 20);
  return (
    <AbsoluteFill>
      <StudioBackground intensity={0.9 + index * 0.2} />
      {/* fan of reel cards = number of reels in the package */}
      <AbsoluteFill style={{ alignItems: "center", top: 330 }}>
        <div style={{ position: "relative", width: 10, height: 420 }}>
          {Array.from({ length: cards }).map((_, i) => {
            const s = spring({
              frame: frame - 4 - i * (12 / cards) * 1.4,
              fps,
              config: { damping: 13 },
            });
            const spread = cards === 1 ? 0 : (i / (cards - 1) - 0.5) * 2;
            const angle = spread * (cards > 10 ? 70 : 40) * s;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: -75,
                  top: 0,
                  transformOrigin: "50% 160%",
                  transform: `rotate(${angle}deg) scale(${0.4 + s * 0.6})`,
                  opacity: s,
                }}
              >
                <ReelCard w={150} hue={i * 2} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{ alignItems: "center", top: 860, direction: "rtl" }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            opacity: head,
            transform: `translateY(${(1 - head) * 40}px)`,
          }}
        >
          <div
            style={{
              fontFamily: cairo,
              fontWeight: 900,
              fontSize: 42,
              color: C.ink,
              background: C.orange,
              borderRadius: 999,
              padding: "6px 34px",
            }}
          >
            الباقة {["الأولى", "التانية", "التالتة"][index]}
          </div>
          {badge ? (
            <div
              style={{
                fontFamily: cairo,
                fontWeight: 900,
                fontSize: 42,
                color: "white",
                border: `3px solid ${C.gold}`,
                borderRadius: 999,
                padding: "4px 30px",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: lalezar,
            fontSize: 210,
            lineHeight: 1.2,
            color: "white",
            transform: `scale(${0.6 + head * 0.4})`,
            opacity: Math.min(1, head * 1.5),
          }}
        >
          {arNum(reels)} <span style={{ color: C.orange }}>{reelWord}</span>
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 10,
            padding: "10px 70px 30px",
            borderRadius: 50,
            background: `linear-gradient(135deg, ${C.orange2}, ${C.orange})`,
            boxShadow: `0 30px 90px rgba(255,107,0,0.6)`,
            transform: `scale(${priceS}) rotate(${(1 - priceS) * -8}deg)`,
            display: "flex",
            alignItems: "baseline",
            gap: 26,
          }}
        >
          <span
            style={{
              fontFamily: lalezar,
              fontSize: 230,
              color: "white",
              lineHeight: 1.15,
            }}
          >
            {arNum(count)}
          </span>
          <span
            style={{
              fontFamily: cairo,
              fontWeight: 900,
              fontSize: 90,
              color: C.ink,
            }}
          >
            جنيه
          </span>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 50,
              border: `6px solid ${C.orange2}`,
              transform: `scale(${1 + ring * 0.35})`,
              opacity: 1 - ring,
            }}
          />
        </div>
        {tagline ? (
          <div style={{ marginTop: 60 }}>
            <PopText
              text={tagline}
              delay={taglineFirst ? 4 : hit + 18}
              size={64}
              color={C.cream}
              stagger={2}
            />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7. Value: مش بنصورلك فيديوهات وبس...
// ---------------------------------------------------------------------------
const BEATS: { text: string; hl: string[]; strike?: boolean }[] = [
  { text: "مش بنصوّرلك فيديوهات وبس", hl: [], strike: true },
  { text: "بنساعدك تبني حضورك", hl: ["حضورك"] },
  { text: "وتظهر بشكل احترافي", hl: ["احترافي"] },
  { text: "وتخلّي الناس تفتكرك", hl: ["تفتكرك"] },
];

export const ValueScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const starts = VALUE_BEATS.map(f);
  let i = 0;
  while (i < starts.length - 1 && frame >= starts[i + 1]) i++;
  const per = (i + 1 < starts.length ? starts[i + 1] : duration) - starts[i];
  const local = frame - starts[i];
  const beat = BEATS[i];
  const strike = interpolate(local, [per * 0.5, per * 0.75], [0, 1], clamp);
  const lightBg = i % 2 === 1;
  const zoom = interpolate(local, [0, per], [1.08, 1]);
  return (
    <AbsoluteFill>
      {lightBg ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${C.orange2}, ${C.orange})`,
          }}
        />
      ) : (
        <StudioBackground />
      )}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${zoom})`,
        }}
      >
        <div
          style={{
            fontFamily: montserrat,
            fontWeight: 900,
            fontSize: 40,
            letterSpacing: 12,
            color: lightBg ? C.ink : C.orange,
            marginBottom: 40,
          }}
        >
          {`0${i + 1} / 04`}
        </div>
        <div style={{ position: "relative" }}>
          <PopText
            key={i}
            text={beat.text}
            size={124}
            color={lightBg ? C.ink : "white"}
            highlight={lightBg ? [] : beat.hl}
          />
          {beat.strike ? (
            <div
              style={{
                position: "absolute",
                top: "70%",
                left: 80,
                right: 80,
                height: 16,
                background: C.orange,
                borderRadius: 8,
                transformOrigin: "right",
                transform: `scaleX(${strike}) rotate(-3deg)`,
                boxShadow: `0 0 30px ${C.orange}`,
              }}
            />
          ) : null}
        </div>
      </AbsoluteFill>
      {!lightBg ? <Viewfinder startAt={i * 97} /> : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 8. بطل تأجل محتواك!
// ---------------------------------------------------------------------------
export const StopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 7, stiffness: 220 } });
  const shake = frame < 14 ? Math.sin(frame * 2.5) * (14 - frame) * 2 : 0;
  const strobe = Math.floor(frame / 4) % 2 === 0;
  return (
    <AbsoluteFill
      style={{ background: strobe && frame < 20 ? C.orange : C.ink }}
    >
      <StudioBackground intensity={1.5} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translate(${shake}px, ${-shake / 2}px)`,
        }}
      >
        <div
          style={{
            fontFamily: lalezar,
            fontSize: 300,
            lineHeight: 1.05,
            color: "white",
            transform: `scale(${interpolate(s, [0, 1], [2.4, 1])})`,
            textShadow: `0 0 80px ${C.orange}`,
          }}
        >
          بطّل
        </div>
        <div
          style={{
            fontFamily: lalezar,
            fontSize: 190,
            lineHeight: 1.2,
            color: C.orange,
            direction: "rtl",
            opacity: interpolate(frame, [8, 14], [0, 1], clamp),
          }}
        >
          تأجّل محتواك!
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 9. واحجز باقتك دلوقتي (button tap)
// ---------------------------------------------------------------------------
export const BookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btn = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const brand = spring({
    frame: frame - f(1.75),
    fps,
    config: { damping: 12 },
  });
  const tapAt = f(1.05);
  const fingerX = interpolate(frame, [15, tapAt], [380, 120], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const fingerY = interpolate(frame, [15, tapAt], [380, 60], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const press = frame >= tapAt && frame < tapAt + 6 ? 0.9 : 1;
  const ripple = interpolate(frame, [tapAt, tapAt + 20], [0, 1], clamp);
  const booked = frame >= tapAt + 4;
  return (
    <AbsoluteFill>
      <StudioBackground intensity={1.1} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <PopText text="واحجز باقتك دلوقتي" size={128} highlight={["دلوقتي"]} />
        <div style={{ height: 50 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            opacity: brand,
            transform: `scale(${0.7 + brand * 0.3})`,
          }}
        >
          <Logo size={0.8} />
          <span
            style={{
              fontFamily: cairo,
              fontWeight: 900,
              fontSize: 72,
              color: C.cream,
            }}
          >
            مع
          </span>
        </div>
        <div style={{ height: 120 }} />
        <div
          style={{ position: "relative", transform: `scale(${btn * press})` }}
        >
          <div
            style={{
              fontFamily: cairo,
              fontWeight: 900,
              fontSize: 76,
              color: "white",
              background: booked
                ? C.whatsapp
                : `linear-gradient(135deg, ${C.orange2}, ${C.orange})`,
              borderRadius: 999,
              padding: "26px 110px",
              boxShadow: booked
                ? "0 20px 80px rgba(37,211,102,0.6)"
                : "0 20px 80px rgba(255,107,0,0.6)",
              direction: "rtl",
            }}
          >
            {booked ? "✓ اتحجزت!" : "احجز دلوقتي"}
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -100,
              borderRadius: "50%",
              border: "8px solid white",
              transform: `scale(${ripple * 4})`,
              opacity: frame >= tapAt ? 1 - ripple : 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `calc(50% + ${fingerX}px)`,
              top: `calc(50% + ${fingerY}px)`,
              fontSize: 130,
              opacity: btn,
            }}
          >
            👆
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 10. End card: logo, slogan, WhatsApp CTA
// ---------------------------------------------------------------------------
const WhatsAppIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path
      fill="white"
      d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 6.9L3 29l6.5-2c1.9 1 4.1 1.6 6.5 1.6 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.8-1.7l-.4-.3-3.9 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.9-3.9-1.9-6 0-5.9 4.9-10.6 11-10.6s11 4.8 11 10.6-4.9 10.9-10.9 10.9zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.6l-1.1-2.6c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.5-.3z"
    />
  </svg>
);

export const EndScene: React.FC<{ whatsapp: string }> = ({ whatsapp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const glow = interpolate(frame, [0, 6, 40], [0, 1, 0.35], clamp);
  const cta = spring({ frame: frame - f(2.4), fps, config: { damping: 12 } });
  const pulse = 1 + Math.sin(frame / 5) * 0.025 * cta;
  const rays = frame * 0.4;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${rays}deg at 50% 40%, ${C.orange}22 0deg 8deg, transparent 8deg 20deg)`,
          opacity: glow,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 40%, ${C.orange}88, transparent 50%)`,
          opacity: glow,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 560 }}>
        <div
          style={{
            transform: `scale(${interpolate(logo, [0, 1], [0.3, 1.45])})`,
            opacity: Math.min(1, logo * 2),
          }}
        >
          <Logo size={1.2} glow={0.8} />
        </div>
        <div style={{ height: 150 }} />
        <PopText
          text="خلّي محتواك يتكلّم عنك!"
          delay={f(1.3)}
          size={104}
          highlight={["يتكلّم", "عنك!"]}
        />
        <div style={{ height: 110 }} />
        <div
          style={{
            transform: `scale(${cta * pulse})`,
            opacity: cta,
            display: "flex",
            alignItems: "center",
            gap: 26,
            background: C.whatsapp,
            borderRadius: 999,
            padding: "24px 60px",
            boxShadow: "0 24px 80px rgba(37,211,102,0.55)",
            direction: "rtl",
          }}
        >
          <WhatsAppIcon size={90} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: cairo,
                fontWeight: 900,
                fontSize: 56,
                color: "white",
                lineHeight: 1.3,
              }}
            >
              احجز على واتساب
            </span>
            <span
              style={{
                fontFamily: montserrat,
                fontWeight: 800,
                fontSize: 46,
                color: "white",
                direction: "ltr",
                letterSpacing: 2,
              }}
            >
              {whatsapp}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
