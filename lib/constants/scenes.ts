export interface ScenePalette {
  accent: string;
  glow: string;
  text: string;
  dark: string;
  card: string;
}

export interface SceneDefinition {
  label: string;
  description: string;
  emoji: string;
  bg: string;
  palette: ScenePalette;
}

export const SCENES: SceneDefinition[] = [
  {
    label: "Starry Night",
    description: "Midnight magic under the stars",
    emoji: "🌟",
    bg: "/anime theme/images/romantic-love-3840x2160-24698.jpg",
    palette: { accent: "#a78bfa", glow: "#7c3aed", text: "#f3e8ff", dark: "#0f0c29", card: "rgba(139,92,246,0.15)" },
  },
  {
    label: "Sunset Balcony",
    description: "Golden hour cherry blossoms",
    emoji: "🌸",
    bg: "/anime theme/images/cozy-happiness-bx-1920x1080.jpg",
    palette: { accent: "#fbbf24", glow: "#d97706", text: "#fff7ed", dark: "#1c0a00", card: "rgba(251,191,36,0.12)" },
  },
  {
    label: "Beneath the Clouds",
    description: "Peaceful sky, just us two",
    emoji: "☁️",
    bg: "/anime theme/images/together-beneath-the-clouds-ry-1920x1080.jpg",
    palette: { accent: "#38bdf8", glow: "#0284c7", text: "#e0f2fe", dark: "#082f49", card: "rgba(56,189,248,0.12)" },
  },
  {
    label: "Golden Sunset",
    description: "Warm evening, heart full",
    emoji: "🌅",
    bg: "/anime theme/images/the-beauty-of-sunset-and-you-iy-1920x1080.jpg",
    palette: { accent: "#fb923c", glow: "#ea580c", text: "#fff7ed", dark: "#1c0a00", card: "rgba(251,146,60,0.12)" },
  },
];
