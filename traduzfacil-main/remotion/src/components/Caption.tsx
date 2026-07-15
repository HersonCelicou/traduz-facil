import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { C } from "../theme";
import { body } from "../fonts";

export const Caption: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 120 } });
  const y = interpolate(enter, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 130,
        left: 60,
        right: 60,
        transform: `translateY(${y}px)`,
        opacity: enter,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(8, 21, 46, 0.72)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 28,
          padding: "26px 40px",
          backdropFilter: "none",
        }}
      >
        {sub ? (
          <div
            style={{
              fontFamily: body,
              fontWeight: 600,
              fontSize: 30,
              color: C.green,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {sub}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: body,
            fontWeight: 500,
            fontSize: 42,
            lineHeight: 1.3,
            color: C.white,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};
