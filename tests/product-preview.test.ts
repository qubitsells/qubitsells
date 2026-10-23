import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { focusedMobilePreview, previewAutoplayAllowed, previewVisibility } from "../lib/product-preview";

const viewport = { width: 390, height: 844 };
const card = (slug: string, top: number) => ({ slug, top, left: 20, width: 350, height: 230 });

test("mobile previews choose a single prominently visible card nearest the viewport center", () => {
  assert.equal(focusedMobilePreview([card("first", 10), card("second", 350), card("third", 760)], viewport), "second");
  assert.equal(focusedMobilePreview([card("scrolled-past", -210), card("not-yet-visible", 800)], viewport), null);
  assert.equal(focusedMobilePreview([], viewport), null);
});

test("preview visibility accounts for horizontal clipping and zero-size artwork", () => {
  assert.equal(previewVisibility({ ...card("hidden", 200), left: 400 }, viewport), 0);
  assert.equal(previewVisibility({ ...card("empty", 200), height: 0 }, viewport), 0);
  assert.equal(previewVisibility(card("visible", 200), viewport), 1);
  assert.equal(focusedMobilePreview([{ ...card("half", 200), left: -175 }], viewport), null);
});

test("automatic previews stop for hidden pages, reduced motion, and data saver", () => {
  const normal = { hidden: false, reducedMotion: false, saveData: false };
  assert.equal(previewAutoplayAllowed(normal), true);
  for (const key of Object.keys(normal)) assert.equal(previewAutoplayAllowed({ ...normal, [key]: true }), false, key);
});

test("the catalog renders all posters and product links without downloading YouTube players", () => {
  const script = `require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const Grid=require('./components/storefront/ProductGrid.tsx').default;process.stdout.write(renderToStaticMarkup(React.createElement(Grid,{catalog:true})));`;
  const html = execFileSync(process.execPath, ["-e", script], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  assert.equal((html.match(/data-product-preview=/g) || []).length, 6);
  assert.ok(!html.includes("<iframe") && !html.includes("youtube.com/iframe_api"));
  assert.ok(html.includes('href="/products/halloween-pumpkin-moon"'));
  assert.ok(html.includes("Buy this template"));
});
