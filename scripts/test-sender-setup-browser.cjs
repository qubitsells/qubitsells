// Local intercepted fixtures: checks editors and recipient flows without purchases or live writes.
const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const filename=path.resolve('scripts/test-activities-browser.cjs');let source=fs.readFileSync(filename,'utf8');source=source.slice(0,source.indexOf('    const root=id=>'));
source=source.replace('const questionItems=','let questionItems=').replace('const secretQuestions=','let secretQuestions=');
source=source.replace('revision:1,countdown_seconds:1,status:', 'sender_prepared:true,revision:1,countdown_seconds:1,status:');
source=source.replace('if(url.pathname===\'/api/templates/\'+code)',`if(url.pathname==='/api/templates/create'){
 const input=JSON.parse(request.postData);published=input;
 const ownPoll=input.tools.find(t=>t.type==='poll'),ownQuestions=input.tools.find(t=>t.type==='question'),ownSecret=input.tools.find(t=>t.type==='private_reveal');
 assert.ok(ownPoll.senderOptionIds.length);assert.equal(ownQuestions.questions[0].sender_answer,'Our first coffee');assert.equal(ownSecret.senderAnswers.main,'A home together');
 poll={...poll,options:ownPoll.options,creator_votes:ownPoll.senderOptionIds,partner_votes:[],creator_voted:true,partner_voted:false,sender_prepared:true,allow_multiple:false};
 questionItems=ownQuestions.questions;senderQuestionAnswers=Object.fromEntries(questionItems.map(q=>[q.id,{question_id:q.id,skipped:false,answer_text:q.sender_answer}]));
 secretQuestions=[{id:'main',prompt:ownSecret.prompt}];senderAnswer=ownSecret.senderAnswers;receiverAnswer=null;receiverDraft=null;revealed=false;
 body={success:true,short_code:code,url:base+'/t/'+code,manage_url:base+'/t/'+code+'?manage='+manage};
 }else if(url.pathname==='/api/templates/'+code)`);
source=source.replace('my_submission:creator?null:submission,partner_submission:creator?submission:null','my_submission:creator?{answers:senderQuestionAnswers,submitted_at:stamp}:submission,partner_submission:creator?submission:(submission?{answers:senderQuestionAnswers,submitted_at:stamp}:null)');
source='let published=null,senderQuestionAnswers={};\n'+source+String.raw`
    const button=text=>'[...document.querySelectorAll("button")].find(b=>b.textContent.trim().includes('+JSON.stringify(text)+'))';
    const action=async text=>{const target=button(text);await until('!!('+target+')&&!('+target+').disabled');await click(target);};
    const fill=async(expression,value)=>evaluate('(()=>{const e='+expression+';Object.getOwnPropertyDescriptor(e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    const toggle=async number=>{const field='document.querySelectorAll("main h4")['+(number-1)+'].closest(".rounded-3xl").querySelector("input[type=checkbox]")';await click('('+field+').parentElement');};
    const capture=async(kind)=>{if(!mobile)return;await fs.mkdir('.next/sender-setup-audit',{recursive:true});const clip=await evaluate('(()=>{const e=document.querySelector("[data-sender-setup='+kind+']"),r=e.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()');const result=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});await fs.writeFile('.next/sender-setup-audit/'+theme+'-'+kind+'.png',Buffer.from(result.data,'base64'));};
    const visit=async(creator=false)=>{await call('Page.navigate',{url:base+'/t/'+code+'?case='+theme+(creator?'&manage='+manage:'')});await until('!!document.querySelector("#poll_t04 h2")&&!!document.querySelector("#questions_t05 h2")&&!!document.querySelector("#reveal_t06 h2")');await evaluate('[...document.querySelectorAll("button")].find(b=>b.title==="Exit to normal scrollable page"||["Exit to Page","Explore Interactive Page"].includes(b.textContent.trim()))?.click()');await wait(750);};
    for(const width of [1440,390])for(const nextTheme of themes){
      reset(nextTheme,width);published=null;console.log('Checking sender setup '+theme+' '+width+'px');await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:mobile?2:1,mobile});
      await call('Page.navigate',{url:base+'/templates/'+theme+'?order=11111111-1111-4111-8111-111111111111'});await until('document.querySelectorAll("main input[type=text]").length>=2');await until('document.readyState==="complete"');await wait(700);await fill('document.querySelectorAll("main input[type=text]")[0]','Sam');await fill('document.querySelectorAll("main input[type=text]")[1]','Alex');await action('Continue to Tools Selection');await until('document.querySelectorAll("main h4").length>=11');
      await toggle(2); // No date options in this fixture; isolate the three sender-response tools.
      await toggle(4);await until('!!document.querySelector("[data-sender-setup=poll] input")');assert.equal(await evaluate('('+button('Continue to Floating Gallery')+').disabled'),true);await click('document.querySelector("[data-sender-setup=poll] label")');
      await toggle(5);await until('!!document.querySelector("[data-sender-setup=question] textarea")');assert.equal(await evaluate('('+button('Continue to Floating Gallery')+').disabled'),true);await fill('document.querySelector("[data-sender-setup=question] textarea")','Our first coffee');
      await toggle(6);await until('!!document.querySelector("[data-sender-setup=secret] textarea")');assert.equal(await evaluate('('+button('Continue to Floating Gallery')+').disabled'),true);await fill('document.querySelector("[data-sender-setup=secret] textarea")','A home together');await until('!('+button('Continue to Floating Gallery')+').disabled');
      for(const kind of ['poll','question','secret'])await capture(kind);assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Editor fits screen');
      await action('Continue to Floating Gallery');await action('Continue to Music');const publishLabel={'our-little-pink-day':'Generate Secret Link','halloween-pumpkin-moon':'Generate Pumpkin Moon Date','halloween-midnight-key':'Create Midnight Key Story','starlit-story':'Publish & Create Starlit Story','spooky-the-haunted-waltz':'Create Haunted Waltz Story','anime-storm-and-flame':'Publish & Create Storm & Flame'}[theme];await action(publishLabel);await until('!!('+button('Copy')+')');assert.ok(published);assert.equal(published.tools.find(t=>t.type==='poll').senderOptionIds.length,1);
      await visit(true);assert.equal(await evaluate('document.querySelectorAll("#questions_t05 textarea,#reveal_t06 textarea").length'),0,'Creator is not asked to answer again');assert.ok(!await evaluate('document.getElementById("poll_t04").textContent.includes("Send my choices")'));assert.ok(!await evaluate('document.getElementById("reveal_t06").textContent.includes("Withdraw to edit")'));
      await visit();assert.ok(!await evaluate('document.getElementById("questions_t05").textContent.includes("Our first coffee")'));assert.ok(!await evaluate('document.getElementById("reveal_t06").textContent.includes("A home together")'));
      await click('document.querySelector("#poll_t04 label")');await action('Send my choices');await fill('document.querySelector("#questions_t05 textarea")','Our walk home');await action('Review answers');await action('Submit my answers');await until('document.getElementById("questions_t05").textContent.includes("Our first coffee")');
      await fill('document.querySelector("#reveal_t06 textarea")','A garden together');await action('Lock my answer');await action('Reveal our answers');await until('document.getElementById("reveal_t06").textContent.includes("A home together")');assert.ok(senderAnswer);assert.ok(receiverAnswer);assert.equal(questionPosts.filter(post=>post.is_creator).length,0);assert.equal(revealed,true);
      console.log('Passed '+theme+' '+width+'px: required setup fields, payload, creator read-only view, recipient completes without another sender response.');
    }
    await send('Browser.close');
  }finally{clearTimeout(timeout);ws?.terminate();chrome.kill();await wait(300);await fs.rm(profile,{recursive:true,force:true}).catch(()=>{});}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
`;
const audit=new Module(filename,module);audit.filename=filename;audit.paths=module.paths;audit._compile(source,filename);
