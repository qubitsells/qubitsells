import {test} from "node:test";
import assert from "node:assert/strict";
import {access} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import {PRODUCTS,productHref,editorHref} from "../lib/storefront";
import {getProductDetails} from "../lib/product-details";
import {productOptions} from "../lib/product-navigation";

test("cached product pages keep purchased duration, review links, and cancelled-checkout state in the browser",()=>{
  for(const duration of [72,168,720])assert.deepEqual(productOptions(new URLSearchParams({duration:String(duration),review:"1",checkout:"cancelled"})),{duration,review:true,cancelled:true});
  for(const duration of ["","-1","999999","not-a-number"])assert.deepEqual(productOptions(new URLSearchParams({duration,review:"0",checkout:"complete"})),{duration:72,review:false,cancelled:false});
});

test("each product has detailed copy and a gallery mapped to its real editor and scene assets",async()=>{
  for(const item of PRODUCTS){const details=getProductDetails(item.slug);assert.ok(details);assert.ok(details.description.length>120);assert.ok(details.scenes.length>=5);assert.ok(productHref(item).startsWith("/products/"));await access(join(process.cwd(),"app",editorHref(item),"page.tsx"));for(const scene of details.scenes)await access(join(process.cwd(),"public",scene.file));}
  assert.equal(getProductDetails("unknown-product"),null);
});

test("all six product galleries lead with the supplied YouTube preview before the scene artwork",()=>{
  const videos:Record<string,string>={"our-little-pink-day":"VMkLdJkeyA8","halloween-pumpkin-moon":"PezZNNxm0e8","halloween-midnight-key":"629TeAfKUXI","starlit-story":"mtPf4ZfW7T0","spooky-the-haunted-waltz":"oQIvFdIF62E","anime-storm-and-flame":"T-b3P7_ffas"};
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const Gallery=require('./components/commerce/ProductGallery.tsx').default;const {getProductDetails}=require('./lib/product-details.ts');process.stdout.write(JSON.stringify(${JSON.stringify(Object.keys(videos))}.map(slug=>{const p=getProductDetails(slug);return [slug,renderToStaticMarkup(React.createElement(Gallery,{name:p.name,poster:p.image,youtubeVideoId:p.youtubeVideoId,scenes:p.scenes}))];})));`;
  const pages=JSON.parse(execFileSync(process.execPath,["-e",script],{cwd:process.cwd(),encoding:"utf8",maxBuffer:2*1024*1024})) as [string,string][];
  for(const [slug,html] of pages){
    const product=getProductDetails(slug)!;
    assert.equal(product.youtubeVideoId,videos[slug]);
    assert.ok(html.includes(`https://www.youtube.com/watch?v=${videos[slug]}`));
    assert.ok(html.indexOf('View YouTube video preview')<html.indexOf('View scene 1:'),slug+" video thumbnail first");
    assert.ok(html.includes(`1 of ${product.scenes.length+1}: YouTube video preview`));
    assert.ok(html.includes(`Play ${product.name.replaceAll('&','&amp;')} preview on YouTube`));
    assert.ok(html.includes('Swipe to explore the artwork'));
    assert.ok(html.includes('aria-label="Previous preview"')&&html.includes('aria-label="Next preview"'));
    assert.ok(!html.includes('<iframe')&&!html.includes('<video'),"no player or MP4 download before playback is requested");
  }
});
test("actual product page renders its description, duration prices, included features, reviews and separate editor link",()=>{
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {AppRouterContext}=require('next/dist/shared/lib/app-router-context.shared-runtime.js');const Product=require('./components/commerce/ProductPage.tsx').default;const details=require('./lib/product-details.ts').getProductDetails('halloween-pumpkin-moon');process.stdout.write(renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push:()=>{},replace:()=>{},prefetch:()=>{}}},React.createElement(Product,{product:details,initialDuration:720}))));`;
  const html=execFileSync(process.execPath,["-e",script],{cwd:process.cwd(),encoding:"utf8",maxBuffer:2*1024*1024});
  for(const value of ["Pumpkin Moon Date","$3.49","Up to 3 days","7 days","30 days","What comes with your template.","Customer reviews.","How long should your link stay live?","Save for later",'href="/templates/halloween-pumpkin-moon"','id="description"','id="reviews"'])assert.ok(html.includes(value),value);
  assert.ok(!html.includes("5.0 out of 5"));assert.ok(!html.includes("people are viewing"));
});
