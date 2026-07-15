import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { body } from "../fonts";

export const TranslatorScreen: React.FC<{
  inputText: string;
  resultOpacity: number;
  resultY: number;
  resultText: string;
  btnScale?: number;
  audioActive?: boolean;
}> = ({ inputText, resultOpacity, resultY, resultText, btnScale = 1, audioActive = false }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ padding: "100px 40px 40px", height: "100%", background: C.cream }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 34 }}>
        <Img src={staticFile("images/logo.png")} style={{ width: 64, height: 64, borderRadius: 16 }} />
        <div style={{ fontFamily: body, fontWeight: 800, fontSize: 36, color: C.ink }}>Traduz Fácil</div>
      </div>

      {/* language selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#e7edf9", borderRadius: 18, padding: "18px 26px", marginBottom: 26 }}>
        <span style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: C.blue }}>Português</span>
        <span style={{ fontSize: 30, color: C.muted }}>⇄</span>
        <span style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: C.green }}>Kreyòl</span>
      </div>

      {/* input */}
      <div style={{ background: "#fff", border: "2px solid #d6def0", borderRadius: 22, padding: 28, minHeight: 150 }}>
        <div style={{ fontFamily: body, fontSize: 34, color: C.ink, lineHeight: 1.4 }}>
          {inputText}
          <span style={{ opacity: inputText.length > 0 && Math.floor(frame / 8) % 2 === 0 ? 0.7 : 0, color: C.blue }}>|</span>
        </div>
      </div>

      {/* translate button */}
      <div
        style={{
          transform: `scale(${btnScale})`,
          marginTop: 26,
          background: `linear-gradient(135deg, ${C.blue}, ${C.blueGlow})`,
          color: C.white, fontFamily: body, fontWeight: 800, fontSize: 34,
          textAlign: "center", padding: "24px 0", borderRadius: 18,
          boxShadow: `0 12px 30px ${C.blue}55`,
        }}
      >
        Tradui →
      </div>

      {/* result */}
      <div
        style={{
          opacity: resultOpacity,
          transform: `translateY(${resultY}px)`,
          marginTop: 30,
          background: `linear-gradient(135deg, #ecfdf3, #d7f7e3)`,
          border: `2px solid ${C.green}`,
          borderRadius: 22,
          padding: 28,
        }}
      >
        <div style={{ fontFamily: body, fontSize: 22, color: C.green, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>
          KREYÒL AYISYEN
        </div>
        <div style={{ fontFamily: body, fontSize: 36, color: C.ink, fontWeight: 600, lineHeight: 1.4 }}>
          {resultText}
        </div>

        {audioActive ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
            <div
              style={{
                width: 70, height: 70, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.green}, ${C.greenGlow})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 34, color: C.white,
                boxShadow: `0 0 0 ${8 + Math.sin(frame / 5) * 6}px ${C.green}33`,
              }}
            >
              🔊
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const h = 14 + Math.abs(Math.sin((frame + i * 6) / 6)) * 46;
                return <div key={i} style={{ width: 9, height: h, borderRadius: 6, background: C.green }} />;
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
