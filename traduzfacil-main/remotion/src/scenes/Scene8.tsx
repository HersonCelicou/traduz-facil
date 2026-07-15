import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display } from "../fonts";
import { Caption } from "../components/Caption";

export const Scene8: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame, fps, config: { damping: 18 } });
  const zoom = interpolate(frame, [0, 180], [1.05, 1.18]);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 130 }}>
      <div
        style={{
          width: 920,
          height: 1080,
          borderRadius: 50,
          overflow: "hidden",
          opacity: inn,
          transform: `scale(${interpolate(inn, [0, 1], [0.9, 1])})`,
          boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
          border: "3px solid rgba(255,255,255,0.12)",
          position: "relative",
        }}
      >
        <Img
          src={staticFile("images/community.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
        />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 50%, rgba(8,21,46,0.85) 100%)" }} />
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: display,
            fontWeight: 800,
            fontSize: 60,
            color: C.white,
          }}
        >
          Yon kominote ki konekte
        </div>
      </div>

      <Caption text="Traduz Fácil ede konekte moun, kilti ak opòtinite" sub="Kominote" />
    </AbsoluteFill>
  );
};
