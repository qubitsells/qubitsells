import type { FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

export interface MidnightKeyScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
  interactivePrompt?: {
    type: "key" | "gate" | "heart" | "dance";
    buttonText: string;
    description?: string;
  };
}

export const MIDNIGHT_KEY_PALETTE = {
  background: "#120D1C",
  surface: "#1D1429",
  surfaceElevated: "#291D38",
  border: "#4A3258",
  borderHover: "#75536D",
  accent: "#F3B574", // Warm Pumpkin Amber
  accentHover: "#FFD2A4",
  amber: "#FFBC73",
  plum: "#593354",
  deepPlum: "#342038",
  mauve: "#D6BDC8",
  glow: "#F3B574",
  text: "#F7EDE2", // Warm Ivory
  textMuted: "#D6BDC8",
  textSubtle: "#AA91A5",
  card: "#1E152A",
};

export const MIDNIGHT_KEY_SCENES: MidnightKeyScene[] = [
  {
    order: 1,
    file: "/templates/halloween-midnight-key/01-the-hidden-key.png",
    title: "The hidden key",
    storyBeat: "A tiny discovery starts their Halloween adventure.",
    caption: "A tiny discovery starts our Halloween adventure.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "key",
      buttonText: "Collect the brass key 🗝️",
      description: "You found the key to tonight's mystery",
    },
  },
  {
    order: 2,
    file: "/templates/halloween-midnight-key/02-follow-the-fireflies.png",
    title: "Follow the fireflies",
    storyBeat: "They follow a glowing trail across a little bridge.",
    caption: "Following the fireflies across the midnight bridge.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 3,
    file: "/templates/halloween-midnight-key/03-the-secret-garden-gate.png",
    title: "The secret garden gate",
    storyBeat: "Their key opens a path into the garden.",
    caption: "Our brass key unlocks the secret garden gate.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "gate",
      buttonText: "Unlock the garden gate 🗝️",
      description: "Turn the key and step through the mist",
    },
  },
  {
    order: 4,
    file: "/templates/halloween-midnight-key/04-a-treasure-around-the-corner.png",
    title: "A treasure around the corner",
    storyBeat: "A playful garden maze leads them to a hidden chest.",
    caption: "A playful garden maze leads us to a hidden chest.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 5,
    file: "/templates/halloween-midnight-key/05-the-heart-of-the-adventure.png",
    title: "The heart of the adventure",
    storyBeat: "The treasure is a glowing heart they discover together.",
    caption: "The true treasure is this glowing heart we found together.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "heart",
      buttonText: "Reveal my message ✨",
      description: "Touch the glowing glass heart to read what's inside",
    },
  },
  {
    order: 6,
    file: "/templates/halloween-midnight-key/06-dancing-under-a-halloween-moon.png",
    title: "Dancing under a Halloween moon",
    storyBeat: "Their adventure ends with a quiet dance beneath the moon.",
    caption: "Dancing softly together under the Halloween moon.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "dance",
      buttonText: "Our Halloween invitation 🌙",
      description: "Will you join me for our next adventure?",
    },
  },
];

export const MIDNIGHT_KEY_CONFIG = {
  id: "halloween-midnight-key",
  name: "The Midnight Key",
  tagline: "A little adventure, just for us.",
  defaultOpening: "A little adventure, just for us.",
  defaultMessage: "Every little adventure is better with you.",
  finalQuestion: "Will you join me for a Halloween adventure?",
  dateOptions: [
    {
      id: "opt_walk",
      label: "A moonlit walk",
      icon: "Moon",
      description: "Lanterns, crisp autumn air & starry quiet",
    },
    {
      id: "opt_movie",
      label: "A cozy mystery movie",
      icon: "Film",
      description: "Warm cider, soft blankets & spooky suspense",
    },
    {
      id: "opt_hunt",
      label: "Plan our own treasure hunt",
      icon: "Key",
      description: "Secret clues, fun riddles & sweet rewards",
    },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export const DEFAULT_MIDNIGHT_GALLERY_ITEMS: FloatingGalleryItem[] = [
  {
    id: "mid_1",
    url: "/templates/halloween-midnight-key/01-the-hidden-key.png",
    aspect: "wide",
    quote: "In a world of quiet shadows, you are the light that unlocked my heart.",
    author: "The Hidden Key",
  },
  {
    id: "mid_2",
    url: "/templates/halloween-midnight-key/02-follow-the-fireflies.png",
    aspect: "tall",
    quote: "I would follow your footsteps anywhere, even across the misty midnight bridge.",
    author: "Follow The Fireflies",
  },
  {
    id: "mid_3",
    url: "/templates/halloween-midnight-key/03-the-secret-garden-gate.png",
    aspect: "square",
    quote: "Behind every locked garden gate, I only hope to find you waiting on the other side.",
    author: "The Garden Gate",
  },
  {
    id: "mid_4",
    url: "/templates/halloween-midnight-key/04-a-treasure-around-the-corner.png",
    aspect: "tall",
    quote: "Every corner turned with you feels like discovering a secret world meant only for two.",
    author: "Around The Corner",
  },
  {
    id: "mid_5",
    url: "/templates/halloween-midnight-key/05-the-heart-of-the-adventure.png",
    aspect: "circle",
    quote: "The only treasure that ever mattered was the moment you whispered you love me.",
    author: "The Glowing Heart",
  },
  {
    id: "mid_6",
    url: "/templates/halloween-midnight-key/06-dancing-under-a-halloween-moon.png",
    aspect: "wide",
    quote: "When autumn leaves swirl around us, all I hear is the sweet rhythm of your heartbeat.",
    author: "Under The Moon",
  },
  {
    id: "mid_7",
    url: "/templates/halloween-midnight-key/05-the-heart-of-the-adventure.png",
    aspect: "badge",
    quote: "You will always be my favorite kind of magic in this whole spooky, beautiful universe.",
    author: "My Favorite Magic",
  },
  {
    id: "mid_8",
    url: "/templates/halloween-midnight-key/06-dancing-under-a-halloween-moon.png",
    aspect: "wide",
    quote: "Under every Halloween moon, I would still choose to dance through eternity with you.",
    author: "Forever & Always",
  },
];
