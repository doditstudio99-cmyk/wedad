import { Composition, staticFile } from "remotion";
import { Scene, myCompSchema } from "./Scene";
import { getMediaMetadata } from "./helpers/get-media-metadata";
import { DoditPromo, DoditPromoProps } from "./promo/DoditPromo";
import { FPS, TOTAL_FRAMES } from "./promo/timeline";

// Welcome to the Remotion Three Starter Kit!
// Two compositions have been created, showing how to use
// the `ThreeCanvas` component and the `useVideoTexture` hook.

// You can play around with the example or delete everything inside the canvas.

// Remotion Docs:
// https://remotion.dev/docs

// @remotion/three Docs:
// https://remotion.dev/docs/three

// React Three Fiber Docs:
// https://docs.pmnd.rs/react-three-fiber/getting-started/introduction

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* DODIT Studio reels promo, vertical 9:16 for Facebook Reels */}
      <Composition
        id="DoditReelsPromo"
        component={DoditPromo}
        fps={FPS}
        durationInFrames={TOTAL_FRAMES}
        width={1080}
        height={1920}
        defaultProps={
          {
            whatsapp: "0102 556 0533",
            voiceover: null,
          } satisfies DoditPromoProps
        }
        calculateMetadata={async ({ props }) => {
          // Use public/dodit-promo/voiceover.mp3 automatically once it exists.
          if (props.voiceover) return { props };
          const path = "dodit-promo/voiceover.mp3";
          try {
            const res = await fetch(staticFile(path), { method: "HEAD" });
            return { props: { ...props, voiceover: res.ok ? path : null } };
          } catch {
            return { props };
          }
        }}
      />
      <Composition
        id="Scene"
        component={Scene}
        fps={30}
        durationInFrames={300}
        width={1280}
        height={720}
        schema={myCompSchema}
        defaultProps={{
          deviceType: "phone",
          phoneColor: "rgb(110, 152, 191)" as const,
          baseScale: 1,
          mediaMetadata: null,
          videoSrc: null,
        }}
        calculateMetadata={async ({ props }) => {
          const videoSrc =
            props.deviceType === "phone"
              ? staticFile("phone.mp4")
              : staticFile("tablet.mp4");

          const mediaMetadata = await getMediaMetadata(videoSrc);

          return {
            props: {
              ...props,
              mediaMetadata,
              videoSrc,
            },
          };
        }}
      />
    </>
  );
};
