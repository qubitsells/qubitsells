import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PRODUCTS } from "../lib/storefront";
import type { TemplateInvitation } from "../lib/supabase/coupleTemplates";
import { invitationCalendar, invitationDate, invitationLocalInstant } from "../lib/invitation";
import {
  invitationSlotSchema,
  invitationToolSchema,
  manageInvitationSchema,
  respondInvitationSchema,
  templateInputSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testinvitation12";

interface DbInvitationRow {
  activity: string;
  status: string;
  revision: number;
  agreed_revision?: number | null;
  recipient_response?: string | null;
  recipient_note?: string | null;
  selected_slot?: { id: string; start_time: string; label?: string } | null;
}

before(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE PUBLICATION supabase_realtime;
  `);
  await db.query("insert into auth.users(id) values($1),($2)", [creatorId, strangerId]);
  await db.exec(await fs.readFile("supabase/bootstrap.sql", "utf8"));
  const migrations = (await fs.readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    if (migration.includes("security_hardening")) {
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-INVITEPAIR',$2,$3)", [pair, creatorId, strangerId]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')", [solo, pair, creatorId, JSON.stringify({ body: "secret" })]);
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("invitationToolSchema and templateInputSchema accept T02/T03 configuration", () => {
  const toolConfig = {
    id: "invitation_t02",
    type: "invitation",
    enabled: true,
    activity: "Candlelight Dinner & Rooftop Stargazing",
    invitationMessage: "Will you go on a date with me?",
    format: "in_person",
    location: "Skyline Lounge",
    reservationUrl: "https://example.com/reservation-info",
    senderPrivateNotes: "Flowers hidden in car trunk!",
    dateMode: "slots",
    durationMinutes: 120,
    senderTimezone: "America/New_York",
    proposedSlots: [
      { id: "slot_1", start_time: "2026-10-24T19:00:00Z", label: "Saturday Evening" },
      { id: "slot_2", start_time: "2026-10-25T18:00:00Z", label: "Sunday Sunset" },
    ],
    allowCounterproposal: true,
  };

  const parsedTool = invitationToolSchema.safeParse(toolConfig);
  assert.equal(parsedTool.success, true);

  const templateInput = {
    scene_index: 1,
    partner_name: "Juliet",
    partner_from: "Romeo",
    message: "A thousands times good night...",
    has_media: false,
    media_items: [],
    expiry_hours: 72,
    tools: [toolConfig],
  };

  const parsedTemplate = templateInputSchema.safeParse(templateInput);
  assert.equal(parsedTemplate.success, true);
});

test("respondInvitationSchema validates required slot for acceptance and counterproposal", () => {
  // Accepted without slot fails
  const noSlotAccept = respondInvitationSchema.safeParse({
    expected_revision: 1,
    response_type: "accepted",
  });
  assert.equal(noSlotAccept.success, false);

  // Accepted with chosen slot succeeds
  const validAccept = respondInvitationSchema.safeParse({
    expected_revision: 1,
    response_type: "accepted",
    chosen_slot: { id: "slot_1", start_time: "2026-10-24T19:00:00Z", label: "Saturday" },
  });
  assert.equal(validAccept.success, true);

  // Counterproposal without suggested slot fails
  const noSlotCounter = respondInvitationSchema.safeParse({
    expected_revision: 1,
    response_type: "counterproposed",
  });
  assert.equal(noSlotCounter.success, false);

  // Counterproposal with suggested slot succeeds
  const validCounter = respondInvitationSchema.safeParse({
    expected_revision: 1,
    response_type: "counterproposed",
    suggested_slot: { id: "counter_1", start_time: "2026-10-26T20:00:00Z", label: "Monday evening" },
  });
  assert.equal(validCounter.success, true);

  // Decline requires no slot
  const validDecline = respondInvitationSchema.safeParse({
    expected_revision: 1,
    response_type: "declined",
    partner_note_text: "Can't make it this week, sorry!",
  });
  assert.equal(validDecline.success, true);
});

test("RSVP validation requires actual dates, a valid zone, and at least one checked availability option", () => {
  assert.equal(invitationSlotSchema.safeParse({ id: "one", start_time: "Friday evening" }).success, false);
  assert.equal(invitationSlotSchema.safeParse({ id: "one", start_time: "2026-02-30" }).success, false);
  assert.equal(respondInvitationSchema.safeParse({ expected_revision: 1, response_type: "availability", available_slot_ids: [] }).success, false);
  assert.equal(respondInvitationSchema.safeParse({ expected_revision: 1, response_type: "availability", available_slot_ids: ["one", "two"], activity_choices: ["Dinner", "A walk"], alternative_idea: "A picnic", partner_tz: "Asia/Karachi" }).success, true);
  assert.equal(respondInvitationSchema.safeParse({ expected_revision: 1, response_type: "declined", partner_tz: "invalid-zone" }).success, false);
  assert.equal(manageInvitationSchema.safeParse({ action_type: "confirm_slot", selected_slot_id: "one" }).success, false);
});

test("suggested times follow the displayed zone and calendar exports preserve dates without exposing private notes", () => {
  assert.equal(invitationLocalInstant("2026-11-05T20:00", "Asia/Karachi"), "2026-11-05T15:00:00.000Z");
  assert.equal(invitationLocalInstant("2026-07-05T20:00", "America/New_York"), "2026-07-06T00:00:00.000Z");
  assert.throws(() => invitationLocalInstant("2026-03-08T02:30", "America/New_York"), /clock change/);
  assert.throws(() => invitationLocalInstant("2026-02-30T19:00", "UTC"), /valid date/);
  assert.equal(invitationDate("2026-11-05T00:00:00Z", "America/Los_Angeles", true), "Thu, Nov 5, 2026");
  const invitation = { id: "fixture", date_mode: "date_only", activity: "Dinner\nBEGIN:VEVENT", duration_minutes: 120, invitation_message: "Join me", sender_private_notes: "PRIVATE SURPRISE", recipient_note: "See you there", format: "in_person" } as TemplateInvitation;
  const calendar = invitationCalendar(invitation, { id: "one", start_time: "2026-11-05" });
  assert.ok(calendar.includes("DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106"));
  assert.ok(calendar.includes("UID:qubitsells-fixture@qubitsells.com"));
  assert.equal(calendar.match(/\r\nBEGIN:VEVENT/g)?.length, 1);
  assert.ok(!calendar.includes("PRIVATE SURPRISE"));
  assert.throws(() => invitationCalendar(invitation, { id: "legacy", start_time: "Friday evening" }), /exact date/);
});

test("T02/T03 invitation lifecycle: private notes, sender confirmation, counterproposal and rescheduling", async () => {
  const proposedSlots = [
    { id: "slot_1", start_time: "2026-10-24T19:00:00Z", label: "Option 1" },
    { id: "slot_2", start_time: "2026-10-25T18:00:00Z", label: "Option 2" },
  ];

  // 1. Insert couple_template with invitation_t02 tool
  await db.query(`
    INSERT INTO public.couple_templates (
      owner_id, short_code, theme, scene_index, partner_name, partner_from,
      message, has_media, media_items, expires_at, deletion_hash, tools
    ) VALUES (
      $1, $2, 'anime', 0, 'Juliet', 'Romeo', 'I love you', false, '[]'::jsonb,
      now() + interval '7 days', $3,
      $4::jsonb
    )
  `, [
    creatorId,
    testCode,
    deletionHash,
    JSON.stringify([
      {
        id: "invitation_t02",
        type: "invitation",
        activity: "Rooftop Stargazing",
        invitationMessage: "Will you go on a date with me?",
        format: "in_person",
        location: "Grand Observatory",
        reservationUrl: "https://observatory.example.com/tickets",
        senderPrivateNotes: "Surprise gift in jacket pocket!",
        dateMode: "slots",
        durationMinutes: 120,
        senderTimezone: "America/New_York",
        proposedSlots,
        allowCounterproposal: true,
      },
    ]),
  ]);

  // 2. Verify trigger automatically synced template_invitations
  const invRes = await db.query<DbInvitationRow>(
    "SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'"
  );
  assert.equal(invRes.rows.length, 1);
  const row = invRes.rows[0];
  assert.equal(row.activity, "Rooftop Stargazing");
  assert.equal(row.status, "proposed");
  assert.equal(row.revision, 1);

  // 3. Verify secrecy: partner/stranger calling bonded_get_template_invitation DOES NOT receive sender_private_notes
  const strangerGet = await db.query<{ res: { success: boolean; is_creator: boolean; invitation: { sender_private_notes: string | null } } }>(
    "SELECT public.bonded_get_template_invitation($1, NULL, NULL) as res",
    [testCode]
  );
  const strangerPayload = strangerGet.rows[0].res;
  assert.equal(strangerPayload.success, true);
  assert.equal(strangerPayload.is_creator, false);
  assert.equal(strangerPayload.invitation.sender_private_notes, null); // Stripped!

  // Creator calling with manage_token_hash receives private notes
  const creatorGet = await db.query<{ res: { success: boolean; is_creator: boolean; invitation: { sender_private_notes: string | null } } }>(
    "SELECT public.bonded_get_template_invitation($1, $2, NULL) as res",
    [testCode, deletionHash]
  );
  const creatorPayload = creatorGet.rows[0].res;
  assert.equal(creatorPayload.success, true);
  assert.equal(creatorPayload.is_creator, true);
  assert.equal(creatorPayload.invitation.sender_private_notes, "Surprise gift in jacket pocket!");

  // 4. Stale check: Partner responding with invalid/stale revision is rejected
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_respond_template_invitation(
          $1, 999, 'accepted', $2::jsonb, NULL, 'America/Chicago', 'Yes!'
        )
      `, [testCode, JSON.stringify(proposedSlots[0])]);
    },
    /Stale invitation revision/
  );

  // 5. Selecting unoffered slot is rejected
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_respond_template_invitation(
          $1, 1, 'accepted', $2::jsonb, NULL, 'America/Chicago', 'Yes!'
        )
      `, [testCode, JSON.stringify({ id: "unoffered_slot", start_time: "2026-12-01T00:00:00Z" })]);
    },
    /Selected slot was not offered by sender/
  );

  // 6. Legacy single-date responses also require the sender's confirmation.
  const acceptRes = await db.query<{ res: { success: boolean; status: string; revision: number } }>(`
    SELECT public.bonded_respond_template_invitation(
      $1, 1, 'accepted', $2::jsonb, NULL, 'America/Chicago', 'I would love to!'
    ) as res
  `, [testCode, JSON.stringify(proposedSlots[0])]);
  const acceptData = acceptRes.rows[0].res;
  assert.equal(acceptData.success, true);
  assert.equal(acceptData.status, "awaiting_confirmation");
  assert.equal(acceptData.revision, 2);

  await db.query(`SELECT public.bonded_manage_template_invitation($1,'confirm_slot',$2,NULL,NULL,NULL,'slot_1',2)`, [testCode, deletionHash]);

  // Verify DB state
  const confirmedDb = await db.query<DbInvitationRow>("SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'");
  assert.equal(confirmedDb.rows[0].status, "confirmed");
  assert.equal(confirmedDb.rows[0].agreed_revision, 3);
  assert.equal(confirmedDb.rows[0].recipient_response, "accepted");
  assert.equal(confirmedDb.rows[0].recipient_note, "I would love to!");

  // 7. Creator reschedules date with new slots -> Invalidates earlier acceptance, resets to proposed, increments revision
  const newSlots = [
    { id: "slot_3", start_time: "2026-11-01T19:00:00Z", label: "November 1st" },
    { id: "slot_4", start_time: "2026-11-02T19:00:00Z", label: "November 2nd" },
  ];
  const rescheduleRes = await db.query<{ res: { success: boolean } }>(`
    SELECT public.bonded_manage_template_invitation(
      $1, 'reschedule', $2, NULL, $3::jsonb, NULL
    ) as res
  `, [testCode, deletionHash, JSON.stringify(newSlots)]);
  assert.equal(rescheduleRes.rows[0].res.success, true);

  const rescheduledDb = await db.query<DbInvitationRow>("SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'");
  assert.equal(rescheduledDb.rows[0].status, "proposed");
  assert.equal(rescheduledDb.rows[0].revision, 4);
  assert.equal(rescheduledDb.rows[0].agreed_revision, null); // Earlier acceptance invalidated!
  assert.equal(rescheduledDb.rows[0].selected_slot, null);

  // 8. Partner suggests another time (Counterproposal)
  const counterSlot = { id: "counter_custom", start_time: "2026-11-05T20:00:00Z", label: "Thursday 8 PM" };
  const counterRes = await db.query<{ res: { success: boolean; status: string; revision: number } }>(`
    SELECT public.bonded_respond_template_invitation(
      $1, 4, 'counterproposed', NULL, $2::jsonb, 'America/New_York', 'How about Thursday evening instead?'
    ) as res
  `, [testCode, JSON.stringify(counterSlot)]);
  assert.equal(counterRes.rows[0].res.success, true);
  assert.equal(counterRes.rows[0].res.status, "counterproposed");

  // A counterproposal also waits for creator approval.
  const counterDb = await db.query<DbInvitationRow>("SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'");
  assert.equal(counterDb.rows[0].status, "counterproposed");
  assert.equal(counterDb.rows[0].revision, 5);
  assert.equal(counterDb.rows[0].agreed_revision, null);
  assert.equal(counterDb.rows[0].selected_slot, null);

  // 9. Creator accepts partner's counterproposal -> Confirmed!
  const creatorAcceptRes = await db.query<{ res: { success: boolean } }>(`
    SELECT public.bonded_manage_template_invitation(
      $1, 'accept_counterproposal', $2, NULL, NULL, NULL
    ) as res
  `, [testCode, deletionHash]);
  assert.equal(creatorAcceptRes.rows[0].res.success, true);

  const finalConfirmedDb = await db.query<DbInvitationRow>("SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'");
  assert.equal(finalConfirmedDb.rows[0].status, "confirmed");
  assert.equal(finalConfirmedDb.rows[0].agreed_revision, 6);
  assert.equal(finalConfirmedDb.rows[0].selected_slot?.id, "counter_custom");

  // 10. Partner declines politely -> Status is declined, no event created
  const declineRes = await db.query<{ res: { success: boolean; status: string } }>(`
    SELECT public.bonded_respond_template_invitation(
      $1, 6, 'declined', NULL, NULL, NULL, 'Something came up'
    ) as res
  `, [testCode]);
  assert.equal(declineRes.rows[0].res.status, "declined");

  const declinedDb = await db.query<DbInvitationRow>("SELECT * FROM public.template_invitations WHERE tool_id = 'invitation_t02'");
  assert.equal(declinedDb.rows[0].status, "declined");
  assert.equal(declinedDb.rows[0].agreed_revision, null);
  assert.equal(declinedDb.rows[0].selected_slot, null);
});

test("all six template themes save multiple available dates and every reply detail, then only the creator confirms one", async () => {
  for (const [index, product] of PRODUCTS.entries()) {
    const code = `rsvptest${index}fixture`;
    const slots = [1, 2, 3].map(day => ({ id: `day-${day}`, start_time: `2027-11-0${day}T15:00:00Z`, label: `Option ${day}` }));
    const tool = { id: "invitation_t02", type: "invitation", enabled: true, activity: product.name, invitationMessage: "Join me?", format: "in_person", dateMode: "slots", durationMinutes: 120, senderTimezone: "Asia/Karachi", proposedSlots: slots, allowCounterproposal: true, senderPrivateNotes: "PRIVATE SURPRISE" };
    await db.query(`INSERT INTO public.couple_templates(owner_id,short_code,theme,scene_index,partner_name,partner_from,message,has_media,media_items,expires_at,deletion_hash,tools) VALUES ($1,$2,$3,0,'Sam','Alex','For you',false,'[]',now()+interval '7 days',$4,$5::jsonb)`, [creatorId, code, product.slug, deletionHash, JSON.stringify([tool])]);
    const saved = await db.query<{ value: { status: string; revision: number; invitation: TemplateInvitation } }>(`SELECT public.bonded_respond_template_invitation($1,1,'availability',NULL,NULL,'Asia/Karachi','After work please',ARRAY['Dinner','A walk'],'Maybe a picnic',ARRAY['day-1','day-3']) AS value`, [code]);
    const value = saved.rows[0].value;
    assert.equal(value.status, "awaiting_confirmation", product.slug);
    assert.equal(value.invitation.selected_slot, null);
    assert.equal(value.invitation.recipient_note, "After work please");
    assert.deepEqual(value.invitation.recipient_activities, ["Dinner", "A walk"]);
    assert.equal(value.invitation.recipient_idea, "Maybe a picnic");
    assert.deepEqual(value.invitation.available_slots?.map(slot => slot.id), ["day-1", "day-3"]);
    assert.equal(value.invitation.recipient_timezone, "Asia/Karachi");
    assert.ok(!JSON.stringify(value).includes("PRIVATE SURPRISE"));
    await assert.rejects(db.query(`SELECT public.bonded_respond_template_invitation($1,1,'availability',NULL,NULL,NULL,NULL,'{}',NULL,ARRAY['day-1'])`, [code]), /Stale invitation revision/);
    await assert.rejects(db.query(`SELECT public.bonded_manage_template_invitation($1,'confirm_slot',NULL,$2,NULL,NULL,'day-1',2)`, [code, strangerId]), /Not authorized/);
    await assert.rejects(db.query(`SELECT public.bonded_manage_template_invitation($1,'confirm_slot',NULL,$2,NULL,NULL,'day-2',2)`, [code, creatorId]), /receiver marked available/);
    const confirmed = await db.query<{ value: { invitation: TemplateInvitation } }>(`SELECT public.bonded_manage_template_invitation($1,'confirm_slot',NULL,$2,NULL,NULL,'day-3',2) AS value`, [code, creatorId]);
    assert.equal(confirmed.rows[0].value.invitation.status, "confirmed");
    assert.deepEqual(confirmed.rows[0].value.invitation.selected_slot, slots[2]);
    // A date with a legitimate ID cannot replace the sender's canonical date/label.
    const forged = await db.query<{ value: { invitation: TemplateInvitation } }>(`SELECT public.bonded_respond_template_invitation($1,3,'accepted',$2::jsonb) AS value`, [code, JSON.stringify({ id: "day-1", start_time: "2099-01-01", label: "Forged label" })]);
    assert.equal(forged.rows[0].value.invitation.selected_slot, null);
    assert.equal(forged.rows[0].value.invitation.status, "awaiting_confirmation");
    assert.deepEqual(forged.rows[0].value.invitation.available_slots, [slots[0]]);
    await db.query(`SELECT public.bonded_manage_template_invitation($1,'cancel',NULL,$2)`, [code, creatorId]);
    await assert.rejects(db.query(`SELECT public.bonded_respond_template_invitation($1,5,'availability',NULL,NULL,NULL,NULL,'{}',NULL,ARRAY['day-1'])`, [code]), /cancelled/);
  }
});

test("RSVP functions remain service-only invokers and expired gifts cannot receive responses", async () => {
  const functions = await db.query<{ proname: string; prosecdef: boolean; anon_access: boolean; user_access: boolean; server_access: boolean }>(`SELECT proname,prosecdef,has_function_privilege('anon',oid,'EXECUTE') AS anon_access,has_function_privilege('authenticated',oid,'EXECUTE') AS user_access,has_function_privilege('service_role',oid,'EXECUTE') AS server_access FROM pg_proc WHERE proname IN ('bonded_get_template_invitation','bonded_respond_template_invitation','bonded_manage_template_invitation')`);
  assert.equal(functions.rows.length, 3, "no old overloaded functions remain callable");
  for (const entry of functions.rows) {
    assert.equal(entry.prosecdef, false, entry.proname);
    assert.equal(entry.anon_access, false, entry.proname);
    assert.equal(entry.user_access, false, entry.proname);
    assert.equal(entry.server_access, true, entry.proname);
  }
  await db.query(`UPDATE public.couple_templates SET expires_at=now()-interval '1 second' WHERE short_code=$1`, [testCode]);
  await assert.rejects(db.query(`SELECT public.bonded_respond_template_invitation($1,7,'decide_later')`, [testCode]), /unavailable or has expired/);
});
