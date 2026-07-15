import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const logoScale = interpolate(logoIn, [0, 1], [0.4, 1]);
  const float = Math.sin(frame / 28) * 12;

  const titleIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const subIn = spring({ frame: frame - 34, fps, config: { damping: 20 } });
  const ring = interpolate(frame, [0, 60], [0.6, 1.25], { extrapolateRight: "clamp" });
  const ringOp = interpolate(frame, [0, 60], [0.5, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative", transform: `translateY(${float}px)` }}>
        <div
          style={{
            position: "absolute",
            inset: -90,
            borderRadius: "50%",
            border: `4px solid ${C.green}`,
            transform: `scale(${ring})`,
            opacity: ringOp,
          }}
        />
        <Img
          src={staticFile("images/logo.png")}
          style={{
            width: 440,
            height: 440,
            transform: `scale(${logoScale})`,
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      <div
        style={{
          fontFamily: display,
          fontWeight: 800,
          fontSize: 110,
          color: C.white,
          marginTop: 30,
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
          opacity: titleIn,
          letterSpacing: -1,
        }}
      >
        Traduz Fácil
      </div>
      <div
        style={{
          fontFamily: body,
          fontWeight: 600,
          fontSize: 44,
          color: C.green,
          marginTop: 8,
          letterSpacing: 1,
          opacity: subIn,
          transform: `translateY(${interpolate(subIn, [0, 1], [30, 0])}px)`,
        }}
      >
        Konekte kilti ak opòtinite
      </div>
    </AbsoluteFill>
  );
};
