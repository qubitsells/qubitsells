import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  couponToolSchema,
  manageCouponSchema,
  requestCouponSchema,
  templateInputSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testlovecoupon";

interface DbCouponRow {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  status: string;
  revision: number;
  requested_at: string | null;
  request_note: string | null;
  accepted_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
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
  const migrations = (await fs.readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    if (migration.includes("security_hardening")) {
      await db.query(
        "insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-COUPPAIR',$2,$3)",
        [pair, creatorId, strangerId]
      );
      await db.query(
        "insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')",
        [solo, pair, creatorId, JSON.stringify({ body: "secret" })]
      );
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("Love Coupon: validation schemas validate bounds and requirements", () => {
  const validCoupon = {
    id: "coupon_t08",
    type: "coupon",
    enabled: true,
    title: "Full Body Massage",
    description: "Valid for one 45-minute soothing massage.",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    enableScheduling: true,
  };

  const parsed = couponToolSchema.safeParse(validCoupon);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.title, "Full Body Massage");
    assert.equal(parsed.data.enableScheduling, true);
  }

  // Reject empty title
  assert.equal(
    couponToolSchema.safeParse({ ...validCoupon, title: "   " }).success,
    false
  );

  // Request schema
  assert.equal(
    requestCouponSchema.safeParse({
      expected_revision: 1,
      request_note: "Tonight please!",
    }).success,
    true
  );

  // Manage schema
  assert.equal(
    manageCouponSchema.safeParse({
      action: "accept",
      expected_revision: 2,
    }).success,
    true
  );
  assert.equal(
    manageCouponSchema.safeParse({
      action: "fulfill",
      expected_revision: 3,
    }).success,
    true
  );
  assert.equal(
    manageCouponSchema.safeParse({
      action: "invalid_action",
      expected_revision: 1,
    }).success,
    false
  );
});

test("Love Coupon: lifecycle, duplicate request prevention, issuer acceptance, and double redemption prevention", async () => {
  // 1. Create template with Love Coupon tool
  const couponConfig = {
    id: "coupon_t08",
    type: "coupon",
    enabled: true,
    title: "Romantic Breakfast in Bed",
    description: "Pancakes, fresh fruit and coffee delivered to bed.",
    enableScheduling: true,
  };

  const createRes = await db.query(
    `SELECT public.bonded_create_template(
      $1::uuid,
      NULL,
      $2,
      $3::jsonb,
      ARRAY[]::uuid[]
    ) as result`,
    [
      creatorId,
      deletionHash,
      JSON.stringify({
        short_code: testCode,
        theme: "anime_female",
        scene_index: 0,
        partner_name: "Jordan",
        partner_from: "Sam",
        message: "A special voucher for my favorite person!",
        has_media: false,
        media_items: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        sender_gender: "female",
        tools: [couponConfig],
      }),
    ]
  );
  assert.ok(createRes.rows[0]);

  // 2. Verify sync trigger created the coupon row with available status
  const getInitial = await db.query(
    `SELECT public.bonded_get_template_coupon($1, $2, $3::uuid) as result`,
    [testCode, deletionHash, creatorId]
  );
  const initialData = (getInitial.rows[0] as { result: { success: boolean; is_creator: boolean; coupon: DbCouponRow } }).result;
  assert.equal(initialData.success, true);
  assert.equal(initialData.is_creator, true);
  assert.equal(initialData.coupon.title, "Romantic Breakfast in Bed");
  assert.equal(initialData.coupon.status, "available");
  assert.equal(initialData.coupon.revision, 1);

  // 3. Recipient requests to use the coupon (revision 1)
  const reqRes = await db.query(
    `SELECT public.bonded_request_template_coupon($1, $2, NULL, $3) as result`,
    [testCode, "Can we do this Sunday morning?", 1]
  );
  const reqData = (reqRes.rows[0] as { result: { success: boolean; status: string; revision: number } }).result;
  assert.equal(reqData.success, true);
  assert.equal(reqData.status, "requested");
  assert.equal(reqData.revision, 2);

  // Critical rule check: requesting must NOT mark it fulfilled!
  const checkStatus = await db.query(
    `SELECT public.bonded_get_template_coupon($1) as result`,
    [testCode]
  );
  const statusAfterReq = (checkStatus.rows[0] as { result: { coupon: DbCouponRow } }).result.coupon.status;
  assert.equal(statusAfterReq, "requested");
  assert.notEqual(statusAfterReq, "fulfilled");

  // 4. Duplicate request prevention on server
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_request_template_coupon($1, $2, NULL, $3)`,
        [testCode, "Requesting again!", 2]
      );
    },
    /already been requested/
  );

  // 5. Double redemption / premature fulfillment prevention:
  // Cannot mark fulfilled directly when status is 'requested'
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_manage_template_coupon($1, 'fulfill', $2, $3::uuid, $4)`,
        [testCode, deletionHash, creatorId, 2]
      );
    },
    /must be accepted before marking fulfilled/
  );

  // 6. Stranger cannot accept or manage the coupon
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_manage_template_coupon($1, 'accept', NULL, $2::uuid, $3)`,
        [testCode, strangerId, 2]
      );
    },
    /Not authorized to manage this coupon/
  );

  // 7. Issuer accepts the request (revision 2 -> 3)
  const acceptRes = await db.query(
    `SELECT public.bonded_manage_template_coupon($1, 'accept', $2, $3::uuid, $4) as result`,
    [testCode, deletionHash, creatorId, 2]
  );
  const acceptData = (acceptRes.rows[0] as { result: { success: boolean; status: string; revision: number } }).result;
  assert.equal(acceptData.success, true);
  assert.equal(acceptData.status, "accepted");
  assert.equal(acceptData.revision, 3);

  // 8. Fulfill the coupon once completed (revision 3 -> 4)
  const fulfillRes = await db.query(
    `SELECT public.bonded_manage_template_coupon($1, 'fulfill', $2, $3::uuid, $4) as result`,
    [testCode, deletionHash, creatorId, 3]
  );
  const fulfillData = (fulfillRes.rows[0] as { result: { success: boolean; status: string; revision: number } }).result;
  assert.equal(fulfillData.success, true);
  assert.equal(fulfillData.status, "fulfilled");
  assert.equal(fulfillData.revision, 4);

  // 9. Prevent double redemption on server
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_manage_template_coupon($1, 'fulfill', $2, $3::uuid, $4)`,
        [testCode, deletionHash, creatorId, 4]
      );
    },
    /already been fulfilled/
  );

  // 10. Cannot cancel an already fulfilled coupon
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_manage_template_coupon($1, 'cancel', $2, $3::uuid, $4, 'Changed mind')`,
        [testCode, deletionHash, creatorId, 4]
      );
    },
    /Cannot cancel a fulfilled coupon/
  );
});

test("Love Coupon: template input schema accepts coupon_t08 in tools", () => {
  const payload = {
    scene_index: 1,
    partner_name: "Morgan",
    partner_from: "Riley",
    sender_gender: "male" as const,
    message: "Here is your gift coupon!",
    has_media: false,
    media_items: [],
    expiry_hours: 72,
    tools: [
      {
        id: "coupon_t08",
        type: "coupon",
        enabled: true,
        title: "1-Hour Back Massage",
        description: "Whenever you feel stressed.",
        enableScheduling: true,
      },
    ],
  };

  const res = templateInputSchema.safeParse(payload);
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.tools.length, 1);
    assert.equal(res.data.tools[0].type, "coupon");
  }
});
