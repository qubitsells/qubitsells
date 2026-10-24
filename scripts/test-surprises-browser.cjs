// Local fixture check: node scripts/test-surprises-browser.cjs
// Every API request is intercepted with fixtures. No live data is written.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const WebSocket = require('next/dist/compiled/ws');
const base = process.env.RSVP_TEST_URL || 'http://127.0.0.1:3105';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('This check only supports a local fixture server.');
const themes = ['our-little-pink-day', 'halloween-pumpkin-moon', 'halloween-midnight-key', 'starlit-story', 'spooky-the-haunted-waltz', 'anime-storm-and-flame'].filter(theme=>!process.env.SURPRISE_TEST_THEME||theme===process.env.SURPRISE_TEST_THEME);
if(!themes.length)throw Error('Choose a known template theme.');
const code = 'dateNightFixture';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));



let theme,mobile,scratchOpened=null,scratchMethod=null,coupon,opened={},failScratch=false,failLetter=false,failCoupon=false,letterPosts=0,fakeVideo;
const manage='a'.repeat(64),stamp='2026-10-24T12:00:00Z',photoId='11111111-1111-4111-8111-111111111111',videoId='22222222-2222-4222-8222-222222222222';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRVsAAAAASUVORK5CYII=','base64');
function reset(next,width){theme=next;mobile=width<500;scratchOpened=null;scratchMethod=null;opened={};letterPosts=0;coupon={id:'coupon',title:'Breakfast on me',description:'One lovely morning.',enable_scheduling:true,status:'available',revision:1,history:[]};}
function scratchConfig(){const type=['message','photo','invitation'][themes.indexOf(theme)%3];return{id:'scratch_t07',type:'scratch_reveal',enabled:true,coverTitle:'A little surprise',coverInstruction:'Scratch to find your little moment.',contentType:type,hiddenMessage:'A picnic surprise',hiddenPhotoUrl:type==='photo'?'/api/media/'+photoId:undefined,invitationRefId:'coupon_t08'};}
function letterItems(){return[{id:'miss',occasion:'When you miss me',message:'Our own little world',mediaUrl:'/api/media/'+(themes.indexOf(theme)%2?videoId:photoId),mediaType:themes.indexOf(theme)%2?'video':'image'},{id:'tired',occasion:'After a long day',message:'Rest here for a while'}];}
function template(){const scratch=scratchConfig();return{id:'fixture-template',short_code:code,theme,scene_index:0,partner_name:'Sam',partner_from:'Alex',message:'A little time together.',has_media:false,media_items:[],created_at:stamp,expires_at:'2099-11-01T00:00:00Z',view_count:1,tools:[{...scratch,hiddenMessage:undefined,hiddenPhotoUrl:undefined},{id:'coupon_t08',type:'coupon',enabled:true},{id:'open_when_t09',type:'open_when',enabled:true,envelopes:letterItems().map(e=>({...e,message:undefined,mediaUrl:undefined}))},{id:'reply_t01',type:'reply',enabled:true,enabledFormats:{text:true,photo:false,voice:false},maxChars:2000,allowMultiple:true}]};}
function scratchState(creator){const config=scratchConfig();return{config:creator||scratchOpened?config:{...config,hiddenMessage:undefined,hiddenPhotoUrl:undefined},opened_at:scratchOpened,method:scratchMethod,target_available:true};}
function lettersState(creator){return{id:'letters',title:'Words for later',description:'For the moments you need them.',attach_reply:true,opened_envelopes:opened,envelopes:letterItems().map(e=>creator||opened[e.id]?e:{...e,message:undefined,mediaUrl:undefined})};}
function collection(){return{...template(),is_expired:false,replies_purged:false,replies:[],invitation:null,scratch:scratchState(true),coupon:{...coupon,partner_request_note:coupon.request_note},open_when:{title:'Words for later',envelopes:letterItems().map(e=>({id:e.id,label:e.occasion,opened_at:opened[e.id]?.opened_at,message:e.message,media_url:e.mediaUrl,media_type:e.mediaType}))}};}
(async () => {
  const profile = await fs.mkdtemp(join(tmpdir(), 'qubitsells-surprises-'));
  const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  const timeout = setTimeout(() => { console.error('Browser check timed out.'); chrome.kill(); ws?.terminate(); process.exitCode = 1; }, 420000);
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



        if(url.pathname.startsWith('/api/media/')){const video=url.pathname.endsWith(videoId);await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:video?'video/webm':'image/png'}],body:(video?fakeVideo:png).toString('base64')},message.sessionId);return;}
        let body={success:true},status=200;const creator=url.searchParams.get('manage')===manage;
        if(url.pathname==='/api/templates/'+code)body={success:true,template:template()};
        else if(url.pathname==='/api/creator-center')body={success:true,templates:[collection()]};
        else if(url.pathname.endsWith('/scratch')){
          if(request.method==='POST'){const input=JSON.parse(request.postData);if(failScratch){failScratch=false;status=503;body={error:'Fixture reveal save failed.'};}else if(!creator&&!scratchOpened){scratchOpened=stamp;scratchMethod=input.method;}}
          if(status===200)body={success:true,is_creator:creator,scratch:scratchState(creator)};
        }else if(url.pathname.endsWith('/coupon')){
          if(request.method==='POST'){const input=JSON.parse(request.postData);assert.equal(input.expected_revision,coupon.revision);if(failCoupon){failCoupon=false;status=503;body={error:'Fixture coupon save failed.'};}else{if(input.action==='request'){assert.ok(!creator);coupon.status='requested';coupon.request_note=input.request_note;coupon.preferred_date=input.preferred_date;coupon.requested_at=stamp;}else{assert.ok(creator);if(input.action==='decline_request'){coupon.status='available';coupon.cancel_reason=input.cancel_reason;}else if(input.action==='accept'){coupon.status='accepted';coupon.accepted_at=stamp;}else if(input.action==='fulfill'){coupon.status='fulfilled';coupon.fulfilled_at=stamp;}}coupon.revision++;coupon.history.push({action:input.action==='decline_request'?'request_declined':coupon.status,status:coupon.status,at:stamp,request_note:coupon.request_note,preferred_date:coupon.preferred_date,cancel_reason:input.cancel_reason});if(input.action==='decline_request'){coupon.request_note=null;coupon.preferred_date=null;coupon.requested_at=null;}}}
          if(status===200)body={success:true,is_creator:creator,coupon};
        }else if(url.pathname.endsWith('/open-when')){
          if(request.method==='POST'){assert.ok(!creator,'Sender previews do not record an open');letterPosts++;const input=JSON.parse(request.postData);if(failLetter){failLetter=false;status=503;body={error:'Fixture letter save failed.'};}else if(!opened[input.envelope_id])opened[input.envelope_id]={opened_at:stamp};}
          if(status===200)body={success:true,is_creator:creator,letters:lettersState(creator)};
        }else if(url.pathname.endsWith('/replies'))body={success:true,my_reply:null,replies:[]};
        else if(url.pathname.endsWith('/notifications'))body={notifications:[],unread_count:0};
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
    const until = async expression => { for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await wait(150); } console.log('Fixture check state', theme, coupon?.status, await evaluate(`JSON.stringify({path:location.pathname,text:document.body.innerText.slice(-2200)})`)); throw Error('Timed out waiting for ' + expression); };
    const click = async expression => {
      let point;
      // Viewer transitions and media decoding can shift a card after scrolling.
      for(let attempt=0;attempt<8;attempt++){
        await evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);await wait(220);
        point=await evaluate(`(()=>{const target=(${expression});const r=target.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);return{x,y,blocked:!(target===hit||target.contains(hit)),hit:hit?.tagName+':'+hit?.textContent?.slice(0,80)}})()`);
        if(!point.blocked)break;
      }
      assert.ok(!point.blocked, 'Control covered in '+theme+' at '+expression+': '+JSON.stringify(point));
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: point.x, y: point.y });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: point.x, y: point.y }); await wait(150);
    };
    await call('Page.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: 'http*' }] });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });



    fakeVideo=Buffer.from(await evaluate('(async()=>{const c=document.createElement("canvas");c.width=64;c.height=64;const context=c.getContext("2d"),stream=c.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:"video/webm"}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();for(let i=0;i<4;i++){context.fillStyle=i%2?"#481925":"#fff";context.fillRect(0,0,64,64);await new Promise(r=>setTimeout(r,100));}recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(",")[1]);reader.readAsDataURL(new Blob(chunks,{type:"video/webm"}));});})()'),'base64');
    const root=id=>'document.getElementById('+JSON.stringify(id)+')';
    const button=(id,text)=>'[...('+root(id)+').querySelectorAll("button")].find(b=>b.textContent.trim().startsWith('+JSON.stringify(text)+'))';
    const fill=async(expression,value)=>evaluate('(()=>{const e='+expression+';Object.getOwnPropertyDescriptor(e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    const action=async(id,text)=>{const target=button(id,text);await until('!!('+target+')&&!('+target+').matches(":disabled")');await click(target);};
    const visit=async(creator=false)=>{await call('Page.navigate',{url:base+'/t/'+code+'?case='+theme+(creator?'&manage='+manage:'')});await until('!!document.querySelector("#scratch_t07 h2")&&!!document.querySelector("#coupon_t08 h2")&&!!document.querySelector("#open_when_t09 article")');await evaluate('[...document.querySelectorAll("button")].find(b=>b.title==="Exit to normal scrollable page"||["Exit to Page","Explore Interactive Page"].includes(b.textContent.trim()))?.click()');await wait(750);};
    const capture=async(id,label)=>{if(!mobile)return;await fs.mkdir('.next/surprise-audit',{recursive:true});const clip=await evaluate('(()=>{const r='+root(id)+'.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()');const image=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});await fs.writeFile('.next/surprise-audit/'+theme+'-'+label+'.png',Buffer.from(image.data,'base64'));};
    for(const width of [1440,390])for(const nextTheme of themes){
      reset(nextTheme,width);console.log('Checking '+theme+' '+width+'px');await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:mobile?2:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await visit(true);await action('scratch_t07','Reveal surprise');await until(root('scratch_t07')+'.textContent.includes("A picnic surprise")');assert.equal(scratchOpened,null);await action('open_when_t09','After a long day');await until(root('open_when_t09')+'.textContent.includes("Rest here for a while")');assert.equal(letterPosts,0);assert.deepEqual(opened,{});
      await visit();assert.ok(!await evaluate(root('scratch_t07')+'.textContent.includes("A picnic surprise")'));assert.ok(!await evaluate(root('open_when_t09')+'.textContent.includes("Our own little world")'));
      for(const id of ['scratch_t07','coupon_t08','open_when_t09'])assert.ok(await evaluate('(()=>{const s=getComputedStyle('+root(id)+');const L=value=>{const c=value.slice(value.indexOf("(")+1,-1).split(",").slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};const a=L(s.color),b=L(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})()'),'Readable '+id);
      await capture('scratch_t07','scratch-covered');
      if(width===1440&&nextTheme===themes[0]){failScratch=true;await action('scratch_t07','Reveal surprise');await until('!!document.querySelector("#scratch_t07 [role=alert]")');assert.equal(scratchOpened,null);assert.ok(!await evaluate(root('scratch_t07')+'.textContent.includes("A picnic surprise")'));}
      await evaluate(root('scratch_t07')+'.querySelector("canvas").scrollIntoView({block:"center",behavior:"instant"})');await wait(250);const box=await evaluate('(()=>{const r='+root('scratch_t07')+'.querySelector("canvas").getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()');
      if(mobile)await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+15,y:box.y+20}]});else await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:box.x+15,y:box.y+20});
      for(let line=0;line<10&&!scratchOpened;line++){const y=box.y+20+line*20;for(let step=0;step<8;step++){const fraction=line%2?1-step/7:step/7,x=box.x+15+fraction*(box.w-30);if(mobile)await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});else await call('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x,y});}await wait(40);}
      if(mobile)await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:box.x+20,y:box.y+20});await until(root('scratch_t07')+'.textContent.includes("A picnic surprise")');assert.equal(scratchMethod,'scratch');await capture('scratch_t07','scratch-open');
      if(width===1440&&nextTheme===themes[0]){failLetter=true;await action('open_when_t09','When you miss me');await until('!!document.querySelector("#open_when_t09 [role=alert]")');assert.deepEqual(opened,{});assert.ok(!await evaluate(root('open_when_t09')+'.textContent.includes("Our own little world")'));}
      await action('open_when_t09','When you miss me');
      await until(root('open_when_t09')+'.textContent.includes("Our own little world")');const firstOpen=opened.miss.opened_at;await action('open_when_t09','When you miss me');assert.ok(!await evaluate('!!document.querySelector("#open_when_t09 video")'));await action('open_when_t09','When you miss me');assert.equal(opened.miss.opened_at,firstOpen);assert.equal(letterPosts,width===1440&&nextTheme===themes[0]?2:1);
      if(themes.indexOf(theme)%2){await until('document.querySelector("#open_when_t09 video").readyState>0');await evaluate('document.querySelector("#open_when_t09 video").play().catch(()=>{})');}else await until('document.querySelector("#open_when_t09 img").naturalWidth>0');await capture('open_when_t09','letter');
      await action('open_when_t09','Reply to');await until(`!!document.querySelector('section[aria-label="Voice & Photo Notes"] textarea')`);await evaluate('[...document.querySelectorAll("button")].find(b=>["Close drawer","Close"].includes(b.getAttribute("aria-label")))?.click()');await visit();assert.ok(await evaluate('document.querySelector("#scratch_t07 time")!==null'));assert.ok(await evaluate(root('open_when_t09')+'.textContent.includes("Opened")'));
      await fill(root('coupon_t08')+'.querySelector("textarea")','Sunday pancakes');await fill(root('coupon_t08')+'.querySelector("input")','2027-02-14T12:30');await capture('coupon_t08','coupon');
      if(width===1440&&nextTheme===themes[0]){failCoupon=true;await action('coupon_t08','Request to use');await until('!!document.querySelector("#coupon_t08 [role=alert]")');assert.equal(coupon.status,'available');assert.equal(await evaluate(root('coupon_t08')+'.querySelector("textarea").value'),'Sunday pancakes');}
      await action('coupon_t08','Request to use');await until(root('coupon_t08')+'.textContent.includes("Request sent")');assert.equal(coupon.request_note,'Sunday pancakes');assert.ok(coupon.preferred_date.endsWith('Z'));
      await visit(true);await action('coupon_t08','Suggest another time');await fill(root('coupon_t08')+'.querySelector("textarea")','Try next weekend');await action('coupon_t08','Send back for another time');await until(root('coupon_t08')+'.textContent.includes("Ready when you are")');assert.ok(coupon.history.some(e=>e.request_note==='Sunday pancakes'));
      await visit();await fill(root('coupon_t08')+'.querySelector("textarea")','Tea and waffles');await action('coupon_t08','Request to use');await until(root('coupon_t08')+'.textContent.includes("Request sent")');await visit(true);await action('coupon_t08','Accept request');await until(root('coupon_t08')+'.textContent.includes("Request accepted")');await action('coupon_t08','Mark as enjoyed');await until(root('coupon_t08')+'.textContent.includes("A promise, kept")');assert.equal(coupon.status,'fulfilled');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No horizontal overflow');
      await call('Page.navigate',{url:base+'/creator-center'});await until('!![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Replies & tool responses"))');const responses='[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Replies & tool responses"))';await click(responses);if(!await evaluate('('+responses+').getAttribute("aria-expanded")==="true"'))await evaluate('('+responses+').click()');await until('document.body.textContent.includes("Tea and waffles")');for(const text of ['A picnic surprise','Sunday pancakes','Try next weekend','Our own little world','Still sealed'])assert.ok(await evaluate('document.body.textContent.includes('+JSON.stringify(text)+')'),text);
      console.log('Passed '+theme+' '+width+'px: scratch gestures, sender previews, letter media/reply, coupon lifecycle/history, My Creations.');
    }
    await send('Browser.close');
  } finally { clearTimeout(timeout); ws?.terminate(); chrome.kill(); await wait(300); await fs.rm(profile, { recursive: true, force: true }).catch(() => {}); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
