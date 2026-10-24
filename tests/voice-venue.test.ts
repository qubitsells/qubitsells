import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildVenue, venueLink } from "../lib/template-venue";
import { recordingExtension, replyReceipt } from "../lib/template-reply";
import { venueToolSchema } from "../lib/security/validation";
import type { TemplateReply } from "../lib/supabase/coupleTemplates";

test("venue settings keep online and in-person links distinct and reject unsafe URLs", () => {
  const online = buildVenue("online", "Watch party", "https://meet.example/date", "https://cafe.example");
  assert.equal(online.meetingUrl, "https://meet.example/date"); assert.equal(online.reservationUrl, undefined);
  const venue = buildVenue("in_person", "Garden cafe", "https://meet.example/date", "https://cafe.example/reservation");
  assert.equal(venue.reservationUrl, "https://cafe.example/reservation"); assert.equal(venue.meetingUrl, undefined);
  assert.throws(() => buildVenue("online", " ", "", ""), /platform/);
  for (const url of ["javascript:alert(1)", "data:text/html,bad", "https://user:secret@example.com", "not a link"]) {
    assert.equal(venueLink(url), ""); assert.equal(venueToolSchema.safeParse({ ...online, meetingUrl: url }).success, false);
  }
});
test("reply receipts preserve photo/audio details and add one correct template access parameter", () => {
  const receipt = replyReceipt({ media_items: [{ type: "video", url: "/api/media/voice?template=wrong&download=1", format: "m4a", duration: 12.4 }, { type: "image", url: "/api/media/photo" }] } as TemplateReply, "myCode123");
  const url = new URL(receipt.media_items[0].url, "https://fixture.invalid");
  assert.deepEqual(url.searchParams.getAll("template"), ["myCode123"]); assert.equal(url.searchParams.get("download"), "1");
  assert.equal(receipt.media_items[0].duration, 12.4); assert.equal(receipt.media_items[0].format, "m4a");
  assert.equal(recordingExtension("audio/mp4"), "m4a"); assert.equal(recordingExtension("audio/ogg;codecs=opus"), "ogg"); assert.equal(recordingExtension("audio/webm"), "webm");
});
test("venue details render independently of RSVP and appear in My Creations", () => {
  const script = `require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const View=require('./components/creator-center/ReceiverDetails.tsx').default;process.stdout.write(renderToStaticMarkup(React.createElement(View,{item:{is_expired:false,partner_name:'Sam',tools:[{id:'venue_t03',type:'venue',enabled:true,format:'online',location:'Our watch party',meetingUrl:'https://meet.example/date'}]}})));`;
  const html = execFileSync(process.execPath, ["-e", script], { encoding: "utf8", cwd: process.cwd() });
  for (const text of ["Date Venue &amp; Format", "Our watch party", "Online", "https://meet.example/date"]) assert.ok(html.includes(text), text);
});
