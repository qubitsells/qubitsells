import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";

const render=(component:string,props:unknown)=>execFileSync(process.execPath,["-e",`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const input=JSON.parse(process.argv[1]);const Component=input.component==='collection'?require('./components/commerce/AccountReviews.tsx').ReviewCollection:require('./components/commerce/ReviewForm.tsx').default;process.stdout.write(renderToStaticMarkup(React.createElement(Component,{...input.props,onSaved:()=>{}})));`,JSON.stringify({component,props})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:2*1024*1024});
test("review center renders pending purchases, submitted stars and feedback with prominent edit and quick review actions",()=>{
  const entry={product_slug:"halloween-pumpkin-moon",product_name:"Pumpkin Moon Date",payment_mode:"test",order_id:"order",purchased_at:"2026-10-20T00:00:00Z",can_review:true,review:null};
  const html=render("collection",{items:[entry,{...entry,product_slug:"starlit-story",product_name:"Starlit Story",review:{id:"review",rating:4,title:"A wonderful surprise",body:"The story and personal touches were lovely.",updated_at:"2026-10-20T00:00:00Z"}}]});
  for(const value of ["To review","Reviewed","Awaiting your review","Review shared","Quick review","Edit your review","A wonderful surprise","The story and personal touches were lovely.",'aria-label="4 out of 5 stars"','aria-haspopup="dialog"'])assert.ok(html.includes(value),value);
});
test("quick review form offers all five ratings with no preselected stars and title/description fields",()=>{
  const html=render("form",{slug:"halloween-pumpkin-moon",orderId:"order",ownReview:null});
  assert.equal((html.match(/type="radio"/g)||[]).length,5);assert.ok(!html.includes('checked=""'));
  for(const value of ["Review title","Your experience","Publish your review","1 star","5 stars",'minLength="3"','minLength="15"'])assert.ok(html.includes(value),value);
  const edited=render("form",{slug:"halloween-pumpkin-moon",orderId:"order",ownReview:{rating:3,title:"My honest opinion",body:"Useful for a thoughtful surprise."}});
  for(const value of ["My honest opinion","Useful for a thoughtful surprise.","Save changes","Remove review"])assert.ok(edited.includes(value),value);
});
