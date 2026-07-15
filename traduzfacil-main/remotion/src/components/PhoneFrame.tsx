import React from "react";
import { C } from "../theme";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  scale?: number;
  rotate?: number;
}> = ({ children, width = 560, scale = 1, rotate = 0 }) => {
  const height = width * 2.06;
  return (
    <div
      style={{
        width,
        height,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        borderRadius: 64,
        background: "#0a1020",
        padding: 16,
        boxShadow:
          "0 40px 90px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.06) inset",
        position: "relative",
      }}
    >
      {/* screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 50,
          overflow: "hidden",
          background: C.cream,
          position: "relative",
        }}
      >
        {children}
      </div>
      {/* notch */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: "50%",
          transform: "translateX(-50%)",
          width: 150,
          height: 34,
          borderRadius: 20,
          background: "#0a1020",
          zIndex: 20,
        }}
      />
    </div>
  );
};
