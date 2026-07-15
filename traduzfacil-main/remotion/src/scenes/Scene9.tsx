import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";

export const Scene9: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 12 } });
  const float = Math.sin(frame / 26) * 10;
  const ctaIn = spring({ frame: frame - 22, fps, config: { damping: 14 } });
  const urlIn = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const ctaPulse = 1 + Math.sin(Math.max(0, frame - 50) / 7) * 0.03;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Img
        src={staticFile("images/logo.png")}
        style={{
          width: 400,
          height: 400,
          transform: `scale(${interpolate(logoIn, [0, 1], [0.5, 1])}) translateY(${float}px)`,
          filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.5))",
        }}
      />
      <div style={{ fontFamily: display, fontWeight: 800, fontSize: 96, color: C.white, marginTop: 20, opacity: logoIn }}>
        Traduz Fácil
      </div>

      <div
        style={{
          transform: `scale(${ctaPulse}) translateY(${interpolate(ctaIn, [0, 1], [40, 0])}px)`,
          opacity: ctaIn,
          marginTop: 50,
          background: `linear-gradient(135deg, ${C.green}, ${C.greenGlow})`,
          color: "#06351c",
          fontFamily: display,
          fontWeight: 800,
          fontSize: 56,
          padding: "30px 70px",
          borderRadius: 28,
          boxShadow: `0 16px 44px ${C.green}55`,
        }}
      >
        Telechaje li jodi a!
      </div>

      <div
        style={{
          opacity: urlIn,
          marginTop: 46,
          fontFamily: body,
          fontWeight: 600,
          fontSize: 46,
          color: C.white,
          letterSpacing: 1,
        }}
      >
        🌐 www.traduzfacil.com
      </div>
    </AbsoluteFill>
  );
};
