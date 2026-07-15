import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";
import { TranslatorScreen } from "../components/TranslatorScreen";

const SRC = "Bom dia, como você está?";
const DST = "Bonjou, kijan ou ye?";

export const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `scale(${phoneIn})`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          <TranslatorScreen
            inputText={SRC}
            btnScale={1}
            resultOpacity={1}
            resultY={0}
            resultText={DST}
            audioActive
          />
        </PhoneFrame>
      </div>

      <Caption text="Ou kapab tande pwononsyasyon an ak bouton odyo a" sub="Etap 6" />
    </AbsoluteFill>
  );
};
