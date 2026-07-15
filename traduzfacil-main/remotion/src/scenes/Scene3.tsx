import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });

  const bannerIn = spring({ frame: frame - 25, fps, config: { damping: 16 } });
  const bannerY = interpolate(bannerIn, [0, 1], [200, 0]);

  // tap animation around frame 95-120
  const tap = interpolate(frame, [95, 108, 120], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(Math.max(0, frame - 60) / 6) * 0.04;
  const fingerIn = spring({ frame: frame - 80, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `scale(${phoneIn})`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          <div style={{ height: 90 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Img src={staticFile("images/logo.png")} style={{ width: 200, height: 200 }} />
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 50, color: C.ink, marginTop: 14 }}>
              Traduz Fácil
            </div>
            <div style={{ fontFamily: body, fontSize: 26, color: C.muted, marginTop: 50 }}>
              traduzfacil.com
            </div>
          </div>

          {/* install banner */}
          <div
            style={{
              position: "absolute",
              left: 26,
              right: 26,
              bottom: 50,
              transform: `translateY(${bannerY}px)`,
              opacity: bannerIn,
              background: C.white,
              borderRadius: 28,
              padding: 26,
              boxShadow: "0 16px 40px rgba(11,27,58,0.18)",
              border: "1px solid #e6ebf7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <Img src={staticFile("images/logo.png")} style={{ width: 64, height: 64, borderRadius: 16 }} />
              <div>
                <div style={{ fontFamily: body, fontWeight: 700, fontSize: 28, color: C.ink }}>Traduz Fácil</div>
                <div style={{ fontFamily: body, fontSize: 22, color: C.muted }}>Ajoute sou ekran prensipal</div>
              </div>
            </div>
            <div
              style={{
                transform: `scale(${tap * pulse})`,
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
                color: C.white,
                fontFamily: body,
                fontWeight: 800,
                fontSize: 34,
                textAlign: "center",
                padding: "24px 0",
                borderRadius: 20,
                boxShadow: `0 12px 30px ${C.blue}66`,
              }}
            >
              ⬇ Enstale
            </div>
          </div>

          {/* finger tap */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 70,
              fontSize: 90,
              transform: `translateX(-50%) scale(${fingerIn}) translateY(${interpolate(tap, [0.92, 1], [-14, 0])}px)`,
              opacity: fingerIn,
            }}
          >
            👆
          </div>
        </PhoneFrame>
      </div>

      <Caption text="Klike sou bouton Enstale pou ajoute aplikasyon an" sub="Etap 2" />
    </AbsoluteFill>
  );
};
