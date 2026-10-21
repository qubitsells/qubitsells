/** Owner-confirmed prices. Checkout mode and availability are server-controlled. */
export const LINK_DURATION_PRICES = [
  { label: "Up to 3 days", maxHours: 72, amountCents: 200, priceLabel: "$2 USD" },
  { label: "7 days", maxHours: 168, amountCents: 300, priceLabel: "$3 USD" },
  { label: "30 days", maxHours: 720, amountCents: 349, priceLabel: "$3.49 USD" },
] as const;
export const PLANNED_PRICING_DESCRIPTION = "Templates cost $2 USD for up to 3 days, $3 USD for 7 days, or $3.49 USD for 30 days.";

export type Occasion = "All" | "Celebrations" | "Romance" | "Halloween";
export type StoreProduct = {
  slug: string;
  name: string;
  description: string;
  image: string;
  occasions: Occasion[];
  video?: string;
  heroVideo?: string;
  heroVideoMobile?: string;
  heroPoster?: string;
  priceLabel: "$2 USD";
};

export const PRODUCTS: StoreProduct[] = [
  {
    slug: "halloween-pumpkin-moon",
    name: "Pumpkin Moon Date",
    description: "A pumpkin patch, a little magic, and a moonlit invitation just for them.",
    image: "/templates/halloween-pumpkin-moon/06-our-pumpkin-moon-date.png",
    occasions: ["Halloween", "Romance"],
    video: "/hero-trending-products/Couple_celebrating_Halloween_wit…_1080p_20261019041657.mp4",
    heroVideo: "/media/storefront/halloween-pumpkin-moon-720p.mp4",
    heroVideoMobile: "/media/storefront/halloween-pumpkin-moon-mobile.mp4",
    heroPoster: "/media/storefront/halloween-pumpkin-moon.webp",
    priceLabel: "$2 USD",
  },
  {
    slug: "our-little-pink-day",
    name: "Our Little Pink Day",
    description: "Turn café dates, shared desserts, and everyday moments into a little love story.",
    image: "/templates/our-little-pink-day/01-my-favorite-meetup.png",
    occasions: ["Romance", "Celebrations"],
    video: "/hero-trending-products/Couple_on_romantic_animated_date_20261019040603.mp4",
    heroVideo: "/media/storefront/our-little-pink-day-720p.mp4",
    heroVideoMobile: "/media/storefront/our-little-pink-day-mobile.mp4",
    heroPoster: "/media/storefront/our-little-pink-day.webp",
    priceLabel: "$2 USD",
  },
  {
    slug: "halloween-midnight-key",
    name: "The Midnight Key",
    description: "Follow the fireflies, unlock a secret garden, and leave a message worth finding.",
    image: "/templates/halloween-midnight-key/01-the-hidden-key.png",
    occasions: ["Halloween", "Romance"],
    video: "/hero-trending-products/Couple_exploring_with_key_and_20261019040235.mp4",
    heroVideo: "/media/storefront/halloween-midnight-key-720p.mp4",
    heroVideoMobile: "/media/storefront/halloween-midnight-key-mobile.mp4",
    heroPoster: "/media/storefront/halloween-midnight-key.webp",
    priceLabel: "$2 USD",
  },
  {
    slug: "starlit-story",
    name: "Starlit Story",
    description: "An illustrated letter beneath the stars, for an anniversary or a just-because moment.",
    image: "/templates/starlit-story/05-beneath-one-sky.png",
    occasions: ["Romance", "Celebrations"],
    priceLabel: "$2 USD",
  },
  {
    slug: "spooky-the-haunted-waltz",
    name: "The Haunted Waltz",
    description: "A candlelit manor and a ghostly ballroom for someone who loves a spooky story.",
    image: "/templates/spooky-the-haunted-waltz/05-the-haunted-waltz.png",
    occasions: ["Halloween", "Romance"],
    priceLabel: "$2 USD",
  },
  {
    slug: "anime-storm-and-flame",
    name: "Storm & Flame",
    description: "An anime adventure about showing up for each other, even when the storm rolls in.",
    image: "/templates/anime-storm-and-flame/05-our-combined-strength.png",
    occasions: ["Romance"],
    priceLabel: "$2 USD",
  },
];

// Keep this explicit: the hero must contain exactly these three products.
export const HERO_PRODUCTS = PRODUCTS.slice(0, 3);
export const OCCASIONS: Occasion[] = ["All", "Celebrations", "Romance", "Halloween"];
export const productHref = (product: StoreProduct) => `/products/${product.slug}`;
export const editorHref = (product: Pick<StoreProduct, "slug">) => `/templates/${product.slug}`;

export const PUBLIC_SITE_ORIGIN = "https://www.qubitsells.com";

/** Match the production domain's redirect target in public discovery metadata. */
export function getSiteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_BASE_URL?.trim() || PUBLIC_SITE_ORIGIN;
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || /^(localhost|127\.|\[::1\])/.test(url.hostname)) return;
    if (url.hostname === "qubitsells.com" || url.hostname === "www.qubitsells.com") return PUBLIC_SITE_ORIGIN;
    return url.origin;
  } catch { return; }
}
