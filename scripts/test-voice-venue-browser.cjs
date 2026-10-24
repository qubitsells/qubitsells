// Local fixture check with a synthetic microphone: node scripts/test-voice-venue-browser.cjs
// Every API request is intercepted with fixtures. No live data is written.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const WebSocket = require('next/dist/compiled/ws');
const base = process.env.RSVP_TEST_URL || 'http://127.0.0.1:3105';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('This check only supports a local fixture server.');
const themes = ['our-little-pink-day', 'halloween-pumpkin-moon', 'halloween-midnight-key', 'starlit-story', 'spooky-the-haunted-waltz', 'anime-storm-and-flame'];
const code = 'dateNightFixture';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let theme, replies=[], posted, posts=[], uploadCount=0, failNext=false, mobile=false;
const photoId='11111111-1111-4111-8111-111111111111', voiceId='22222222-2222-4222-8222-222222222222';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRVsAAAAASUVORK5CYII=','base64');
const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
function reset(next,width){theme=next;mobile=width<500;replies=[];posts=[];posted=null;uploadCount=0;}
function venue(){return{id:'venue_t03',type:'venue',enabled:true,format:mobile?'in_person':'online',location:mobile?'Garden cafe':'Our watch party',...(mobile?{reservationUrl:'https://venue.example/details'}:{meetingUrl:'https://meet.example/date'})};}
function template(){return{id:'fixture-template',short_code:code,theme,scene_index:0,partner_name:'Sam',partner_from:'Alex',message:'A little time together.',has_media:false,media_items:[],created_at:'2026-10-23T12:00:00Z',expires_at:'2099-11-01T00:00:00Z',view_count:1,tools:[{id:'reply_t01',type:'reply',enabled:true,enabledFormats:{text:true,photo:true,voice:true},maxChars:2000,maxPhotos:3,maxVoiceSeconds:10,allowMultiple:true,quickReactions:['❤️','✨']},venue()]};}
function collection(){return{...template(),is_expired:false,replies_purged:false,replies,invitation:null};}
(async () => {
  const profile = await fs.mkdtemp(join(tmpdir(), 'qubitsells-voice-venue-'));
  const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  const timeout = setTimeout(() => { console.error('Browser check timed out.'); chrome.kill(); ws?.terminate(); process.exitCode = 1; }, 240000);
  try {
    const endpoint = await new Promise((resolve, reject) => { let output = ''; chrome.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/\S+)/); if (match) resolve(match[1]); }); chrome.on('error', reject); chrome.on('exit', () => reject(Error('Browser exited.'))); });
    ws = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    let id = 0; const pending = new Map();
    ws.on('message', async bytes => {
      const message = JSON.parse(String(bytes));
      if (pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result); }
      if (message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      try {
        if (url.origin !== new URL(base).origin) { await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }, message.sessionId); return; }
        if (!url.pathname.startsWith('/api/')) { await send('Fetch.continueRequest', { requestId }, message.sessionId); return; }

        if(url.pathname.startsWith('/api/media/')){const audio=url.pathname.endsWith(voiceId);await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:audio?'audio/wav':'image/png'}],body:(audio?wav:png).toString('base64')},message.sessionId);return;}
        let body={success:true},status=200;
        if(url.pathname==='/api/templates/'+code)body={success:true,template:template()};
        else if(url.pathname==='/api/creator-center')body={success:true,templates:[collection()]};
        else if(url.pathname==='/api/upload'){
          if(request.method==='DELETE')body={success:true};else{uploadCount++;const voice=uploadCount%2===0,id=voice?voiceId:photoId;body={success:true,url:'/api/media/'+id,public_id:id,resource_type:voice?'video':'image',duration:voice?1.2:null};}
        }else if(url.pathname.endsWith('/replies'))body={success:true,is_creator:false,replies,my_reply:replies.at(-1)||null};
        else if(url.pathname.endsWith('/reply')){
          if(request.method==='DELETE'){const input=JSON.parse(request.postData);replies=replies.filter(reply=>reply.id!==input.reply_id);body={success:true};}
          else{posted=JSON.parse(request.postData);posts.push(posted);if(failNext){status=503;body={error:'Fixture save failed. Try again.'};failNext=false;}else{const receipt={id:crypto.randomUUID(),tool_id:'reply_t01',author_name:posted.author_name,message:posted.message,reaction:posted.reaction,media_items:posted.media_items.map(media=>({...media,format:media.media_type==='voice'?'m4a':'webp'})),created_at:new Date().toISOString()};replies.push(receipt);body={success:true,receipt};}}
        }else if(url.pathname.endsWith('/notifications'))body={notifications:[],unread_count:0};
        await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') }, message.sessionId);
      } catch (error) {
        // Navigating cancels image/API requests that were already intercepted.
        if (!/Invalid InterceptionId|Session closed|Target closed/.test(error.message)) console.error('Fixture interception failed:', error.message);
        await send('Fetch.failRequest', { requestId, errorReason: 'Failed' }, message.sessionId).catch(() => {});
      }
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params, sessionId })); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    const evaluate = async expression => { const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw Error(expression + '\n' + value.exceptionDetails.text + ': ' + value.result.description); return value.result.value; };
    const until = async expression => { for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await wait(150); } console.log('Fixture check state', theme, replies.length, await evaluate(`JSON.stringify({path:location.pathname,text:document.body.innerText.slice(-2200)})`)); throw Error('Timed out waiting for ' + expression); };
    const click = async expression => {
      await evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`); await wait(220);
      const point = await evaluate(`(()=>{const target=(${expression});const r=target.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);return{x,y,blocked:!(target===hit||target.contains(hit)),hit:hit?.tagName+':'+hit?.textContent?.slice(0,80)}})()`);
      assert.ok(!point.blocked, 'Control covered by ' + point.hit);
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: point.x, y: point.y });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: point.x, y: point.y }); await wait(150);
    };
    await call('Page.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: 'http*' }] });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

    const root = "document.querySelector('section[aria-label=\"Voice & Photo Notes\"]')";
    const fill=async(selector,value)=>evaluate('(()=>{const e='+selector+';Object.getOwnPropertyDescriptor(e.tagName===\"TEXTAREA\"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,\"value\").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event(\"input\",{bubbles:true}));})()');
    const choosePhoto=async name=>evaluate('(()=>{const e='+root+'.querySelector(\"input[type=file]\");const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(atob('+JSON.stringify(png.toString('base64'))+'),c=>c.charCodeAt(0))],'+JSON.stringify(name)+',{type:\"image/png\"}));e.files=transfer.files;e.dispatchEvent(new Event(\"change\",{bubbles:true}));})()');
    const button=text=>"[...("+root+").querySelectorAll('button')].find(button=>button.textContent.trim().startsWith("+JSON.stringify(text)+"))";
    for(const width of [1440,390])for(const nextTheme of themes){
      reset(nextTheme,width);await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
      console.log('Checking '+nextTheme+' '+width+'px');
      await call('Page.navigate',{url:base+'/t/'+code+'?case='+nextTheme+width});
      await until('!!document.querySelector(\"section[aria-label=\\\"Date Venue & Format\\\"]\")');
      await evaluate('[...document.querySelectorAll(\"button\")].find(b=>b.title===\"Exit to normal scrollable page\"||[\"Exit to Page\",\"Explore Interactive Page\"].includes(b.textContent.trim()))?.click()');await wait(800);
      assert.ok(await evaluate('document.querySelector(\"section[aria-label=\\\"Date Venue & Format\\\"]\").textContent.includes('+JSON.stringify(mobile?'Garden cafe':'Our watch party')+')'));
      if(!await evaluate('!!'+root))await evaluate('[...document.querySelectorAll(\"button\")].find(b=>[\"Leave Note\",\"Leave Love Note\"].includes(b.textContent.trim())).click()');
      await until('!!('+root+').querySelector(\"textarea\")');
      await fill('('+root+').querySelector(\"input[maxlength=\\\"100\\\"]\")','Sammy');
      await fill('('+root+').querySelector(\"textarea\")','Our photo and voice memory');
      await click('('+root+').querySelector(\"button[aria-label=\\\"React ❤️\\\"]\")');
      await choosePhoto('first.png');await choosePhoto('second.png');
      await click('('+root+').querySelector(\"button[aria-label=\\\"Remove photo 1\\\"]\")');
      assert.ok(await evaluate('('+root+').querySelector(\"img\").naturalWidth>0'),'remaining photo preview stays valid');
      await click(button('Record voice note'));await until('!!'+button('Stop recording'));
      await choosePhoto('during-recording.png');await click('('+root+').querySelector(\"button[aria-label=\\\"Remove photo 2\\\"]\")');
      assert.ok(await evaluate('!!'+button('Stop recording')),'adding/removing a photo does not stop recording');await wait(1200);
      await click(button('Stop recording'));await until('!!('+root+').querySelector(\"audio\")');
      await evaluate('('+root+').querySelector(\"audio\").play().catch(()=>{})');await wait(250);
      assert.ok(await evaluate('('+root+').querySelector(\"audio\").readyState>0'),'recorded audio can be previewed');await evaluate('('+root+').querySelector(\"audio\").pause()');
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile layout has no overflow');
      if(width===390){
        await evaluate('('+root+').scrollIntoView({block:"start",behavior:"instant"})');await wait(150);
        await fs.mkdir('.next/voice-venue-audit',{recursive:true});const shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile('.next/voice-venue-audit/'+nextTheme+'-reply.png',Buffer.from(shot.data,'base64'));
      }
      if(width===1440&&nextTheme===themes[0]){failNext=true;await click(button('Send note to'));await until('!!('+root+').querySelector(\"[role=alert]\")');assert.equal(replies.length,0);assert.equal(uploadCount,2);}
      await click(button('Send note to'));await until('('+root+').textContent.includes(\"Your note, sent.\")');
      assert.equal(posted.author_name,'Sammy');assert.equal(posted.message,'Our photo and voice memory');assert.equal(posted.reaction,'❤️');assert.equal(posted.media_items.length,2);assert.equal(uploadCount,2,'retries reuse uploaded attachments');
      if(posts.length>1)assert.equal(posts[0].client_id,posts[1].client_id,'retry keeps the draft key');
      assert.ok(await evaluate('('+root+').querySelector(\"audio\").src.includes(\"template='+code+'\")'),'saved audio has template access');
      if(width===1440&&nextTheme===themes[0]){
        const original=replies[0].id;
        await call('Page.reload');await until('!!document.querySelector("section[aria-label=\\\"Date Venue & Format\\\"]")');
        await evaluate('[...document.querySelectorAll("button")].find(b=>b.title==="Exit to normal scrollable page"||["Exit to Page","Explore Interactive Page"].includes(b.textContent.trim()))?.click()');await wait(800);
        await evaluate('[...document.querySelectorAll("button")].find(b=>["Leave Note","Leave Love Note"].includes(b.textContent.trim())).click()');
        await until('!!('+root+')&&('+root+').textContent.includes("Your note, sent.")');
        await click(button('Write another note'));await until('!!('+root+').querySelector("textarea")');
        await fill('('+root+').querySelector("textarea")','A second note');await click(button('Send note to'));await until('('+root+').textContent.includes("A second note")');
        assert.notEqual(posts.at(-1).client_id,posts[0].client_id,'each new note gets its own draft key');assert.equal(replies.length,2);
        await click(button('Delete this note'));await click(button('Yes, delete note'));await until('!!('+root+').querySelector("textarea")');
        assert.equal(replies.length,1);assert.equal(replies[0].id,original,'deleting a later note preserves earlier notes');
      }
      await call('Page.navigate',{url:base+'/creator-center'});await until('document.body.textContent.includes(\"1 message\")');
      const responses="[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Replies & tool responses'))";
      await click(responses);
      if(!await evaluate("("+responses+").getAttribute('aria-expanded')==='true'")){
        await evaluate("("+responses+").focus()");
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
        await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
      }
      await until('document.body.textContent.includes(\"Our photo and voice memory\")');
      assert.ok(await evaluate('!!document.querySelector(\"section[aria-label=\\\"Replies\\\"] audio\")'),'My Creations has voice playback');
      assert.ok(await evaluate('document.querySelector(\"section[aria-label=\\\"Tool responses\\\"]\").textContent.includes('+JSON.stringify(mobile?'Garden cafe':'Our watch party')+')'),'standalone venue is included in My Creations');
      if(width===390){await fs.mkdir('.next/voice-venue-audit',{recursive:true});const screenshot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile('.next/voice-venue-audit/'+nextTheme+'.png',Buffer.from(screenshot.data,'base64'));}
      console.log('Passed '+nextTheme+' '+width+'px: photo previews, recording/playback, saved metadata, venue, My Creations.');
    }
    await send('Browser.close');
  } finally { clearTimeout(timeout); ws?.terminate(); chrome.kill(); await wait(300); await fs.rm(profile, { recursive: true, force: true }).catch(() => {}); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
