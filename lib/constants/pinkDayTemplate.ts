export interface PinkDayScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
}

export const PINK_DAY_PALETTE = {
  background: "#FFF8FC",
  surface: "#FFFFFF",
  softPink: "#FFE9F1",
  blush: "#F7BFD5",
  accent: "#A43F66",
  text: "#51253E",
  glow: "#d94676",
};

export const PINK_DAY_SCENES: PinkDayScene[] = [
  {
    order: 1,
    file: "/templates/our-little-pink-day/01-my-favorite-meetup.png",
    title: "My favorite meetup",
    storyBeat: "An ordinary date begins with their favorite person.",
    caption: "My favorite plans start with you.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 2,
    file: "/templates/our-little-pink-day/02-one-dessert-two-spoons.png",
    title: "One dessert, two spoons",
    storyBeat: "A shared strawberry dessert becomes their little moment.",
    caption: "One dessert. Two spoons.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 3,
    file: "/templates/our-little-pink-day/03-i-won-this-for-you.png",
    title: "I won this for you",
    storyBeat: "He surprises her with a little white bunny plush.",
    caption: "A little surprise, just because.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 4,
    file: "/templates/our-little-pink-day/04-a-little-photo-booth-moment.png",
    title: "A little photo-booth moment",
    storyBeat: "They save a silly, happy moment together.",
    caption: "Our kind of photo booth.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 5,
    file: "/templates/our-little-pink-day/05-one-umbrella-for-two.png",
    title: "One umbrella for two",
    storyBeat: "A little rain brings them closer.",
    caption: "A little closer when it rains.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
  {
    order: 6,
    file: "/templates/our-little-pink-day/06-you-are-my-cozy-place.png",
    title: "You are my cozy place",
    storyBeat: "Their day ends with the comfort of being together.",
    caption: "You are my cozy place.",
    durationMs: 5000,
    width: 1672,
    height: 941,
  },
];

export const PINK_DAY_CONFIG = {
  id: "our-little-pink-day",
  name: "Our Little Pink Day",
  tagline: "Little moments. Favorite person.",
  defaultMessage: "My favorite part of any day is you.",
  finalQuestion: "Pick our next little date?",
  dateOptions: [
    { id: "opt_dessert", label: "Dessert date", icon: "🍰", description: "Strawberries, sweet treats & cafe laughs" },
    { id: "opt_arcade", label: "Arcade and photo booth", icon: "📸", description: "Claw machines, silly photo strips & games" },
    { id: "opt_cozy", label: "A cozy night in", icon: "☕", description: "Matching hoodies, warm blankets & a movie" },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export interface FloatingGalleryItemDef {
  id: string;
  url: string;
  quote: string;
  author?: string;
  caption?: string;
  aspect?: "tall" | "wide" | "square" | "circle" | "badge";
  aspectRatio?: "tall" | "wide" | "square" | "circle" | "badge" | "portrait";
  size?: "sm" | "md" | "lg" | "xl";
}

export const DEFAULT_FLOATING_GALLERY_ITEMS: FloatingGalleryItemDef[] = [
  {
    id: "float_1",
    url: "/templates/our-little-pink-day/01-my-favorite-meetup.png",
    aspect: "wide",
    quote: "Every second waiting for you was worth the lifetime of joy you brought into my world.",
    author: "Our Favorite Meetup",
  },
  {
    id: "float_2",
    url: "/templates/our-little-pink-day/03-i-won-this-for-you.png",
    aspect: "tall",
    quote: "The way your eyes lit up when you held that bunny plush melted every piece of my heart.",
    author: "The Sweetest Surprise",
  },
  {
    id: "float_3",
    url: "/templates/our-little-pink-day/02-one-dessert-two-spoons.png",
    aspect: "square",
    quote: "One dessert, two spoons, and a thousand unspoken promises between us.",
    author: "Shared Sweetness",
  },
  {
    id: "float_4",
    url: "/templates/our-little-pink-day/05-one-umbrella-for-two.png",
    aspect: "tall",
    quote: "I never mind the rain storms, as long as I am standing close under the same umbrella with you.",
    author: "Under The Rain",
  },
  {
    id: "float_5",
    url: "/templates/our-little-pink-day/04-a-little-photo-booth-moment.png",
    aspect: "circle",
    quote: "Our silly photo booth laughter is my forever favorite soundtrack.",
    author: "Silly Photo Booth",
  },
  {
    id: "float_6",
    url: "/templates/our-little-pink-day/06-you-are-my-cozy-place.png",
    aspect: "wide",
    quote: "In your arms is the only place on earth where the loud world turns completely quiet.",
    author: "My Cozy Place",
  },
  {
    id: "float_7",
    url: "/templates/our-little-pink-day/04-a-little-photo-booth-moment.png",
    aspect: "badge",
    quote: "You + Me = The best thing that ever happened to me.",
    author: "Forever & Always",
  },
];
