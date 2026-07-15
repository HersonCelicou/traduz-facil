import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";
import { TranslatorScreen } from "../components/TranslatorScreen";

const SRC = "Bom dia, como você está?";
const DST = "Bonjou, kijan ou ye?";

export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });

  const chars = Math.floor(interpolate(frame, [18, 78], [0, SRC.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const btnTap = interpolate(frame, [92, 102, 114], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const resIn = spring({ frame: frame - 118, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `scale(${phoneIn})`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          <TranslatorScreen
            inputText={SRC.slice(0, chars)}
            btnScale={btnTap}
            resultOpacity={resIn}
            resultY={interpolate(resIn, [0, 1], [40, 0])}
            resultText={DST}
          />
        </PhoneFrame>
      </div>

      <Caption text="Ekri tèks ou vle tradui epi klike sou Tradui" sub="Etap 5" />
    </AbsoluteFill>
  );
};
