import type { FloatingGalleryItem } from "@/components/templates/FloatingQuoteGallery";

export interface StarlitStoryScene {
  order: number;
  file: string;
  title: string;
  storyBeat: string;
  caption: string;
  durationMs: number;
  width: number;
  height: number;
  interactivePrompt?: {
    type: "meeting" | "rose" | "letter" | "opens" | "bench" | "starlit";
    buttonText: string;
    description?: string;
  };
}

export const STARLIT_STORY_PALETTE = {
  background: "#FAF6F0", // Warm ivory cream / linen
  surface: "#FFFFFF", // Clean pure white card
  surfaceElevated: "#FFF8F4", // Soft peach blush
  border: "#F0D5C9", // Warm peach-rose border
  borderHover: "#C26D7A", // Dusty rose accent
  accent: "#C26D7A", // Warm dusty rose (from woman's dress)
  accentHover: "#B55D6B",
  gold: "#D99443", // Warm golden hour & string-light glow
  rose: "#C26D7A", // Dusty rose
  roseLight: "#FCE8E6",
  peach: "#FAD4A8", // Peach dusk
  olive: "#6B7A58", // Olive green touch from man's jacket
  text: "#3A231C", // Deep warm espresso text
  textMuted: "#75564C", // Warm cocoa
  textSubtle: "#9C7C72", // Soft mocha
  card: "#FFFFFF",
  cardSubtle: "#FFF0EB",
};

export const STARLIT_STORY_SCENES: StarlitStoryScene[] = [
  {
    order: 1,
    file: "/templates/starlit-story/01-the-meeting.png",
    title: "The meeting",
    storyBeat: "The couple meets at the garden entrance as the golden-hour sun begins to set.",
    caption: "Meeting beneath the glowing string lights as evening gently begins.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "meeting",
      buttonText: "Step into the rooftop garden ✨",
      description: "Walk hand-in-hand beneath the warm glowing fairy lights",
    },
  },
  {
    order: 2,
    file: "/templates/starlit-story/02-a-rose-for-you.png",
    title: "A rose for you",
    storyBeat: "A thoughtful gesture; offering a single pink rose beneath the string lights.",
    caption: "A tender single rose given just to see your face light up with a smile.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "rose",
      buttonText: "Accept the single rose 🌹",
      description: "A gentle romantic flower exchange under the sunset",
    },
  },
  {
    order: 3,
    file: "/templates/starlit-story/03-a-letter-from-the-heart.png",
    title: "A letter from the heart",
    storyBeat: "Sitting at the wooden table at dusk; she offers the ivory envelope across the table.",
    caption: "Across the table at twilight, a sealed letter filled with unspoken thoughts.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "letter",
      buttonText: "Receive the ivory envelope ✉️",
      description: "A secret card waiting to be unsealed together",
    },
  },
  {
    order: 4,
    file: "/templates/starlit-story/04-the-letter-opens.png",
    title: "The letter opens",
    storyBeat: "The ivory envelope opens to reveal the sender's personalized love letter.",
    caption: "Soft words from my heart that could only belong to you.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "opens",
      buttonText: "Read my message 💌",
      description: "Unseal the love note resting inside the cream card",
    },
  },
  {
    order: 5,
    file: "/templates/starlit-story/05-beneath-one-sky.png",
    title: "Beneath one sky",
    storyBeat: "Sitting close together on the wooden bench; quiet loving smiles under twilight.",
    caption: "Holding tight to your warmth beneath the soft indigo twilight.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "bench",
      buttonText: "Hold my hand ✨",
      description: "Resting close together as the first stars appear",
    },
  },
  {
    order: 6,
    file: "/templates/starlit-story/06-our-evening-together.png",
    title: "Our evening together",
    storyBeat: "Leaning shoulder to shoulder under the starry indigo night sky.",
    caption: "Watching the stars together, with nowhere else in the world I would rather be.",
    durationMs: 5000,
    width: 1672,
    height: 941,
    interactivePrompt: {
      type: "starlit",
      buttonText: "Our next starlit date 🌙",
      description: "Choose our next adventure under the starry sky",
    },
  },
];

export const STARLIT_STORY_CONFIG = {
  id: "starlit-story",
  name: "Starlit Story",
  tagline: "Under one sky, every moment is brighter with you.",
  defaultOpening: "Meet me on the rooftop beneath the stars.",
  defaultMessage: "Of all the stars in the midnight sky, you will always be my brightest light. I love you.",
  finalQuestion: "Where should our next starlit date be?",
  dateOptions: [
    {
      id: "opt_rooftop",
      label: "Rooftop dinner under fairy lights",
      icon: "Sparkles",
      description: "Cozy table, warm glow & sweet conversation",
    },
    {
      id: "opt_stargazing",
      label: "Stargazing picnic with warm tea & blankets",
      icon: "Moon",
      description: "Lying side by side beneath an open starry sky",
    },
    {
      id: "opt_drive",
      label: "Late night scenic drive & city view",
      icon: "Compass",
      description: "Playing our favorite music overlooking the twinkling city",
    },
  ],
  timing: {
    sceneDurationMs: 5000,
    crossfadeMs: 500,
    totalDurationSeconds: 27.5,
  },
};

export const DEFAULT_STARLIT_STORY_GALLERY_ITEMS: FloatingGalleryItem[] = [
  {
    id: "ss_1",
    url: "/templates/starlit-story/01-the-meeting.png",
    aspect: "wide",
    quote: "The exact moment you stepped into the rooftop garden, the whole evening turned magical.",
    author: "The Meeting",
  },
  {
    id: "ss_2",
    url: "/templates/starlit-story/02-a-rose-for-you.png",
    aspect: "tall",
    quote: "A single rose to remind you that even the simplest moments with you are my favorite.",
    author: "A Rose For You",
  },
  {
    id: "ss_3",
    url: "/templates/starlit-story/03-a-letter-from-the-heart.png",
    aspect: "square",
    quote: "Some feelings are too deep for words alone, so I wrote my heart down for you.",
    author: "A Letter From The Heart",
  },
  {
    id: "ss_4",
    url: "/templates/starlit-story/04-the-letter-opens.png",
    aspect: "tall",
    quote: "Whenever you read these words, remember that you are cherished beyond measure.",
    author: "The Letter Opens",
  },
  {
    id: "ss_5",
    url: "/templates/starlit-story/05-beneath-one-sky.png",
    aspect: "circle",
    quote: "Sitting beside you in the quiet dusk is my favorite place in the entire world.",
    author: "Beneath One Sky",
  },
  {
    id: "ss_6",
    url: "/templates/starlit-story/06-our-evening-together.png",
    aspect: "wide",
    quote: "Out of billions of stars in the universe, my eyes will always look for you.",
    author: "Our Evening Together",
  },
  {
    id: "ss_7",
    url: "/templates/starlit-story/02-a-rose-for-you.png",
    aspect: "badge",
    quote: "You bring warmth to every chilly evening and light to every shadow.",
    author: "Forever My Starlight",
  },
  {
    id: "ss_8",
    url: "/templates/starlit-story/05-beneath-one-sky.png",
    aspect: "wide",
    quote: "As long as we have each other, we have all the wonder we could ever dream of.",
    author: "Under The Same Sky",
  },
];
