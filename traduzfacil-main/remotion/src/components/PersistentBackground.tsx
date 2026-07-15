import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "../theme";

const Blob: React.FC<{
  x: number; y: number; size: number; color: string; speed: number; phase: number;
}> = ({ x, y, size, color, speed, phase }) => {
  const frame = useCurrentFrame();
  const dx = Math.sin((frame * speed + phase) / 60) * 40;
  const dy = Math.cos((frame * speed + phase) / 70) * 50;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(90px)",
        opacity: 0.5,
      }}
    />
  );
};

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shift = interpolate(frame, [0, 1740], [0, 18]);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${160 + shift}deg, ${C.deep} 0%, ${C.deep2} 55%, ${C.ink} 100%)`,
        }}
      />
      <Blob x={-150} y={120} size={600} color={C.blue} speed={1} phase={0} />
      <Blob x={width - 450} y={height - 700} size={650} color={C.green} speed={0.8} phase={30} />
      <Blob x={width - 350} y={150} size={420} color={C.blueGlow} speed={1.2} phase={60} />
      {/* dotted grid texture */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "44px 44px",
          opacity: 0.6,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 80% at 50% 40%, transparent 45%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
