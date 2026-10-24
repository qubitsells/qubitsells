// Local fixture check: node scripts/test-activities-browser.cjs
// Every API request is intercepted with fixtures. No live data is written.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const WebSocket = require('next/dist/compiled/ws');
const base = process.env.RSVP_TEST_URL || 'http://127.0.0.1:3105';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('This check only supports a local fixture server.');
const themes = ['our-little-pink-day', 'halloween-pumpkin-moon', 'halloween-midnight-key', 'starlit-story', 'spooky-the-haunted-waltz', 'anime-storm-and-flame'].filter(theme=>!process.env.ACTIVITY_TEST_THEME||theme===process.env.ACTIVITY_TEST_THEME);
if(!themes.length)throw Error('Choose a known template theme.');
const code = 'dateNightFixture';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));


let theme,mobile,poll,questionDraft,submission,receiverDraft,senderDraft,receiverAnswer,senderAnswer,revealed,failPoll=false,failQuestions=false,questionPosts=[],revealPayloads=[];
const manage='a'.repeat(64),stamp='2026-10-24T12:00:00Z';
const questionItems=[{id:'memory',prompt:'Your favourite memory?',type:'long',skippable:false,reveal_mode:'after_partner_answers',sender_answer:'A quiet afternoon'},{id:'drink',prompt:'Tea or coffee?',type:'choice',options:['Tea','Coffee'],skippable:false},{id:'optional',prompt:'Anything else?',type:'short',skippable:true}];
const secretQuestions=[{id:'place',prompt:'A place for us?'},{id:'wish',prompt:'A shared wish?'}];
function reset(next,width){theme=next;mobile=width<500;poll={id:'poll',question:'Our next outing?',description:'Choose a little time together.',options:[{id:'park',text:'Park'},{id:'cafe',text:'Cafe'}],custom_suggestions:[],creator_votes:['park'],partner_votes:[],creator_voted:true,partner_voted:false,selection_mode:'both_vote',allow_multiple:!mobile,allow_custom_suggestion:true,status:'open',revision:1};questionDraft=null;submission=null;receiverDraft=null;senderDraft=null;receiverAnswer=null;senderAnswer=null;revealed=false;questionPosts=[];revealPayloads=[];}
function template(){return{id:'fixture-template',short_code:code,theme,scene_index:0,partner_name:'Sam',partner_from:'Alex',message:'A little time together.',has_media:false,media_items:[],created_at:stamp,expires_at:'2099-11-01T00:00:00Z',view_count:1,tools:[{id:'poll_t04',type:'poll',enabled:true},{id:'question_t05',type:'question',enabled:true},{id:'reveal_t06',type:'private_reveal',enabled:true}]};}
function secretState(creator){const eligible=!!receiverAnswer&&!!senderAnswer;return{id:'secret',prompt:'A shared future',description:'An honest thought from each of you.',questions:secretQuestions,revision:1,countdown_seconds:1,status:revealed?'revealed':eligible?'eligible':receiverAnswer||senderAnswer?'waiting':'open',creator_locked:!!senderAnswer,partner_locked:!!receiverAnswer,is_eligible:eligible,is_revealed:revealed,my_draft:creator?senderDraft:receiverDraft,my_answer:creator?senderAnswer:receiverAnswer,partner_answer:revealed?(creator?receiverAnswer:senderAnswer):null,revealed_at:revealed?stamp:null};}
function card(creator){return{id:'questions',title:'A few thoughts',description:'Words worth keeping.',revision:1,questions:questionItems.map(item=>({...item,sender_answer:creator||submission?item.sender_answer:undefined}))};}
function collection(){return{...template(),is_expired:false,replies_purged:false,replies:[],invitation:null,poll:{...poll,updated_at:stamp},questions:{...card(true),partner_submission:submission?{...submission,is_draft:false}:undefined},reveal:{id:'secret',prompt:'A shared future',questions:secretQuestions,status:revealed?'revealed':'waiting',creator_locked_at:senderAnswer?stamp:null,partner_locked_at:receiverAnswer?stamp:null,revealed_at:revealed?stamp:null,partner_answer:revealed?receiverAnswer:null}};}
(async () => {
  const profile = await fs.mkdtemp(join(tmpdir(), 'qubitsells-activities-'));
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


        let body={success:true},status=200;const creator=url.searchParams.get('manage')===manage;
        if(url.pathname==='/api/templates/'+code)body={success:true,template:template()};
        else if(url.pathname==='/api/creator-center')body={success:true,templates:[collection()]};
        else if(url.pathname.endsWith('/poll')){
          if(request.method==='POST'){
            const input=JSON.parse(request.postData);assert.equal(input.is_creator_vote,creator);assert.ok(Array.isArray(input.selected_option_ids));
            if(failPoll){failPoll=false;status=503;body={error:'Fixture poll save failed.'};}
            else{let votes=input.selected_option_ids;if(input.custom_suggestion_text){poll.custom_suggestions.push({id:'museum',text:input.custom_suggestion_text,suggested_by:creator?'creator':'partner',created_at:stamp});votes=poll.allow_multiple?[...votes,'museum']:['museum'];}poll[creator?'creator_votes':'partner_votes']=votes;poll[creator?'creator_voted':'partner_voted']=true;poll.resolved_option_id=poll.creator_votes.find(id=>poll.partner_votes.includes(id))||null;poll.status=poll.resolved_option_id?'resolved':'open';}
          }else if(request.method==='PATCH'){const input=JSON.parse(request.postData);assert.ok(creator);poll.resolved_option_id=input.agreed_option_id;poll.status='resolved';}
          if(status===200)body={success:true,is_creator:creator,is_partner:!creator,my_votes:creator?poll.creator_votes:poll.partner_votes,is_closed:false,poll};
        }else if(url.pathname.endsWith('/questions')){
          if(request.method==='POST'){const input=JSON.parse(request.postData);questionPosts.push(input);if(input.action==='draft')questionDraft=input.answers;else if(failQuestions){failQuestions=false;status=503;body={error:'Fixture answers save failed.'};}else{submission={answers:input.answers,submitted_at:stamp};questionDraft=null;}}
          if(status===200)body={success:true,is_creator:creator,is_partner:!creator,card:card(creator),my_draft:creator?null:questionDraft,my_submission:creator?null:submission,partner_submission:creator?submission:null,submitted_at:stamp};
        }else if(url.pathname.endsWith('/reveal')){
          if(request.method==='POST'){const input=JSON.parse(request.postData);assert.equal(input.is_creator,creator);if(input.action==='draft'){if(creator)senderDraft=input.answers;else receiverDraft=input.answers;}else if(input.action==='lock'){if(creator){senderAnswer=input.answers;senderDraft=null;}else{receiverAnswer=input.answers;receiverDraft=null;}}else if(input.action==='withdraw'){if(creator){senderDraft=senderAnswer;senderAnswer=null;}else{receiverDraft=receiverAnswer;receiverAnswer=null;}}else if(input.action==='confirm'){assert.ok(senderAnswer&&receiverAnswer);revealed=true;}}
          const state=secretState(creator);if(!revealed)assert.equal(state.partner_answer,null);revealPayloads.push(state);body={success:true,is_creator:creator,is_partner:!creator,reveal:state};
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
    const until = async expression => { for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await wait(150); } console.log('Fixture check state', theme, revealed, await evaluate(`JSON.stringify({path:location.pathname,text:document.body.innerText.slice(-2200)})`)); throw Error('Timed out waiting for ' + expression); };
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


    const root=id=>'document.getElementById('+JSON.stringify(id)+')';
    const button=(id,text)=>'[...('+root(id)+').querySelectorAll("button")].find(b=>b.textContent.trim().startsWith('+JSON.stringify(text)+'))';
    const fill=async(expression,value)=>evaluate('(()=>{const e='+expression+';Object.getOwnPropertyDescriptor(e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    const action=async(id,text)=>{const target=button(id,text);await until('!!('+target+')&&!('+target+').matches(":disabled")');await click(target);};
    const visit=async(creator=false)=>{await call('Page.navigate',{url:base+'/t/'+code+'?case='+theme+(creator?'&manage='+manage:'')});await until('!!document.querySelector("#questions_t05 textarea")||!!document.querySelector("#questions_t05 time")');await evaluate('[...document.querySelectorAll("button")].find(b=>b.title==="Exit to normal scrollable page"||["Exit to Page","Explore Interactive Page"].includes(b.textContent.trim()))?.click()');await wait(750);};
    const capture=async(id,label)=>{if(!mobile)return;await fs.mkdir('.next/activity-audit',{recursive:true});const clip=await evaluate('(()=>{const r='+root(id)+'.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()');const image=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});await fs.writeFile('.next/activity-audit/'+theme+'-'+label+'.png',Buffer.from(image.data,'base64'));};
    for(const width of [1440,390])for(const nextTheme of themes){
      reset(nextTheme,width);console.log('Checking '+theme+' '+width+'px');await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile});await visit();
      for(const id of ['poll_t04','questions_t05','reveal_t06'])assert.ok(await evaluate(`(()=>{const style=getComputedStyle(document.getElementById(${JSON.stringify(id)}));const luminance=value=>{const rgb=value.slice(value.indexOf("(")+1,-1).split(",").slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};const a=luminance(style.color),b=luminance(style.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})()`),id+' readable text contrast');
      if(process.env.ACTIVITY_CONTRAST_ONLY){console.log('Passed '+theme+' '+width+'px: text contrast.');continue;}
      const pollRoot=root('poll_t04');
      await click(pollRoot+'.querySelector("input")');
      if(!mobile){await click(pollRoot+'.querySelectorAll("input")[1]');await click(pollRoot+'.querySelectorAll("input")[0]');assert.equal(await evaluate(pollRoot+'.querySelectorAll("input:checked").length'),1);await click(pollRoot+'.querySelectorAll("input")[0]');}
      else{await click(pollRoot+'.querySelectorAll("input")[1]');assert.equal(await evaluate(pollRoot+'.querySelectorAll("input:checked").length'),1);}
      await fill(pollRoot+'.querySelector("input:not([type=checkbox]):not([type=radio])")','Museum');await capture('poll_t04','poll');
      if(width===1440&&nextTheme===themes[0]){failPoll=true;await action('poll_t04','Send my choices');await until('!!document.querySelector("#poll_t04 [role=alert]")');assert.equal(poll.partner_votes.length,0);}
      await action('poll_t04','Send my choices');await until('document.querySelector("#poll_t04").textContent.includes("Your choices are saved.")');assert.ok(poll.partner_votes.includes('museum'));
      const qRoot=root('questions_t05');assert.equal(await evaluate(button('questions_t05','Next question')+'.disabled'),true);
      await fill(qRoot+'.querySelector("textarea")','Our first trip');await action('questions_t05','Save draft');await until(qRoot+'.textContent.includes("Draft saved privately.")');assert.equal(questionDraft.memory.answer_text,'Our first trip');
      await visit();assert.equal(await evaluate(qRoot+'.querySelector("textarea").value'),'Our first trip');
      await action('questions_t05','Next question');await click(qRoot+'.querySelectorAll("input[type=radio]")[1]');await action('questions_t05','Next question');await action('questions_t05','Skip question');
      await until(qRoot+'.textContent.includes("Review your answers")');await capture('questions_t05','questions');
      if(width===1440&&nextTheme===themes[0]){failQuestions=true;await action('questions_t05','Submit my answers');await until('!!document.querySelector("#questions_t05 [role=alert]")');assert.equal(submission,null);}
      await action('questions_t05','Submit my answers');await until(qRoot+'.textContent.includes("Answers saved & shared.")');assert.equal(submission.answers.drink.selected_choice,'Coffee');assert.equal(submission.answers.optional.skipped,true);assert.ok(await evaluate(qRoot+'.textContent.includes("A quiet afternoon")'));
      const rRoot=root('reveal_t06');await fill(rRoot+'.querySelectorAll("textarea")[0]','The mountains');await fill(rRoot+'.querySelectorAll("textarea")[1]','More time together');await action('reveal_t06','Save draft');await until(rRoot+'.textContent.includes("Draft saved privately.")');await capture('reveal_t06','secret');
      await action('reveal_t06','Lock my answers');await until(rRoot+'.textContent.includes("Your answer is locked")');assert.equal(senderAnswer,null);assert.ok(!await evaluate(rRoot+'.textContent.includes("A home together")'));
      await action('reveal_t06','Withdraw to edit');await until('!!document.querySelector("#reveal_t06 textarea")');assert.equal(await evaluate(rRoot+'.querySelector("textarea").value'),'The mountains');await action('reveal_t06','Lock my answers');await until(rRoot+'.textContent.includes("Your answer is locked")');
      await visit(true);await fill(rRoot+'.querySelectorAll("textarea")[0]','The sea');await fill(rRoot+'.querySelectorAll("textarea")[1]','A home together');await action('reveal_t06','Lock my answers');await until(rRoot+'.textContent.includes("You have both locked")');assert.ok(!revealed);assert.equal(revealPayloads.at(-1).partner_answer,null);
      await action('reveal_t06','Reveal our answers');await until(rRoot+'.textContent.includes("Both sides of the secret.")');assert.ok(await evaluate(rRoot+'.textContent.includes("The mountains")'));
      await visit();await until(rRoot+'.textContent.includes("Both sides of the secret.")');assert.ok(await evaluate(rRoot+'.textContent.includes("A home together")'));assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No horizontal overflow');
      await call('Page.navigate',{url:base+'/creator-center'});await until('!![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Replies & tool responses"))');const responses='[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Replies & tool responses"))';await click(responses);if(!await evaluate('('+responses+').getAttribute("aria-expanded")==="true"'))await evaluate('('+responses+').click()');
      await until('document.body.textContent.includes("Our first trip")');for(const text of ['Museum','Coffee','Skipped by the receiver','The mountains','More time together'])assert.ok(await evaluate(`document.querySelector('section[aria-label="Tool responses"]').textContent.includes(${JSON.stringify(text)})`),text);
      console.log('Passed '+theme+' '+width+'px: poll, draft restore, Q&A review/skip, private secret, sender reveal, My Creations.');
    }
    await send('Browser.close');
  } finally { clearTimeout(timeout); ws?.terminate(); chrome.kill(); await wait(300); await fs.rm(profile, { recursive: true, force: true }).catch(() => {}); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
