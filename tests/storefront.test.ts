import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { HERO_PRODUCTS, OCCASIONS, PRODUCTS, productHref } from "../lib/storefront";
import sitemap from "../app/sitemap";
import robots from "../app/robots";

test("hero has exactly the requested three products, mapped to their real video files and editors", async () => {
  assert.deepEqual(HERO_PRODUCTS.map(product => [product.name, productHref(product)]), [
    ["Pumpkin Moon Date", "/templates/halloween-pumpkin-moon"],
    ["Our Little Pink Day", "/templates/our-little-pink-day"],
    ["The Midnight Key", "/templates/halloween-midnight-key"],
  ]);
  const files = await readdir(join(process.cwd(), "public/hero-trending-products"));
  assert.deepEqual(HERO_PRODUCTS.map(product => product.video?.split("/").pop()), [
    "Couple_celebrating_Halloween_wit…_1080p_20261019041657.mp4",
    "Couple_on_romantic_animated_date_20261019040603.mp4",
    "Couple_exploring_with_key_and_20261019040235.mp4",
  ]);
  for (const product of HERO_PRODUCTS) {
    assert.ok(files.includes(product.video!.split("/").pop()!));
    assert.equal(product.priceLabel, "$2 USD");
  }
});

test("every featured product has real artwork, a distinct existing editor, and populated occasion filters", async () => {
  assert.equal(new Set(PRODUCTS.map(productHref)).size, PRODUCTS.length);
  for (const product of PRODUCTS) {
    await access(join(process.cwd(), "public", product.image));
    await access(join(process.cwd(), "app", productHref(product), "page.tsx"));
  }
  for (const occasion of OCCASIONS.filter(value => value !== "All")) {
    assert.ok(PRODUCTS.some(product => product.occasions.includes(occasion)));
  }
});

test("sitemap includes the public catalog and policies while excluding recipient and account content", () => {
  const entries = sitemap().map(entry => new URL(entry.url).pathname);
  for (const path of ["/", "/templates", "/couple-space", "/privacy", "/terms", "/contact", "/refund-policy", ...PRODUCTS.map(productHref)]) assert.ok(entries.includes(path), path);
  for (const path of ["/t/", "/love/", "/profile", "/creator-center", "/time-capsule", "/api/", "/auth/"]) {
    assert.ok(entries.every(entry => !entry.startsWith(path)), path);
    const rules = robots().rules;
    assert.ok(!Array.isArray(rules) && Array.isArray(rules.disallow) && rules.disallow.includes(path));
  }
});
