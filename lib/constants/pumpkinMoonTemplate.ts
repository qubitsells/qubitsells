import type { FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

export const PUMPKIN_MOON_PALETTE = {
  background: "#0F0A06",     // Obsidian autumn night
  surface: "#1C1109",        // Spiced dark oak
  card: "#2A180C",           // Warm pumpkin smoke
  border: "#542D14",         // Copper clove border
  accent: "#FF7518",         // Radiant jack-o'-lantern orange
  accentHover: "#FF8C38",
  secondary: "#8C441B",      // Deep roasted pumpkin
  text: "#FFF3E3",           // Candlelight peach cream
  textMuted: "#C49A76",      // Spiced cinnamon caramel
  glow: "rgba(255, 117, 24, 0.45)", // Warm candle fire glow
  dark: "#080503",
};

export interface PumpkinMoonScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
  interactivePrompt?: {
    type: "meeting" | "pumpkin" | "lantern" | "ghost" | "letter" | "date";
    buttonText: string;
    description: string;
  };
}

export const PUMPKIN_MOON_SCENES: PumpkinMoonScene[] = [
  {
    order: 1,
    file: "/templates/halloween-pumpkin-moon/01-the-halloween-meeting.png",
    title: "The Halloween meeting",
    storyBeat: "The couple meets in costume outside a glowing autumn cottage.",
    caption: "Meeting outside the glowing cottage as the autumn magic begins.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "meeting",
      buttonText: "Join under the porch light 🎃",
      description: "Step into our cozy autumn evening together",
    },
  },
  {
    order: 2,
    file: "/templates/halloween-pumpkin-moon/02-picking-our-pumpkins.png",
    title: "Picking our pumpkins",
    storyBeat: "They choose two pumpkins together under the autumn leaves.",
    caption: "Choosing our two favorite pumpkins together in the patch.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 3,
    file: "/templates/halloween-pumpkin-moon/03-lanterns-we-made.png",
    title: "Lanterns we made",
    storyBeat: "Their pumpkins become glowing lanterns carved side by side.",
    caption: "Carving glowing jack-o'-lanterns side by side.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "lantern",
      buttonText: "Light the candle inside ✨",
      description: "Watch our carved faces glow warm in the dark",
    },
  },
  {
    order: 4,
    file: "/templates/halloween-pumpkin-moon/04-a-friendly-little-boo.png",
    title: "A friendly little boo",
    storyBeat: "A tiny friendly ghost surprises them with an invitation.",
    caption: "A tiny friendly ghost surprises us with a secret invitation.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 5,
    file: "/templates/halloween-pumpkin-moon/05-the-midnight-invitation.png",
    title: "The moonlit invitation",
    storyBeat: "They receive the ghost's mysterious sealed letter.",
    caption: "Unfolding the sealed letter to reveal what's inside.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "letter",
      buttonText: "Open the sealed letter 💌",
      description: "Break the wax seal to reveal my message",
    },
  },
  {
    order: 6,
    file: "/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png",
    title: "Our pumpkin moon date",
    storyBeat: "They end the evening together beneath the full harvest moon.",
    caption: "Sitting close together beneath the glowing pumpkin moon.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "date",
      buttonText: "Our Halloween invitation 🌙",
      description: "Will you be my Halloween date?",
    },
  },
];

export const PUMPKIN_MOON_CONFIG = {
  id: "halloween-pumpkin-moon",
  name: "Pumpkin Moon Date",
  tagline: "A little Halloween magic, just for you.",
  defaultOpening: "A little Halloween magic, just for you.",
  defaultMessage: "Of all the little surprises this season, sharing it with you is my favorite.",
  finalQuestion: "Will you be my Halloween date?",
  dateOptions: [
    {
      id: "opt_movie",
      label: "Cozy movie night",
      icon: "Film",
      description: "Warm blankets, pumpkin treats & spooky movies",
    },
    {
      id: "opt_picnic",
      label: "Pumpkin picnic",
      icon: "Sparkles",
      description: "Carving lanterns, spiced cider & sweet autumn snacks",
    },
    {
      id: "opt_walk",
      label: "Moonlit walk",
      icon: "Moon",
      description: "Lanterns in hand, crisp breeze & starry autumn sky",
    },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export const DEFAULT_PUMPKIN_MOON_GALLERY_ITEMS: FloatingGalleryItem[] = [
  {
    id: "pump_1",
    url: "/templates/halloween-pumpkin-moon/01-the-halloween-meeting.png",
    aspect: "wide",
    quote: "Under the pumpkin moon, every shadow feels sweet with your hand in mine.",
    author: "The Autumn Meeting",
  },
  {
    id: "pump_2",
    url: "/templates/halloween-pumpkin-moon/02-picking-our-pumpkins.png",
    aspect: "tall",
    quote: "Out of all the pumpkins in the whole patch, my heart would always choose you.",
    author: "Picking Our Pumpkins",
  },
  {
    id: "pump_3",
    url: "/templates/halloween-pumpkin-moon/03-lanterns-we-made.png",
    aspect: "square",
    quote: "The glow in our lanterns will never shine as bright as your smile in the dark.",
    author: "Lanterns We Made",
  },
  {
    id: "pump_4",
    url: "/templates/halloween-pumpkin-moon/04-a-friendly-little-boo.png",
    aspect: "tall",
    quote: "A friendly little surprise that brought us even closer together.",
    author: "A Friendly Little Boo",
  },
  {
    id: "pump_5",
    url: "/templates/halloween-pumpkin-moon/05-the-midnight-invitation.png",
    aspect: "circle",
    quote: "Of all the little surprises this season, sharing it with you is my favorite.",
    author: "The Moonlit Invitation",
  },
  {
    id: "pump_6",
    url: "/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png",
    aspect: "wide",
    quote: "Beneath the harvest moon, you are my favorite Halloween miracle.",
    author: "Our Pumpkin Moon Date",
  },
  {
    id: "pump_7",
    url: "/templates/halloween-pumpkin-moon/03-lanterns-we-made.png",
    aspect: "badge",
    quote: "You make every spooky night feel warm, magical, and full of love.",
    author: "Pumpkin Magic",
  },
  {
    id: "pump_8",
    url: "/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png",
    aspect: "wide",
    quote: "Forever carving sweet memories under the Halloween sky with you.",
    author: "Forever & Always",
  },
];
