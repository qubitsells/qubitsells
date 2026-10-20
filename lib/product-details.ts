import { PRODUCTS } from "./storefront";
import { PUMPKIN_MOON_SCENES } from "./constants/pumpkinMoonTemplate";
import { PINK_DAY_SCENES } from "./constants/pinkDayTemplate";
import { MIDNIGHT_KEY_SCENES } from "./constants/midnightKeyTemplate";
import { STARLIT_STORY_SCENES } from "./constants/starlitStoryTemplate";
import { HAUNTED_WALTZ_SCENES } from "./constants/hauntedWaltzTemplate";
import { STORM_AND_FLAME_SCENES } from "./constants/animeStormAndFlameTemplate";

const stories: Record<string, {headline: string; description: string; scenes: {file: string; title: string}[]}> = {
  "halloween-pumpkin-moon": {headline: "An autumn invitation with a little magic.", description: "Begin outside a glowing cottage, find your pumpkins, and follow the lantern light to a moonlit date. Warm autumn artwork gives your words a setting of their own. Make it a Halloween invitation, a seasonal surprise, or a memory for someone who loves this time of year.", scenes: PUMPKIN_MOON_SCENES},
  "our-little-pink-day": {headline: "Make an ordinary day feel like your day.", description: "Café moments, shared desserts, and soft pink scenes turn a simple message into a story. Add your names, your words, and the photos that make it personal. A thoughtful choice for an anniversary, an invitation, or a small just-because surprise.", scenes: PINK_DAY_SCENES},
  "halloween-midnight-key": {headline: "Some messages are worth a little discovery.", description: "A hidden key, fireflies, and a secret garden set the scene for a message waiting to be found. Build a playful invitation or an illustrated surprise, then choose the interactions that suit your recipient. A little mystery makes the opening part of the gift.", scenes: MIDNIGHT_KEY_SCENES},
  "starlit-story": {headline: "Give your words a sky of their own.", description: "Soft evening light and illustrated scenes carry your message toward a starlit finish. Tell someone what they mean to you, mark a milestone, or revisit a memory together. The artwork sets the mood; your own words and photos make the story yours.", scenes: STARLIT_STORY_SCENES},
  "spooky-the-haunted-waltz": {headline: "A hauntingly lovely way to say it.", description: "Step into a candlelit manor and follow the story toward a ghostly ballroom. This illustrated experience pairs a spooky setting with a personal message. Choose it for someone who enjoys Halloween, atmospheric stories, and a surprise with a theatrical touch.", scenes: HAUNTED_WALTZ_SCENES},
  "anime-storm-and-flame": {headline: "For the person who stands beside you.", description: "An illustrated anime adventure about showing up for each other when the weather changes. Add your message to a story of strength and connection, then bring in your own memories. A fitting choice for an anime fan or someone whose support deserves a little recognition.", scenes: STORM_AND_FLAME_SCENES},
};
export function getProductDetails(slug: string) {const product = PRODUCTS.find(product => product.slug === slug); return product && stories[slug] ? {...product, ...stories[slug]} : null;}
