import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { C } from "../theme";
import { display, body } from "../fonts";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";

const URL = "www.traduzfacil.com";

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame, fps, config: { damping: 16 } });
  const phoneY = interpolate(phoneIn, [0, 1], [120, 0]);

  const typed = Math.floor(interpolate(frame, [20, 80], [0, URL.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const pageIn = interpolate(frame, [85, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 150 }}>
      <div style={{ transform: `translateY(${phoneY}px)`, opacity: phoneIn }}>
        <PhoneFrame width={520}>
          {/* status spacer */}
          <div style={{ height: 80 }} />
          {/* browser address bar */}
          <div style={{ padding: "0 26px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#eef2fb",
                borderRadius: 24,
                padding: "20px 26px",
                border: "2px solid #d6def0",
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `3px solid ${C.muted}` }} />
              <span style={{ fontFamily: body, fontSize: 30, color: C.ink, fontWeight: 600 }}>
                {URL.slice(0, typed)}
                <span style={{ opacity: caret && typed < URL.length ? 1 : 0, color: C.blue }}>|</span>
              </span>
            </div>
          </div>

          {/* page preview */}
          <div style={{ opacity: pageIn, marginTop: 60, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Img src={staticFile("images/logo.png")} style={{ width: 180, height: 180 }} />
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 48, color: C.ink, marginTop: 16 }}>
              Traduz Fácil
            </div>
            <div style={{ fontFamily: body, fontSize: 26, color: C.blue, marginTop: 6, fontWeight: 600 }}>
              Konekte kilti ak opòtinite
            </div>
            <div
              style={{
                marginTop: 40,
                background: C.blue,
                color: C.white,
                fontFamily: body,
                fontWeight: 700,
                fontSize: 30,
                padding: "20px 46px",
                borderRadius: 20,
              }}
            >
              Tradui kounye a
            </div>
          </div>
        </PhoneFrame>
      </div>

      <Caption text="Premye etap la, ale sou www.traduzfacil.com" sub="Etap 1" />
    </AbsoluteFill>
  );
};
