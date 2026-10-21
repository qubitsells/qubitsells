# Search and AI discovery

The live site redirects `qubitsells.com` to `www.qubitsells.com`. Public canonical metadata, sitemap links, and structured data now use `https://www.qubitsells.com`. Set `NEXT_PUBLIC_BASE_URL` to that origin in Vercel Production for consistency; the public metadata helper also normalizes the old apex value. This does not change checkout origins or Google OAuth callback settings.

## Google Search Console

The reported "Sitemap is HTML" error came from submitting a homepage URL as a sitemap. The live `/sitemap.xml` was already returning HTTP 200 and `application/xml` during the investigation.

1. Deploy these changes.
2. Open the domain property for `qubitsells.com`, or the URL-prefix property `https://www.qubitsells.com/`.
3. In **Sitemaps**, remove the failed homepage submissions from the sitemap report. Keep the site properties themselves.
4. Submit `https://www.qubitsells.com/sitemap.xml`. If the interface already shows the site prefix, enter only `sitemap.xml`.
5. Use **URL inspection** on the homepage, `/templates`, and a product URL. Run the live test and request indexing for the public pages. Review the selected canonical and indexing status as Google processes them.

Google supports XML sitemap files, not an HTML homepage as a sitemap: [Google sitemap guide](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). The extensionless `/sitemap` path now permanently redirects to `/sitemap.xml`.

## Public content and private data

The XML sitemap lists the homepage, catalog, public scenic studio, product detail pages with artwork URLs, and public company/policy pages. It does not include personal accounts, orders, shared gift codes, recipient responses, private media APIs, or Couple Space pages. These paths retain their robots exclusions and `X-Robots-Tag`/page noindex controls. Robots directives are discovery preferences, not authentication; existing access checks remain necessary.

Public pages render useful HTML without requiring sign-in. Product structured data uses the same real USD duration prices as the storefront. No ratings, review counts, sales figures, or testimonials are invented. Organization and website data identify QubitSells and its public support address.

## AI crawlers

`robots.txt` explicitly allows public content for Google, Bing, Apple, DuckDuckGo, OpenAI search/user/training bots, Google's `Google-Extended` control, Anthropic search/user/training bots, and Meta's external agents. The wildcard rule covers other compliant crawlers. Every named group repeats the same private exclusions; specific groups must not accidentally override the wildcard's privacy rules.

Search/retrieval and training are different uses. `OAI-SearchBot` supports ChatGPT search discovery; `GPTBot` is a training crawler. Anthropic similarly distinguishes `Claude-SearchBot`, `Claude-User`, and `ClaudeBot`. `Google-Extended` controls some Gemini training/grounding uses separately from Google Search. These settings permit access; they do not guarantee indexing, citations, recommendations, or ranking.

- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)
- [Anthropic crawler documentation](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Google crawler documentation](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Meta crawler documentation](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/)

`/llms.txt` is a supplemental factual public reference generated from the current catalog and prices. It contains no customer data. It is not an indexing requirement or a special Google ranking signal: [Google's AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Vercel checks after deployment

In the project's **Firewall**, review any AI Bots managed ruleset. If configured, use **Log** rather than **Deny** for the public crawler traffic you want to allow. Review firewall logs for actual bot failures and keep verified search bots accessible. Do not bypass authentication or API protections based only on a spoofable user-agent header. Production should be publicly accessible without Vercel Authentication or Password Protection. [Vercel bot management](https://vercel.com/docs/bot-management)

The coding workspace has not changed Vercel dashboard protection settings or submitted anything to Search Console. A request made with a crawler user-agent tests application behavior, not the real provider's source IP or firewall verification status.
