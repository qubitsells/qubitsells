import { getSiteUrl, LINK_DURATION_PRICES, PRODUCTS, productHref, PUBLIC_SITE_ORIGIN, type StoreProduct } from "./storefront";

export function websiteStructuredData() {
  const origin = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${origin}/#organization`, name: "QubitSells", url: origin,
        logo: `${origin}/logo/bonded-logo-cyan.png`, email: "support@qubitsells.com" },
      { "@type": "WebSite", "@id": `${origin}/#website`, name: "QubitSells", url: origin,
        description: "Personalized digital gift templates with illustrated stories, words, photos, and optional interactions, shared as a web link.",
        publisher: { "@id": `${origin}/#organization` } },
    ],
  };
}

export function productStructuredData(product: StoreProduct) {
  const origin = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  const url = `${origin}${productHref(product)}`;
  const prices = LINK_DURATION_PRICES.map(price => price.amountCents / 100);
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`,
    name: product.name, description: product.description, url, sku: product.slug,
    image: new URL(product.image, origin).toString(), brand: { "@type": "Brand", name: "QubitSells" },
    category: "Personalized digital template",
    offers: {
      "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...prices).toFixed(2),
      highPrice: Math.max(...prices).toFixed(2), offerCount: prices.length, url,
      offers: LINK_DURATION_PRICES.map(price => ({ "@type": "Offer", name: `${product.name} — ${price.label}`,
        price: (price.amountCents / 100).toFixed(2), priceCurrency: "USD",
        url: `${url}?duration=${price.maxHours}`, availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "QubitSells", url: origin } })),
    },
  };
}

// Supplemental, factual public reference for tools that read llms.txt. Search
// engines still use the normal HTML pages, robots.txt, and XML sitemap.
export function publicSiteSummary() {
  const origin = getSiteUrl() || PUBLIC_SITE_ORIGIN;
  return `# QubitSells

> Personalized digital gift templates, made to be shared by link.

QubitSells offers illustrated web experiences that customers personalize with names, words, photos, and supported recipient interactions. These are shared webpages, not physical gifts or downloadable videos. An account and a confirmed purchase are required to publish a purchased template; recipients can open its shared link without signing in.

## Public website

- [Home](${origin}/): How the service works and common questions.
- [Template catalog](${origin}/templates): Browse the current illustrated collection.
- [About QubitSells](${origin}/about): Company and service information.
- [Contact and help](${origin}/contact): Support at support@qubitsells.com.

## Templates

${PRODUCTS.map(product => `- [${product.name}](${origin}${productHref(product)}): ${product.description}`).join("\n")}

## Pricing and link duration

${LINK_DURATION_PRICES.map(price => `- ${price.label}: ${price.priceLabel}, one-time purchase for one personalized link.`).join("\n")}

The link duration starts at publication. Expired links stop working. Current product pages and checkout are authoritative for pricing and availability. Couple Space is an optional, separate feature for connected partners; it is not required for general gift templates.

## Policies

- [Privacy](${origin}/privacy)
- [Terms](${origin}/terms)
- [Refund policy](${origin}/refund-policy)
- [XML sitemap](${origin}/sitemap.xml)

Only public storefront information is provided here. Personal profiles, purchases, wishlists, notifications, shared gift links, recipient responses, and Couple Space memories are excluded from discovery files.
`;
}
