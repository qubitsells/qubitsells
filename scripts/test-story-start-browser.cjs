// Checks the opening CTA against Chrome's real media playback policy.
// Reuse the isolated CDP/fixture transport from the existing surprise audit.
const fs=require('node:fs'),Module=require('node:module'),path=require('node:path');
const filename=path.resolve('scripts/test-surprises-browser.cjs');
let source=fs.readFileSync(filename,'utf8');
source=source.slice(0,source.indexOf('    fakeVideo=Buffer.from'));
source=source.replace("'--disable-gpu'","'--disable-gpu', '--autoplay-policy=user-gesture-required', '--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies'");
source=source.replace('theme,scene_index:0,','theme,music_track:musicMode==="none"?null:{id:musicMode==="youtube"?"yt-VMkLdJkeyA8":"fixture-song",type:musicMode==="youtube"?"youtube":"freetouse",youtubeId:musicMode==="youtube"?"VMkLdJkeyA8":undefined,title:"Fixture soundtrack",artist:"Fixture",mp3Url:base+"/api/fixture-song",startAt:.25,duration:2,waveform:[],thumbnailUrl:""},scene_index:0,');
source=source.replace("        if(url.pathname.startsWith('/api/media/'))",`        if(url.pathname==='/api/fixture-song'){await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'audio/wav'}],body:wave.toString('base64')},message.sessionId);return;}
        if(url.pathname.startsWith('/api/media/'))`);
const globals=String.raw`
let musicMode='mp3';
const sampleRate=8000,length=sampleRate*2,wave=Buffer.alloc(44+length*2);
wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(sampleRate,24);wave.writeUInt32LE(sampleRate*2,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(length*2,40);for(let i=0;i<length;i++)wave.writeInt16LE(Math.round(Math.sin(i/sampleRate*Math.PI*2*220)*1000),44+i*2);
`;
source=globals+source+String.raw`
    await call('Page.addScriptToEvaluateOnNewDocument',{source:'window.__playCalls=[];const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__playCalls.push({active:navigator.userActivation.isActive,time:this.currentTime});return original.apply(this,arguments)};'});
    const capture=async(label)=>{await fs.mkdir('.next/story-start-audit',{recursive:true});const result=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile('.next/story-start-audit/'+theme+'-'+label+'.png',Buffer.from(result.data,'base64'));};
    for(const width of [1440,390])for(const nextTheme of themes)for(const mode of ['mp3','youtube','none']){
      reset(nextTheme,width);musicMode=mode;console.log('Checking '+theme+' '+width+'px '+mode);
      await call('Emulation.setDeviceMetricsOverride',{width,height:mobile?740:900,deviceScaleFactor:mobile?2:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
      await call('Page.navigate',{url:base+'/t/'+code+'?case='+theme+'&music='+mode});await until('!!document.querySelector("[data-story-start]")');
      await wait(mode==='mp3'&&width===1440?4600:2800);
      const start='document.querySelector("[data-story-start]")';assert.equal(await evaluate('window.__playCalls.length'),0,'No audio attempted before Continue');assert.equal(await evaluate('!!document.querySelector("iframe[title]")'),false,'YouTube waits for Continue');assert.ok(await evaluate('!!'+start),'Opening waits for a click');
      if(mode==='none')assert.equal(await evaluate(start+'.textContent'),'Begin your story');
      if(mode==='mp3'&&mobile)await capture('opening');
      if(mobile){await evaluate(start+'.scrollIntoView({block:"center",behavior:"instant"})');const point=await evaluate('(()=>{const r='+start+'.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');const hit=await evaluate('(()=>{const r='+start+'.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return '+start+'.contains(hit)})()');assert.ok(hit,'Mobile CTA can be tapped');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else await click(start);
      await until('!document.querySelector("[data-story-start]")');
      if(mode==='mp3'){await until('!!document.querySelector("audio")&&!document.querySelector("audio").paused&&document.querySelector("audio").currentTime>.25');assert.ok(await evaluate('window.__playCalls.some(call=>call.active)'), 'play() runs during the trusted click/tap');}
      else if(mode==='youtube'){await until('!!document.querySelector("iframe[title]")');const src=await evaluate('document.querySelector("iframe[title]").src');assert.ok(src.includes('autoplay=1'));}
      else assert.equal(await evaluate('window.__playCalls.length'),0);
      // Existing next-scene buttons remain available once the intro is dismissed.
      const next='[...document.querySelectorAll("button")].find(button=>button.textContent.trim()==="Next"||button.getAttribute("aria-label")==="Next scene"||button.title==="Next scene")';
      console.log('Passed '+theme+' '+width+'px '+mode+': explicit start, trusted playback or deferred embed.');
    }
    await send('Browser.close');
  } finally {clearTimeout(timeout);ws?.terminate();chrome.kill();await wait(300);await fs.rm(profile,{recursive:true,force:true}).catch(()=>{});}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
`;
const audit=new Module(filename,module);audit.filename=filename;audit.paths=module.paths;audit._compile(source,filename);
