import { test } from "node:test";
import assert from "node:assert/strict";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { GET as llms } from "../app/llms.txt/route";
import { PRIVATE_CRAWL_PATHS, PUBLIC_CRAWLERS } from "../lib/crawling";
import { getSiteUrl, LINK_DURATION_PRICES, PRODUCTS, PUBLIC_SITE_ORIGIN } from "../lib/storefront";
import { productStructuredData, websiteStructuredData } from "../lib/seo";

test("discovery URLs use the canonical www domain and cannot become an empty sitemap with a local base URL", () => {
  const original = process.env.NEXT_PUBLIC_BASE_URL;
  try {
    for (const configured of [undefined, "https://qubitsells.com", "https://www.qubitsells.com/", " https://qubitsells.com "]) {
      if (configured === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
      else process.env.NEXT_PUBLIC_BASE_URL = configured;
      assert.equal(getSiteUrl(), PUBLIC_SITE_ORIGIN);
      assert.equal(robots().sitemap, `${PUBLIC_SITE_ORIGIN}/sitemap.xml`);
      assert.ok(sitemap().every(entry => new URL(entry.url).origin === PUBLIC_SITE_ORIGIN));
    }
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    assert.ok(sitemap().length > PRODUCTS.length);
    assert.equal(robots().sitemap, `${PUBLIC_SITE_ORIGIN}/sitemap.xml`);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
    else process.env.NEXT_PUBLIC_BASE_URL = original;
  }
});

test("search and AI bot groups allow public content and all retain private-path exclusions", () => {
  const rules = robots().rules;
  assert.ok(Array.isArray(rules));
  for (const agent of ["*", ...PUBLIC_CRAWLERS]) {
    const group: (typeof rules)[number] | undefined = rules.find(rule => Array.isArray(rule.userAgent) ? rule.userAgent.includes(agent) : rule.userAgent === agent);
    assert.ok(group, agent);
    assert.equal(group.allow, "/");
    assert.deepEqual(group.disallow, PRIVATE_CRAWL_PATHS);
    assert.ok(!group.disallow.includes("/_next/"), "rendering assets remain crawlable");
  }
  const urls = sitemap().map(entry => new URL(entry.url));
  assert.equal(new Set(urls.map(url => url.href)).size, urls.length);
  for (const url of urls) {
    assert.ok(!PRIVATE_CRAWL_PATHS.some(path => url.pathname.startsWith(path)), url.pathname);
    assert.equal(url.search, "");
  }
  for (const product of PRODUCTS) {
    const entry = sitemap().find(entry => entry.url.endsWith(`/products/${product.slug}`));
    assert.ok(entry?.images?.[0]?.endsWith(encodeURI(product.image)));
  }
});

test("product structured data uses real duration prices without invented ratings or reviews", () => {
  for (const product of PRODUCTS) {
    const data = productStructuredData(product);
    assert.equal(data.name, product.name);
    assert.equal(data.description, product.description);
    assert.equal(data.offers.offerCount, LINK_DURATION_PRICES.length);
    assert.equal(data.offers.priceCurrency, "USD");
    assert.equal(data.offers.lowPrice, "2.00");
    assert.equal(data.offers.highPrice, "3.49");
    assert.deepEqual(data.offers.offers.map(offer => Number(offer.price) * 100), LINK_DURATION_PRICES.map(price => price.amountCents));
    assert.ok(!("aggregateRating" in data) && !("review" in data));
    for (const offer of data.offers.offers) assert.equal(new URL(offer.url).pathname, `/products/${product.slug}`);
  }
  assert.equal(websiteStructuredData()["@graph"][0].name, "QubitSells");
});

test("supplemental AI reference is plain text with public product links, not private data or HTML", async () => {
  const response = llms();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/plain/);
  const text = await response.text();
  assert.ok(text.startsWith("# QubitSells\n"));
  assert.ok(!text.includes("<html"));
  const links = [...text.matchAll(/\]\((https:[^)]+)\)/g)].map(match => new URL(match[1]));
  for (const url of links) assert.ok(!PRIVATE_CRAWL_PATHS.some(path => url.pathname.startsWith(path)), url.pathname);
  for (const product of PRODUCTS) assert.ok(text.includes(`/products/${product.slug}`));
});
