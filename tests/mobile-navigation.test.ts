import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";

function render(props:Record<string,unknown>,content=true){
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const input=JSON.parse(process.argv[1]);const menu=require('./components/storefront/MobileNavigation.tsx');const Component=input.content?menu.MobileMenuContent:menu.default;process.stdout.write(renderToStaticMarkup(React.createElement(Component,{...input.props,onNavigate:()=>{},onSignOut:async()=>{}})));`;
  return execFileSync(process.execPath,["-e",script,JSON.stringify({props,content})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:2*1024*1024});
}
test("mobile navigation includes My Templates and Couple Space without a Time Capsule link",()=>{
  const html=render({pathname:"/my-templates",signedIn:false});
  for(const value of ["My Templates","My Creations","Couple Space","Your purchased collection",'href="/my-templates"','href="/creator-center"',"Find your next template",'href="/login"'])assert.ok(html.includes(value),value);
  assert.ok(!html.includes("Time Capsule"));assert.ok(!html.includes('href="/time-capsule"'));
  const links=html.match(/<a\b[^>]*>/g)||[];assert.ok(links.some(link=>link.includes('href="/my-templates"')&&link.includes('aria-current="page"')));assert.equal(links.filter(link=>link.includes('aria-current="page"')).length,1);
  assert.ok(!html.includes("Occasions"));assert.ok(!html.includes("My templates"));
});
test("signed-in hamburger menu keeps account actions in the separate header dropdown",()=>{
  const html=render({pathname:"/creator-center",signedIn:true});
  for(const value of ["My orders","Wishlist","My reviews","Account shortcuts","Sign out"])assert.ok(!html.includes(value),value);
  assert.ok(html.includes("My Creations"));assert.ok((html.match(/<a\b[^>]*>/g)||[]).some(link=>link.includes('href="/creator-center"')&&link.includes('aria-current="page"')));
  assert.ok(html.includes("My Templates"));assert.ok(!html.includes("Time Capsule"));
  assert.ok(!html.includes('href="/login"'));
});
test("mobile menu trigger controls a labelled native modal with a close control",()=>{
  const html=render({pathname:"/",signedIn:false},false);
  assert.ok(html.includes('aria-haspopup="dialog"'));assert.ok(html.includes('aria-expanded="false"'));assert.ok(html.includes("<dialog"));assert.ok(html.includes('aria-label="Close navigation menu"'));assert.ok(html.includes("Where to next?"));
  const controls=html.match(/aria-controls="([^"]+)"/)?.[1];assert.ok(controls);assert.ok(html.includes(`id="${controls}"`));
});
