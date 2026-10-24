// Run against a local production build: node scripts/test-date-night-browser.cjs
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
const slots = [1, 2, 3].map(day => ({ id: `date-${day}`, label: `Evening ${day}`, start_time: `2027-11-0${day}T15:00:00Z` }));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let theme, invitation, posted, failNext = false;
function reset(next) {
  theme = next; posted = null;
  invitation = { id: 'fixture-invitation', template_id: 'fixture-template', tool_id: 'invitation_t02', activity: 'Our next date', invitation_message: 'A little time together?', format: 'in_person', location: 'The garden cafe', date_mode: 'slots', duration_minutes: 120, sender_timezone: 'Asia/Karachi', proposed_slots: slots, allow_counterproposal: true, status: 'proposed', revision: 1, available_slots: [], recipient_activities: [], created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z' };
}
function template() { return { id: 'fixture-template', short_code: code, theme, scene_index: 0, partner_name: 'Sam', partner_from: 'Alex', message: 'A little time together.', has_media: false, media_items: [], created_at: '2026-10-23T12:00:00Z', expires_at: '2099-11-01T00:00:00Z', view_count: 1, tools: [{ id: 'invitation_t02', type: 'invitation', enabled: true, activity: invitation.activity, invitationMessage: invitation.invitation_message, format: 'in_person', dateMode: 'slots', durationMinutes: 120, senderTimezone: 'Asia/Karachi', proposedSlots: slots, allowCounterproposal: true }] }; }
function collection() { return { ...template(), is_expired: false, replies_purged: false, replies: [{ id: 'reply', tool_id: 'reply_t01', author_name: 'Sam', message: 'A separate personal reply', media_items: [], created_at: '2026-10-23T12:00:00Z' }], invitation: { id: invitation.id, activity_title: invitation.activity, sender_message: invitation.invitation_message, status: invitation.status, location_type: invitation.format, location_detail: invitation.location, duration_minutes: 120, date_mode: 'slots', sender_timezone: invitation.sender_timezone, recipient_timezone: invitation.recipient_timezone, proposed_slots: slots, available_slots: invitation.available_slots, confirmed_slot: invitation.selected_slot, recipient_activities: invitation.recipient_activities, recipient_idea: invitation.recipient_idea, partner_counter_note: invitation.recipient_note, partner_response_status: invitation.recipient_response, responded_at: invitation.responded_at, revision: invitation.revision, updated_at: invitation.updated_at } }; }

(async () => {
  const profile = await fs.mkdtemp(join(tmpdir(), 'qubitsells-rsvp-'));
  const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  const timeout = setTimeout(() => { console.error('Browser check timed out.'); chrome.kill(); ws?.terminate(); process.exitCode = 1; }, 180000);
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
        let body = { success: true }; let status = 200;
        if (url.pathname === `/api/templates/${code}`) body = { success: true, template: template() };
        else if (url.pathname === '/api/creator-center') body = { success: true, templates: [collection()] };
        else if (url.pathname.endsWith('/invitation')) {
          if (request.method === 'POST') {
            posted = JSON.parse(request.postData);
            if (failNext) { status = 503; body = { error: 'Fixture unavailable. Try again.' }; failNext = false; }
            else { invitation = { ...invitation, status: 'awaiting_confirmation', revision: invitation.revision + 1, available_slots: slots.filter(slot => posted.available_slot_ids.includes(slot.id)), recipient_activities: posted.activity_choices, recipient_idea: posted.alternative_idea, recipient_note: posted.partner_note_text, recipient_response: posted.response_type, recipient_timezone: posted.partner_tz, responded_at: new Date().toISOString() }; body = { success: true, status: invitation.status, revision: invitation.revision, invitation }; }
          } else if (request.method === 'PATCH') {
            const input = JSON.parse(request.postData);
            assert.equal(input.action_type, 'confirm_slot'); assert.equal(input.expected_revision, invitation.revision);
            assert.ok(invitation.available_slots.some(slot => slot.id === input.selected_slot_id));
            invitation = { ...invitation, status: 'confirmed', selected_slot: slots.find(slot => slot.id === input.selected_slot_id), revision: invitation.revision + 1 };
            body = { success: true, result: { invitation } };
          } else body = { success: true, invitation };
        } else if (url.pathname.endsWith('/notifications')) body = { notifications: [], unread_count: 0 };
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
    const evaluate = async expression => { const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw Error(value.exceptionDetails.text + ': ' + value.result.description); return value.result.value; };
    const until = async expression => { for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await wait(150); } console.log('Fixture check state', theme, invitation.status, await evaluate(`JSON.stringify({path:location.pathname,text:document.body.innerText.slice(-2200)})`)); throw Error('Timed out waiting for ' + expression); };
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
    for (const width of [1440, 390]) for (const nextTheme of themes) {
      reset(nextTheme); await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      await call('Page.navigate', { url: `${base}/t/${code}?case=${nextTheme}-${width}` });
      await until(`!!document.querySelector('#invitation_t02 input[type=checkbox]')`);
      await evaluate(`[...document.querySelectorAll('button')].find(button=>button.title==='Exit to normal scrollable page'||['Exit to Page','Explore Interactive Page'].includes(button.textContent.trim()))?.click()`); await wait(750);
      const activities = `document.querySelector('#invitation_t02 fieldset fieldset')`;
      const dates = `[...document.querySelectorAll('#invitation_t02 fieldset')].find(fieldset=>fieldset.firstElementChild?.textContent.includes('Which dates'))`;
      assert.equal(await evaluate(`(${dates}).querySelectorAll('input[type=checkbox]:checked').length`), 0);
      await click(`(${activities}).querySelector('input')`);
      await click(`(${activities}).querySelector('input')`);
      assert.equal(await evaluate(`(${activities}).querySelector('input').checked`), false, 'activity deselects');
      await click(`(${activities}).querySelector('input')`);
      await click(`(${dates}).querySelectorAll('input')[0]`);
      await click(`(${dates}).querySelectorAll('input')[1]`);
      await click(`(${dates}).querySelectorAll('input')[0]`);
      assert.equal(await evaluate(`(${dates}).querySelectorAll('input:checked').length`), 1, 'date deselects independently');
      await click(`(${dates}).querySelectorAll('input')[2]`);
      await evaluate(`(()=>{const tool=document.getElementById('invitation_t02');for(const [element,value] of [[tool.querySelector('input[maxlength="500"]'),'A picnic'],[tool.querySelector('textarea'),'After work please']]){const setter=Object.getOwnPropertyDescriptor(element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
      assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`), `${nextTheme} ${width}: no horizontal overflow`);
      const action = `[...document.querySelectorAll('#invitation_t02 button')].find(button=>button.textContent==='Send my availability')`;
      if (nextTheme === themes[0] && width === 1440) { failNext = true; await click(action); await until(`!!document.querySelector('#invitation_t02 [role=alert]')`); assert.equal(invitation.status, 'proposed'); assert.ok(!await evaluate(`document.querySelector('#invitation_t02').textContent.includes('Availability sent.')`), 'failed response cannot claim success'); }
      if (width === 390) { await fs.mkdir('.next/date-night-audit', { recursive: true }); const clip = await evaluate(`(()=>{const r=document.querySelector('#invitation_t02').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`); const capture = await call('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true }); await fs.writeFile(`.next/date-night-audit/${nextTheme}.png`, Buffer.from(capture.data, 'base64')); }
      await click(action); await until(`document.querySelector('#invitation_t02').textContent.includes('Availability sent.')`);
      assert.deepEqual(posted.available_slot_ids, ['date-2', 'date-3']); assert.equal(posted.alternative_idea, 'A picnic'); assert.equal(posted.partner_note_text, 'After work please'); assert.equal(posted.activity_choices.length, 1);
      await call('Page.navigate', { url: `${base}/creator-center` });
      await until(`!![...document.querySelectorAll('button')].find(button=>button.textContent==='Confirm this date')`);
      assert.ok(await evaluate(`!!document.querySelector('section[aria-label="Replies"]')&&!!document.querySelector('section[aria-label="Tool responses"]')`));
      await click(`[...document.querySelectorAll('button')].find(button=>button.textContent==='Confirm this date')`);
      await until(`document.body.textContent.includes('Confirmed date')`);
      assert.equal(invitation.status, 'confirmed'); assert.equal(invitation.selected_slot.id, 'date-2');
      console.log(`Passed ${nextTheme} ${width}px: check/uncheck, save details, separate replies, sender confirmation.`);
    }
    await send('Browser.close');
  } finally { clearTimeout(timeout); ws?.terminate(); chrome.kill(); await wait(300); await fs.rm(profile, { recursive: true, force: true }).catch(() => {}); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
