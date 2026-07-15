import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";

const Field: React.FC<{ label: string; delay: number; value: string }> = ({ label, delay, value }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inp = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{ opacity: inp, transform: `translateX(${interpolate(inp, [0, 1], [40, 0])}px)`, marginBottom: 26 }}>
      <div style={{ fontFamily: body, fontSize: 24, color: C.muted, marginBottom: 10, fontWeight: 600 }}>{label}</div>
      <div style={{ background: "#eef2fb", border: "2px solid #d6def0", borderRadius: 18, padding: "22px 24px", fontFamily: body, fontSize: 28, color: C.ink }}>
        {value}
      </div>
    </div>
  );
};

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });
  const tabActive = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnPulse = 1 + Math.sin(Math.max(0, frame - 90) / 6) * 0.04;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `scale(${phoneIn})`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          <div style={{ padding: "100px 44px 40px", height: "100%", background: C.cream }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 30 }}>
              <Img src={staticFile("images/logo.png")} style={{ width: 110, height: 110 }} />
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 40, color: C.ink, marginTop: 8 }}>Byenveni</div>
            </div>

            {/* tabs */}
            <div style={{ display: "flex", background: "#e7edf9", borderRadius: 18, padding: 8, marginBottom: 36 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "16px 0", borderRadius: 12, fontFamily: body, fontWeight: 700, fontSize: 26, color: C.white, background: `rgba(37,99,235,${0.4 + tabActive * 0.6})` }}>
                Konekte
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "16px 0", fontFamily: body, fontWeight: 700, fontSize: 26, color: C.muted }}>
                Kreye kont
              </div>
            </div>

            <Field label="Imèl" delay={30} value="jean@email.com" />
            <Field label="Modpas" delay={45} value="••••••••" />

            <div
              style={{
                transform: `scale(${btnPulse})`,
                marginTop: 14,
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
                color: C.white, fontFamily: body, fontWeight: 800, fontSize: 32,
                textAlign: "center", padding: "24px 0", borderRadius: 18,
                boxShadow: `0 12px 30px ${C.blue}55`,
              }}
            >
              Konekte
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 26, fontFamily: body, fontSize: 26, color: C.ink, fontWeight: 600 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", border: "2px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#4285F4" }}>G</div>
              Kontinye ak Google
            </div>
          </div>
        </PhoneFrame>
      </div>

      <Caption text="Kreye yon kont oswa konekte sou kont ou" sub="Etap 4" />
    </AbsoluteFill>
  );
};
