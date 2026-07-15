export const FPS = 30;

// Brand palette
export const C = {
  deep: "#08152E",
  deep2: "#0E2350",
  blue: "#2563EB",
  blueGlow: "#5B9BF6",
  green: "#22C55E",
  greenGlow: "#5BE38A",
  white: "#FFFFFF",
  cream: "#F5F8FF",
  ink: "#0B1B3A",
  muted: "#A9BBDA",
};

// Scene durations in frames (30fps)
export const SCENE_FRAMES = [300, 225, 210, 210, 165, 210, 210, 180, 165];
export const TRANSITION = 15;

// Narration files + in-scene start offset (frames)
export const NARRATION = [
  "vo1", "vo2", "vo3", "vo4", "vo5", "vo6", "vo7", "vo8", "vo9",
];
export const VO_OFFSET = 14;

export const totalFrames =
  SCENE_FRAMES.reduce((a, b) => a + b, 0) -
  (SCENE_FRAMES.length - 1) * TRANSITION;
