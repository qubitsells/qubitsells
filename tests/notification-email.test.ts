import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { smtpSettings, type TransactionalEmail } from "../lib/server/smtp";
import { notificationEmail, type EmailNotification } from "../lib/server/email-template";
import { deliverNotificationEmails } from "../lib/server/notification-email";
import { GET as emailEndpoint } from "../app/api/notifications/email/route";
import type { StoreOrder } from "../lib/commerce";

const buyer = "11111111-1111-4111-8111-111111111111";
const order: StoreOrder = { id:"22222222-2222-4222-8222-222222222222", product_slug:"our-little-pink-day", product_name:"Our Little Pink Day", duration_hours:168, amount_cents:300, currency:"usd", payment_mode:"live", status:"paid", created_at:"2026-10-23T00:00:00Z", paid_at:"2026-10-23T00:01:00Z", fulfilled_at:null, template_id:null, refunded_amount_cents:0 };
const job: EmailNotification = { notification_id:"33333333-3333-4333-8333-333333333333", lease_token:"44444444-4444-4444-8444-444444444444", user_id:buyer, kind:"order", title:"Your template is ready to personalize", message:"Our Little Pink Day", href:"/profile?view=orders", dedupe_key:`order:${order.id}:paid`, calendar_couple_id:null, read_at:null };
const settings = { EMAIL_DELIVERY_ENABLED:"true", SMTP_PASSWORD:"fixture", SMTP_HOST:"mail.spacemail.com", SMTP_PORT:"465", SMTP_USER:"support@qubitsells.com" };
async function enabled<T>(action:()=>Promise<T>) {
  const previous = Object.fromEntries(Object.keys(settings).map(key=>[key,process.env[key]]));
  Object.assign(process.env,settings);
  try { return await action(); } finally { for(const [key,value] of Object.entries(previous)) { if(value===undefined)delete process.env[key];else process.env[key]=value; } }
}

test("Spacemail uses verified TLS on 465 or required STARTTLS on 587, and stays disabled without a password",()=>{
  const implicit=smtpSettings(settings)!;assert.equal(implicit.options.secure,true);assert.equal(implicit.options.port,465);assert.equal(implicit.options.tls?.rejectUnauthorized,true);assert.equal(implicit.options.logger,false);
  const starttls=smtpSettings({...settings,SMTP_PORT:"587"})!;assert.equal(starttls.options.secure,false);assert.equal(starttls.options.requireTLS,true);
  assert.equal(smtpSettings({...settings,EMAIL_DELIVERY_ENABLED:"false"}),null);assert.equal(smtpSettings({...settings,SMTP_PASSWORD:""}),null);
  for(const change of [{SMTP_PORT:"25"},{SMTP_USER:"bad\r\nBcc:other@example.com"},{SMTP_FROM:"Name <someone@example.com>"},{SMTP_HOST:"https://mail.spacemail.com"}])assert.throws(()=>smtpSettings({...settings,...change}));
});

test("order confirmations contain accurate details, a personalization link, plain text, and honest test labels",()=>{
  const email=notificationEmail(job,"buyer@example.com",order);
  for(const expected of ["Your order is confirmed.","Our Little Pink Day","$3.00 USD","7 days","/my-templates","support@qubitsells.com","#481925"])assert.ok(email.html.includes(expected),expected);
  assert.ok(email.text.includes("duration begins when you publish"));assert.equal(email.subject,"Your QubitSells order is confirmed");assert.equal(email.messageId,notificationEmail(job,"buyer@example.com",order).messageId);
  const testEmail=notificationEmail(job,"buyer@example.com",{...order,payment_mode:"test"});assert.ok(testEmail.subject.startsWith("[Test]"));assert.ok(testEmail.html.includes("No real payment was taken"));
  const refund=notificationEmail({...job,dedupe_key:`order:${order.id}:refunded`,title:"Your order was refunded"},"buyer@example.com",{...order,status:"refunded",refunded_amount_cents:300});assert.ok(refund.html.includes("Refund amount"));
});

test("notification emails escape private/untrusted text and keep buttons on the configured site",()=>{
  const malicious=notificationEmail({...job,kind:"template_response",title:'<script>alert("x")</script>',message:'<img src=x onerror="alert(1)">',href:"/\\attacker.invalid"},"buyer@example.com");
  assert.ok(!malicious.html.includes("<script>"));assert.ok(!malicious.html.includes("<img src=x"));assert.ok(malicious.html.includes("&lt;script&gt;"));assert.ok(!malicious.html.includes('href="https://attacker.invalid'));
  assert.ok(malicious.html.includes("See the response"));
});

function fixture(options: {jobs?:EmailNotification[];unverified?:boolean;optOut?:boolean;deleted?:boolean;refunded?:boolean;disconnected?:boolean}={}) {
  const finishes:{p_outcome:string;p_error:string|null;p_lease_token:string}[]=[];
  const db=createClient("https://email-fixture.invalid","fixture-service-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url);let body:unknown;
    if(url.pathname.endsWith("/rpc/qubit_claim_notification_emails"))body=options.jobs||[job];
    else if(url.pathname.endsWith("/rpc/qubit_finish_notification_email")){finishes.push(await request.json());body=true;}
    else if(url.pathname===`/auth/v1/admin/users/${buyer}`)body={id:buyer,email:"buyer@example.com",email_confirmed_at:options.unverified?null:"2026-10-23T00:00:00Z",user_metadata:{}};
    else if(url.pathname.endsWith("/store_notifications")){assert.equal(url.searchParams.get("user_id"),`eq.${buyer}`);body=options.deleted?[]:[{id:job.notification_id,read_at:null}];}
    else if(url.pathname.endsWith("/profiles"))body=[{email_reminders:!options.optOut}];
    else if(url.pathname.endsWith("/couples"))body=[{is_connected:!options.disconnected,partner_1_id:buyer,partner_2_id:"55555555-5555-4555-8555-555555555555"}];
    else if(url.pathname.endsWith("/store_orders")){assert.equal(url.searchParams.get("buyer_id"),`eq.${buyer}`);body=[{...order,buyer_id:buyer,status:options.refunded?"refunded":"paid"}];}
    else throw Error("Unexpected email lookup");
    return new Response(JSON.stringify(body),{status:200,headers:{"content-type":"application/json"}});
  }}});return {db,finishes};
}

test("delivery resolves a verified account email, sends the paid receipt, and acknowledges only its claimed lease",async()=>enabled(async()=>{
  const {db,finishes}=fixture();const sent:TransactionalEmail[]=[];
  const result=await deliverNotificationEmails({db,send:async email=>{sent.push(email);}});
  assert.equal(result.sent,1);assert.equal(sent[0].to,"buyer@example.com");assert.ok(sent[0].html.includes("$3.00 USD"));assert.equal(finishes[0].p_outcome,"sent");assert.equal(finishes[0].p_lease_token,job.lease_token);
}));

test("every website notification kind is deliverable, with private response details kept in the signed-in site",async()=>enabled(async()=>{
  const jobs=["template_response","review_request","calendar_request","calendar_response"].map(kind=>({...job,kind,dedupe_key:kind==="review_request"?`review:${order.id}`:kind,href:kind==="review_request"?"/profile?view=reviews":"/profile?view=notifications"}));
  const {db}=fixture({jobs});const sent:TransactionalEmail[]=[];const result=await deliverNotificationEmails({db,send:async email=>{sent.push(email);}});assert.equal(result.sent,4);assert.equal(sent.length,4);assert.ok(sent.some(email=>email.html.includes("Leave a quick review")));
}));

test("failed SMTP is retried; unverified users, deleted activity, stale orders, preferences and disconnected calendars never receive mail",async()=>enabled(async()=>{
  const failed=fixture();const result=await deliverNotificationEmails({db:failed.db,send:async()=>{throw Error("SMTP response containing private values");}});assert.equal(result.deferred,1);assert.deepEqual([failed.finishes[0].p_outcome,failed.finishes[0].p_error],["retry","smtp_failed"]);
  for(const options of [{unverified:true},{deleted:true},{refunded:true},{optOut:true,jobs:[{...job,kind:"template_response"}]},{disconnected:true,jobs:[{...job,kind:"calendar_request",calendar_couple_id:"66666666-6666-4666-8666-666666666666"}]}]){
    const {db,finishes}=fixture(options);let count=0;const output=await deliverNotificationEmails({db,send:async()=>{count++;}});assert.equal(count,0);assert.equal(output.skipped,1);assert.equal(finishes[0].p_outcome,"skipped");
  }
  const optedOut=fixture({optOut:true});assert.equal((await deliverNotificationEmails({db:optedOut.db,send:async()=>{}})).sent,1,"receipts are transactional even when reminders are disabled");
}));

test("delivery endpoint requires the server secret and cannot accept arbitrary recipients",async()=>{
  const previous=process.env.CRON_SECRET,flag=process.env.EMAIL_DELIVERY_ENABLED;process.env.CRON_SECRET="a".repeat(32);process.env.EMAIL_DELIVERY_ENABLED="false";
  try{
    assert.equal((await emailEndpoint(new Request("https://qubitsells.com/api/notifications/email"))).status,401);
    assert.equal((await emailEndpoint(new Request("https://qubitsells.com/api/notifications/email",{headers:{authorization:"Bearer invalid"}}))).status,401);
    const response=await emailEndpoint(new Request("https://qubitsells.com/api/notifications/email?to=attacker@example.com",{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}}));assert.equal(response.status,200);assert.equal((await response.json()).enabled,false);
  }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;if(flag===undefined)delete process.env.EMAIL_DELIVERY_ENABLED;else process.env.EMAIL_DELIVERY_ENABLED=flag;}
});
