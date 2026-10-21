import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { HERO_PRODUCTS, OCCASIONS, PRODUCTS, productHref,editorHref } from "../lib/storefront";
import sitemap from "../app/sitemap";
import robots from "../app/robots";

test("hero media fits mobile and desktop budgets and MP4 headers support streaming before download completes",async()=>{
  for(const product of HERO_PRODUCTS){
    assert.ok(product.heroVideo&&product.heroVideoMobile&&product.heroPoster);
    const original=(await stat(join(process.cwd(),"public",product.video!))).size;
    const desktop=await readFile(join(process.cwd(),"public",product.heroVideo));
    const mobile=await readFile(join(process.cwd(),"public",product.heroVideoMobile));
    assert.ok(desktop.length<2_000_000&&desktop.length<original*.3,product.slug+" desktop budget");
    assert.ok(mobile.length<800_000&&mobile.length<original*.12,product.slug+" mobile budget");
    assert.ok((await stat(join(process.cwd(),"public",product.heroPoster))).size<250_000,product.slug+" poster budget");
    for(const video of [desktop,mobile]){
      const atoms=new Map<string,number>();
      for(let offset=0;offset+8<=video.length;){
        const size=video.readUInt32BE(offset);if(size<8)break;
        atoms.set(video.toString("ascii",offset+4,offset+8),offset);offset+=size;
      }
      assert.ok(atoms.has("moov")&&atoms.has("mdat")&&atoms.get("moov")!<atoms.get("mdat")!,"fast-start metadata must precede media bytes");
    }
  }
});

test("hero has exactly the requested three products, mapped to their real video files and editors", async () => {
  assert.deepEqual(HERO_PRODUCTS.map(product => [product.name, productHref(product)]), [
    ["Pumpkin Moon Date", "/products/halloween-pumpkin-moon"],
    ["Our Little Pink Day", "/products/our-little-pink-day"],
    ["The Midnight Key", "/products/halloween-midnight-key"],
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
    await access(join(process.cwd(), "app", editorHref(product), "page.tsx"));
    await access(join(process.cwd(), "app/products/[slug]/page.tsx"));
  }
  for (const occasion of OCCASIONS.filter(value => value !== "All")) {
    assert.ok(PRODUCTS.some(product => product.occasions.includes(occasion)));
  }
});

test("sitemap includes the public catalog and policies while excluding recipient and account content", () => {
  const entries = sitemap().map(entry => new URL(entry.url).pathname);
  for (const path of ["/", "/templates", "/privacy", "/terms", "/contact", "/refund-policy", ...PRODUCTS.map(productHref)]) assert.ok(entries.includes(path), path);
  for (const path of ["/t/", "/love/", "/couple-space", "/profile", "/couple-space/profile", "/creator-center", "/time-capsule", "/api/", "/auth/"]) {
    assert.ok(entries.every(entry => !entry.startsWith(path)), path);
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      assert.ok(Array.isArray(rule.disallow) && rule.disallow.some(prefix => path.startsWith(prefix)), path);
    }
  }
});
