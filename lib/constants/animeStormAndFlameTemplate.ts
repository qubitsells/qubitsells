import type { FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

export interface StormAndFlameScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
  interactivePrompt?: {
    type: "spark" | "awaken" | "shield" | "promise" | "combine" | "rest";
    buttonText: string;
    description?: string;
  };
}

export const STORM_AND_FLAME_PALETTE = {
  background: "#070F1E", // Deep Battle Fantasy Storm Sky
  surface: "#0F1A2E", // Night Slate Surface
  surfaceElevated: "#18253E", // Elevated Card Surface
  border: "#273B5E", // Storm Steel Border
  borderHover: "#3B588C", // Electric Hover Border
  cyan: "#00E5FF", // Her Cyan Lightning
  cyanHover: "#80F0FF",
  cyanGlow: "rgba(0, 229, 255, 0.4)",
  amber: "#FF9900", // His Golden Amber Flame
  amberHover: "#FFB84D",
  amberGlow: "rgba(255, 153, 0, 0.4)",
  flame: "#F97316", // Vibrant Orange Flare
  glow: "#38BDF8", // Electric Energy Aura
  accent: "#00E5FF", // Primary Cyan Accent
  accentHover: "#80F0FF",
  navyDark: "#050B16",
  text: "#EFF7FF", // Crisp Celestial White-Blue
  textMuted: "#B9CBDF", // Soft Slate Blue
  textSubtle: "#738CA8", // Subdued Slate
  card: "#0F1A2E",
};

export const STORM_AND_FLAME_SCENES: StormAndFlameScene[] = [
  {
    order: 1,
    file: "/templates/anime-storm-and-flame/01-before-the-storm.png",
    title: "Before the storm",
    storyBeat: "A playful training moment reveals affection beneath their strength.",
    caption: "I knew you were different.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "spark",
      buttonText: "Ignite our spark ⚡",
      description: "Touch the electric blade to start our journey",
    },
  },
  {
    order: 2,
    file: "/templates/anime-storm-and-flame/02-the-awakening.png",
    title: "The awakening",
    storyBeat: "As a storm gathers, they awaken their complementary powers.",
    caption: "You awakened something in me.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "awaken",
      buttonText: "Awaken power 🔥",
      description: "Let cyan lightning and golden fire intertwine",
    },
  },
  {
    order: 3,
    file: "/templates/anime-storm-and-flame/03-i-have-your-back.png",
    title: "I have your back",
    storyBeat: "They protect each other when the storm strikes.",
    caption: "Whatever comes, we face it together.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "shield",
      buttonText: "Stand with me 🛡️",
      description: "Side by side against any tempest",
    },
  },
  {
    order: 4,
    file: "/templates/anime-storm-and-flame/04-a-promise-in-the-storm.png",
    title: "A promise in the storm",
    storyBeat: "In a quiet moment, they choose to face everything together.",
    caption: "My promise is to stand beside you.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "promise",
      buttonText: "Unseal our sacred promise ✨",
      description: "Read the vow whispered beneath the thunder",
    },
  },
  {
    order: 5,
    file: "/templates/anime-storm-and-flame/05-our-combined-strength.png",
    title: "Our combined strength",
    storyBeat: "Their bond turns two powers into one overwhelming force.",
    caption: "Together, we rise.",
    durationMs: 5000,
    width: 1672,
    height: 940,
    interactivePrompt: {
      type: "combine",
      buttonText: "Combine our strength ⚡🔥",
      description: "Two powers fused into one unbreakable bond",
    },
  },
  {
    order: 6,
    file: "/templates/anime-storm-and-flame/06-after-the-storm.png",
    title: "After the storm",
    storyBeat: "Their power settles, and their love remains.",
    caption: "My favorite place is beside you.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "rest",
      buttonText: "Our next chapter 💫",
      description: "Where our hearts rest peacefully together",
    },
  },
];

export const STORM_AND_FLAME_CONFIG = {
  id: "anime-storm-and-flame",
  name: "Storm & Flame",
  tagline: "Two powers. One promise.",
  defaultOpening: "Two powers. One promise.",
  defaultMessage: "With you beside me, I am ready for every new chapter.",
  defaultPromise: "I promise to be your shield against the storm and the warmth in your darkest night.",
  finalQuestion: "What will our next adventure be?",
  dateOptions: [
    {
      id: "opt_anime",
      label: "Anime night together",
      icon: "Film",
      description: "Binge our favorite battle anime under warm blankets",
    },
    {
      id: "opt_date",
      label: "Plan our next date",
      icon: "Sparkles",
      description: "Romantic dinner, starlit walk & tender laughs",
    },
    {
      id: "opt_promise",
      label: "Write our promise",
      icon: "Heart",
      description: "A quiet moment together sealing our sacred bond",
    },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export const DEFAULT_STORM_AND_FLAME_GALLERY_ITEMS: FloatingGalleryItem[] = [
  {
    id: "sf_1",
    url: "/templates/anime-storm-and-flame/01-before-the-storm.png",
    aspect: "wide",
    quote: "Even before the lightning struck, my heart recognized your warmth.",
    author: "Before The Storm",
  },
  {
    id: "sf_2",
    url: "/templates/anime-storm-and-flame/02-the-awakening.png",
    aspect: "tall",
    quote: "When your fire met my lightning, we awakened a love stronger than any battle.",
    author: "The Awakening",
  },
  {
    id: "sf_3",
    url: "/templates/anime-storm-and-flame/03-i-have-your-back.png",
    aspect: "square",
    quote: "Stand behind me when you need rest; stand beside me when we conquer the world.",
    author: "I Have Your Back",
  },
  {
    id: "sf_4",
    url: "/templates/anime-storm-and-flame/04-a-promise-in-the-storm.png",
    aspect: "tall",
    quote: "In the eye of every tempest, my only promise is to never let go of your hand.",
    author: "A Promise In The Storm",
  },
  {
    id: "sf_5",
    url: "/templates/anime-storm-and-flame/05-our-combined-strength.png",
    aspect: "circle",
    quote: "Two individual flames are bright, but united we set the whole night sky ablaze.",
    author: "Combined Strength",
  },
  {
    id: "sf_6",
    url: "/templates/anime-storm-and-flame/06-after-the-storm.png",
    aspect: "wide",
    quote: "When the thunder fades and the clouds part, my favorite place will always be right beside you.",
    author: "After The Storm",
  },
  {
    id: "sf_7",
    url: "/templates/anime-storm-and-flame/05-our-combined-strength.png",
    aspect: "badge",
    quote: "Two powers. One heart. An eternal adventure together.",
    author: "One Sacred Bond",
  },
  {
    id: "sf_8",
    url: "/templates/anime-storm-and-flame/04-a-promise-in-the-storm.png",
    aspect: "wide",
    quote: "You are the lightning in my veins and the flame in my soul.",
    author: "Forever United",
  },
];
