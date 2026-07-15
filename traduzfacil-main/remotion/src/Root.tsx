import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FPS, totalFrames } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
