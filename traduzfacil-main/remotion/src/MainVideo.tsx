import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENE_FRAMES, TRANSITION, NARRATION, VO_OFFSET } from "./theme";
import { PersistentBackground } from "./components/PersistentBackground";

import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";
import { Scene7 } from "./scenes/Scene7";
import { Scene8 } from "./scenes/Scene8";
import { Scene9 } from "./scenes/Scene9";

const scenes = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8, Scene9];

export const MainVideo: React.FC = () => {
  const children: React.ReactNode[] = [];
  scenes.forEach((Scene, i) => {
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={SCENE_FRAMES[i]}>
        <Scene />
        <Sequence from={VO_OFFSET}>
          <Audio src={staticFile(`audio/${NARRATION[i]}.mp3`)} volume={1} />
        </Sequence>
      </TransitionSeries.Sequence>,
    );
    if (i < scenes.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />,
      );
    }
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#08152E" }}>
      <PersistentBackground />
      <Audio src={staticFile("audio/music.mp3")} volume={0.16} />
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
};
