import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { body } from "../fonts";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";

const dummy = ["#FF8A65", "#4FC3F7", "#BA68C8", "#FFD54F", "#81C784", "#F06292", "#7986CB", "#4DB6AC"];

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });

  // progress bar 0..1 then icon pops
  const progress = interpolate(frame, [20, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iconIn = spring({ frame: frame - 100, fps, config: { damping: 9, stiffness: 120 } });
  const iconScale = interpolate(iconIn, [0, 1], [0, 1]);
  const labelOp = interpolate(frame, [108, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `scale(${phoneIn})`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(160deg, #14346B, #0b1f44)`,
              padding: "100px 40px 40px",
            }}
          >
            {/* time */}
            <div style={{ textAlign: "center", color: C.white, fontFamily: body, fontWeight: 700, fontSize: 80, marginBottom: 50 }}>
              9:41
            </div>

            {/* app grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30, justifyItems: "center" }}>
              {/* TF icon in first slot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ transform: `scale(${iconScale})`, position: "relative" }}>
                  <Img src={staticFile("images/logo.png")} style={{ width: 86, height: 86, borderRadius: 22, boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }} />
                  <div
                    style={{
                      position: "absolute", right: -8, top: -8, width: 36, height: 36, borderRadius: "50%",
                      background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, fontWeight: 900, opacity: labelOp,
                    }}
                  >
                    ✓
                  </div>
                </div>
                <div style={{ fontFamily: body, fontSize: 18, color: C.white, opacity: labelOp, fontWeight: 600 }}>Traduz Fácil</div>
              </div>
              {dummy.map((c, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 86, height: 86, borderRadius: 22, background: c, opacity: 0.55 }} />
                  <div style={{ width: 50, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.25)" }} />
                </div>
              ))}
            </div>

            {/* install progress */}
            <div style={{ opacity: progress < 1 ? 1 : interpolate(frame, [96, 108], [1, 0], { extrapolateRight: "clamp" }), marginTop: 90 }}>
              <div style={{ fontFamily: body, fontSize: 24, color: C.white, marginBottom: 14, textAlign: "center", fontWeight: 600 }}>
                Ap enstale… {Math.round(progress * 100)}%
              </div>
              <div style={{ height: 16, borderRadius: 10, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
                <div style={{ width: `${progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.green}, ${C.greenGlow})` }} />
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>

      <Caption text="Aplikasyon an ap enstale epi li ap parèt sou ekran ou" sub="Etap 3" />
    </AbsoluteFill>
  );
};
