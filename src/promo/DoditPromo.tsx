import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile } from "remotion";
import { Flash, Grade, LogoBug, SceneShell } from "./Fx";
import {
  BookScene,
  EndScene,
  HookScene,
  IntroScene,
  MonthScene,
  PriceScene,
  StopScene,
  ValueScene,
} from "./Scenes";
import {
  f,
  PRICE_TIMING,
  SceneName,
  SCENES,
  sceneFrames,
  TOTAL_FRAMES,
} from "./timeline";

export type DoditPromoProps = {
  /** Shown on the end card. */
  whatsapp: string;
  /** public/ path of the recorded voiceover, or null to render without it. */
  voiceover: string | null;
};

const Scene: React.FC<{
  name: SceneName;
  children: (duration: number) => React.ReactNode;
  shell?: boolean;
}> = ({ name, children, shell = true }) => {
  const { from, duration } = sceneFrames(name);
  return (
    <Sequence from={from} durationInFrames={duration} name={name}>
      {shell ? (
        <SceneShell duration={duration}>{children(duration)}</SceneShell>
      ) : (
        children(duration)
      )}
    </Sequence>
  );
};

const sfx = (file: string) => staticFile(`dodit-promo/${file}`);

export const DoditPromo: React.FC<DoditPromoProps> = ({
  whatsapp,
  voiceover,
}) => {
  const cuts = (Object.keys(SCENES) as SceneName[])
    .slice(1)
    .map((n) => f(SCENES[n].from));
  const priceHits = (["p1", "p2", "p3"] as const).map((n) =>
    f(SCENES[n].from + PRICE_TIMING[n].price),
  );
  const musicVolume = voiceover ? 0.32 : 0.7;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Scene name="hook">{() => <HookScene />}</Scene>
      <Scene name="month">{() => <MonthScene />}</Scene>
      <Scene name="intro">{() => <IntroScene />}</Scene>
      <Scene name="p1">
        {() => (
          <PriceScene
            index={0}
            reels={5}
            reelWord="ريلز"
            price={2000}
            tagline="بداية قوية لصفحتك"
            reelsAt={PRICE_TIMING.p1.reels}
            priceAt={PRICE_TIMING.p1.price}
          />
        )}
      </Scene>
      <Scene name="p2">
        {() => (
          <PriceScene
            index={1}
            reels={10}
            reelWord="ريلز"
            price={3500}
            tagline="محتوى ثابت طول الشهر"
            reelsAt={PRICE_TIMING.p2.reels}
            priceAt={PRICE_TIMING.p2.price}
          />
        )}
      </Scene>
      <Scene name="p3">
        {() => (
          <PriceScene
            index={2}
            reels={20}
            reelWord="ريل"
            price={6250}
            badge="الأوفر"
            tagline="ولو عايز تكبر أكتر"
            taglineFirst
            reelsAt={PRICE_TIMING.p3.reels}
            priceAt={PRICE_TIMING.p3.price}
          />
        )}
      </Scene>
      <Scene name="value">{(d) => <ValueScene duration={d} />}</Scene>
      <Scene name="stop">{() => <StopScene />}</Scene>
      <Scene name="book">{() => <BookScene />}</Scene>
      <Scene name="end" shell={false}>
        {() => <EndScene whatsapp={whatsapp} />}
      </Scene>

      {/* logo bug on every scene except the end card */}
      <Sequence durationInFrames={sceneFrames("end").from} name="logo-bug">
        <LogoBug />
      </Sequence>

      {cuts.map((c) => (
        <Sequence key={c} from={c - 1} durationInFrames={10} name="flash">
          <Flash color={c === f(SCENES.end.from) ? "#ff8a2b" : "#ffffff"} />
        </Sequence>
      ))}

      <Grade />

      {/* ---- sound ---- */}
      <Audio
        src={sfx("music.wav")}
        volume={(fr) =>
          interpolate(
            fr,
            [0, 10, TOTAL_FRAMES - 45, TOTAL_FRAMES],
            [0, musicVolume, musicVolume, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )
        }
      />
      {voiceover ? <Audio src={staticFile(voiceover)} volume={1} /> : null}
      {cuts.map((c) => (
        <Sequence
          key={`w${c}`}
          from={Math.max(0, c - 8)}
          durationInFrames={20}
          name="whoosh"
        >
          <Audio src={sfx("whoosh.wav")} volume={0.55} />
        </Sequence>
      ))}
      {priceHits.map((h) => (
        <Sequence key={`d${h}`} from={h} durationInFrames={30} name="ding">
          <Audio src={sfx("ding.wav")} volume={0.6} />
        </Sequence>
      ))}
      <Sequence
        from={f(SCENES.end.from) - 45}
        durationInFrames={45}
        name="riser"
      >
        <Audio src={sfx("riser.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={f(SCENES.end.from)} durationInFrames={90} name="impact">
        <Audio src={sfx("impact.wav")} volume={1} />
      </Sequence>
      <Sequence from={f(SCENES.stop.from)} durationInFrames={10} name="pop">
        <Audio src={sfx("pop.wav")} volume={0.7} />
      </Sequence>
    </AbsoluteFill>
  );
};
