// Repeat the same private exclusions for named bots: a specific robots group
// replaces the wildcard group rather than inheriting its restrictions.
export const PRIVATE_CRAWL_PATHS = [
  "/api/", "/t/", "/love/", "/profile", "/my-templates", "/couple-space",
  "/creator-center", "/time-capsule", "/login", "/signup", "/reset-password",
  "/auth/", "/checkout/",
];

export const PUBLIC_CRAWLERS = [
  "Googlebot", "Googlebot-Image", "Bingbot", "Applebot", "DuckDuckBot",
  "OAI-SearchBot", "ChatGPT-User", "GPTBot", "Google-Extended",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "meta-externalagent", "meta-externalfetcher",
];
