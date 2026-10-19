import type { FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

export interface HauntedWaltzScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
  interactivePrompt?: {
    type: "manor" | "footsteps" | "ballroom" | "together" | "waltz" | "candle";
    buttonText: string;
    description?: string;
  };
}

export const HAUNTED_WALTZ_PALETTE = {
  background: "#0B1015", // Deep gothic midnight
  surface: "#152026", // Slate night
  surfaceElevated: "#172B31", // Spectral teal slate
  border: "#2E414A",
  borderHover: "#90C9C6",
  accent: "#90C9C6", // Spectral moonlight teal
  accentHover: "#A4DAD7",
  amber: "#FFCC99", // Warm candle amber
  burgundy: "#593354", // Victorian ghost burgundy
  deepBurgundy: "#302034",
  mauve: "#B8C6CE", // Mist silver
  glow: "#90C9C6",
  text: "#EDF1ED", // Moonlight bone white
  textMuted: "#B8C6CE",
  textSubtle: "#8B9DA6",
  card: "#131B21",
};

export const HAUNTED_WALTZ_SCENES: HauntedWaltzScene[] = [
  {
    order: 1,
    file: "/templates/spooky-the-haunted-waltz/01-the-manor-at-midnight.png",
    title: "The manor at midnight",
    storyBeat: "A couple approaches a haunted manor, with two figures watching from an upstairs window.",
    caption: "A silhouette in the high gothic window watches us arrive beneath the midnight mist.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "manor",
      buttonText: "Step into the grand manor 🕯️",
      description: "Touch the brass knocker to step inside out of the cold",
    },
  },
  {
    order: 2,
    file: "/templates/spooky-the-haunted-waltz/02-footsteps-with-no-owner.png",
    title: "Footsteps with no owner",
    storyBeat: "Ghostly traces lead the couple deeper into the house.",
    caption: "Luminous footprints softly glow across the floorboards, guiding us forward.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "footsteps",
      buttonText: "Follow the glowing steps ✨",
      description: "Walk hand-in-hand along the enchanted path",
    },
  },
  {
    order: 3,
    file: "/templates/spooky-the-haunted-waltz/03-the-ghosts-in-the-ballroom.png",
    title: "The ghosts in the ballroom",
    storyBeat: "Two spirits appear as if waiting for their last dance.",
    caption: "In the moonlit ballroom, two gentle spirits welcome us with a silent bow.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "ballroom",
      buttonText: "Greet the ballroom spirits 👻",
      description: "A soft spectral waltz begins playing from nowhere",
    },
  },
  {
    order: 4,
    file: "/templates/spooky-the-haunted-waltz/04-stay-close-to-me.png",
    title: "Stay close to me",
    storyBeat: "They steady each other and choose to face the mystery together.",
    caption: "Holding tight to your warmth, no shadow in the dark feels frightening.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "together",
      buttonText: "Reveal my message 💌",
      description: "A candlelit card opens with my words for you",
    },
  },
  {
    order: 5,
    file: "/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png",
    title: "The haunted waltz",
    storyBeat: "The living couple joins the spirits for a final waltz.",
    caption: "Spinning together under the chandelier, our hearts beat in perfect unison.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "waltz",
      buttonText: "Join the midnight waltz 🎶",
      description: "Dance through the spectral ballroom light",
    },
  },
  {
    order: 6,
    file: "/templates/spooky-the-haunted-waltz/06-until-the-last-candle.png",
    title: "Until the last candle",
    storyBeat: "At dawn, they leave with a memory only the two of them understand.",
    caption: "Resting outside as the dawn sky breaks, the spirits continue their timeless dance.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "candle",
      buttonText: "Our next spooky night 🌙",
      description: "Choose our next adventure together",
    },
  },
];

export const HAUNTED_WALTZ_CONFIG = {
  id: "spooky-the-haunted-waltz",
  name: "The Haunted Waltz",
  tagline: "Hold my hand. Let’s see what’s waiting.",
  defaultOpening: "Hold my hand. Let’s see what’s waiting.",
  defaultMessage: "Whatever waits in the dark, I want you beside me.",
  finalQuestion: "What should our next spooky night be?",
  dateOptions: [
    {
      id: "opt_movie",
      label: "Horror movie night",
      icon: "Film",
      description: "Cozy blankets, warm cider & thrilling suspense",
    },
    {
      id: "opt_manor",
      label: "A haunted-house date",
      icon: "Ghost",
      description: "Exploring mysterious hallways hand in hand",
    },
    {
      id: "opt_stories",
      label: "Ghost stories together",
      icon: "Flame",
      description: "Flickering candlelight, whispered tales & warm cuddles",
    },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export const DEFAULT_HAUNTED_WALTZ_GALLERY_ITEMS: FloatingGalleryItem[] = [
  {
    id: "hw_1",
    url: "/templates/spooky-the-haunted-waltz/01-the-manor-at-midnight.png",
    aspect: "wide",
    quote: "Even in the darkest gothic shadows, your presence is my guiding lantern light.",
    author: "The Midnight Manor",
  },
  {
    id: "hw_2",
    url: "/templates/spooky-the-haunted-waltz/02-footsteps-with-no-owner.png",
    aspect: "tall",
    quote: "I will follow you into any mystery, as long as our fingers are intertwined.",
    author: "Ghostly Footsteps",
  },
  {
    id: "hw_3",
    url: "/templates/spooky-the-haunted-waltz/03-the-ghosts-in-the-ballroom.png",
    aspect: "square",
    quote: "True love echoes through stone walls, outlasting even the centuries.",
    author: "Ballroom Spirits",
  },
  {
    id: "hw_4",
    url: "/templates/spooky-the-haunted-waltz/04-stay-close-to-me.png",
    aspect: "tall",
    quote: "Whatever waits in the dark, having you beside me makes me fearless.",
    author: "Stay Close To Me",
  },
  {
    id: "hw_5",
    url: "/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png",
    aspect: "circle",
    quote: "A single dance with you under the moon is worth a thousand quiet eternities.",
    author: "The Spectral Waltz",
  },
  {
    id: "hw_6",
    url: "/templates/spooky-the-haunted-waltz/06-until-the-last-candle.png",
    aspect: "wide",
    quote: "Until the very last candle flickers out, my heart will always belong to you.",
    author: "Until The Last Candle",
  },
  {
    id: "hw_7",
    url: "/templates/spooky-the-haunted-waltz/04-stay-close-to-me.png",
    aspect: "badge",
    quote: "You turn every spooky night into something wonderfully romantic and magical.",
    author: "My Gothic Romance",
  },
  {
    id: "hw_8",
    url: "/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png",
    aspect: "wide",
    quote: "If our story is a haunting, let it be the sweetest dance that ever lived.",
    author: "Forever In Step",
  },
];
