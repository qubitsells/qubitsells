import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  bucketListItemSchema,
  bucketListToolSchema,
  mutateBucketListSchema,
  templateInputSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testbucketlist123";

const partnerToken = randomBytes(32).toString("hex");
const partnerTokenHash = createHash("sha256").update(partnerToken).digest("hex");

interface DbBucketRow {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  items: Array<{
    id: string;
    title: string;
    note?: string | null;
    status: "wished" | "planning" | "completed";
    created_by: "creator" | "partner";
    creator_interested?: boolean;
    partner_interested?: boolean;
    planning_started_at?: string | null;
    completed_at?: string | null;
    memory_photo_url?: string | null;
    memory_note?: string | null;
  }>;
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
        "insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-BUCKETPAIR',$2,$3)",
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

test("Mini Couple Bucket List: validation schemas validate 1 to 5 initial ideas and actions", () => {
  const item1 = {
    id: "item_1",
    title: "Stargazing in the mountains",
    note: "Bring thick blankets",
    status: "wished" as const,
    created_by: "creator" as const,
  };
  const item2 = {
    id: "item_2",
    title: "Cooking pasta together",
    status: "wished" as const,
    created_by: "creator" as const,
  };
  const item3 = {
    id: "item_3",
    title: "Pottery workshop",
    status: "wished" as const,
    created_by: "creator" as const,
  };
  const item4 = {
    id: "item_4",
    title: "Weekend road trip",
    status: "wished" as const,
    created_by: "creator" as const,
  };
  const item5 = {
    id: "item_5",
    title: "Visit botanical gardens",
    status: "wished" as const,
    created_by: "creator" as const,
  };
  const item6 = {
    id: "item_6",
    title: "One idea too many for initial set",
    status: "wished" as const,
    created_by: "creator" as const,
  };

  // Valid 1 to 5 items
  const valid1 = bucketListToolSchema.safeParse({
    id: "bucket_list_t11",
    type: "bucket_list",
    enabled: true,
    title: "Our Bucket List",
    items: [item1],
  });
  assert.equal(valid1.success, true);

  const valid5 = bucketListToolSchema.safeParse({
    id: "bucket_list_t11",
    type: "bucket_list",
    enabled: true,
    title: "Our Bucket List",
    items: [item1, item2, item3, item4, item5],
  });
  assert.equal(valid5.success, true);

  // Invalid: 0 items
  const invalid0 = bucketListToolSchema.safeParse({
    id: "bucket_list_t11",
    type: "bucket_list",
    enabled: true,
    title: "Our Bucket List",
    items: [],
  });
  assert.equal(invalid0.success, false);

  // Invalid: > 5 initial items
  const invalid6 = bucketListToolSchema.safeParse({
    id: "bucket_list_t11",
    type: "bucket_list",
    enabled: true,
    title: "Our Bucket List",
    items: [item1, item2, item3, item4, item5, item6],
  });
  assert.equal(invalid6.success, false);

  // Validate item schema
  const invalidItem = bucketListItemSchema.safeParse({
    id: "item_x",
    title: "", // empty title
  });
  assert.equal(invalidItem.success, false);

  // Mutation schema validation
  const validAdd = mutateBucketListSchema.safeParse({
    action: "add_item",
    payload: { title: "Hot air balloon ride", note: "At sunrise" },
  });
  assert.equal(validAdd.success, true);

  const validPlan = mutateBucketListSchema.safeParse({
    action: "plan_item",
    item_id: "item_1",
  });
  assert.equal(validPlan.success, true);

  const validComplete = mutateBucketListSchema.safeParse({
    action: "complete_item",
    item_id: "item_1",
  });
  assert.equal(validComplete.success, true);
});

test("Mini Couple Bucket List: template input schema accepts bucket_list_t11 in tools", () => {
  const payload = {
    scene_index: 0,
    partner_name: "Rowan",
    partner_from: "Charlie",
    message: "Let's dream and do all these things together!",
    sender_gender: "female" as const,
    has_media: false,
    media_items: [],
    expiry_hours: 168,
    tools: [
      {
        id: "bucket_list_t11",
        type: "bucket_list",
        enabled: true,
        title: "Mini Couple Bucket List",
        items: [
          {
            id: "i1",
            title: "Visit Paris in autumn",
            status: "wished",
            created_by: "creator",
          },
        ],
      },
    ],
  };

  const parsed = templateInputSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("Mini Couple Bucket List: lifecycle, partner adding, interest marking, plan draft, completion, and memory capture", async () => {
  const initialItems = [
    {
      id: "item_star",
      title: "Late night stargazing",
      note: "Drive out to the hills",
      status: "wished",
      created_by: "creator",
    },
    {
      id: "item_pasta",
      title: "Homemade pasta night",
      note: "From scratch with fresh basil",
      status: "wished",
      created_by: "creator",
    },
  ];

  // 1. Create template with bucket list tool
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
        partner_name: "Rowan",
        partner_from: "Charlie",
        message: "Our adventures await!",
        has_media: false,
        media_items: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        sender_gender: "female",
        tools: [
          {
            id: "bucket_list_t11",
            type: "bucket_list",
            enabled: true,
            title: "Mini Couple Bucket List",
            description: "Adventures for the two of us",
            items: initialItems,
          },
        ],
      }),
    ]
  );
  assert.ok(createRes.rows[0]);

  // 2. Verify sync trigger created record
  const getInitial = await db.query(
    `SELECT public.bonded_get_template_bucket_list($1, $2, NULL, $3::uuid) as result`,
    [testCode, deletionHash, creatorId]
  );
  const initialData = (getInitial.rows[0] as { result: { success: boolean; is_creator: boolean; bucket_list: DbBucketRow } }).result;
  assert.equal(initialData.success, true);
  assert.equal(initialData.is_creator, true);
  assert.equal(initialData.bucket_list.items.length, 2);
  assert.equal(initialData.bucket_list.items[0].status, "wished");

  // 3. Partner adds an idea
  const addRes = await db.query(
    `SELECT public.bonded_mutate_template_bucket_list(
      $1, 'add_item', NULL, $2::jsonb, $3, NULL, NULL, 'guest_partner'
    ) as result`,
    [
      testCode,
      JSON.stringify({ title: "Kayaking on the lake", note: "Rent tandem kayak" }),
      partnerTokenHash,
    ]
  );
  const addData = (addRes.rows[0] as { result: { success: boolean; items: DbBucketRow["items"] } }).result;
  assert.equal(addData.success, true);
  assert.equal(addData.items.length, 3);
  const addedItem = addData.items.find((i) => i.title === "Kayaking on the lake");
  assert.ok(addedItem);
  assert.equal(addedItem.created_by, "partner");
  assert.equal(addedItem.partner_interested, true);

  // 4. Partner marks interest in "item_star"
  const interestRes = await db.query(
    `SELECT public.bonded_mutate_template_bucket_list(
      $1, 'toggle_interest', 'item_star', '{}'::jsonb, $2, NULL, NULL, 'guest_partner'
    ) as result`,
    [testCode, partnerTokenHash]
  );
  const interestData = (interestRes.rows[0] as { result: { success: boolean; items: DbBucketRow["items"] } }).result;
  assert.equal(interestData.success, true);
  const itemStar = interestData.items.find((i) => i.id === "item_star");
  assert.equal(itemStar?.partner_interested, true);

  // 5. Select "Let's plan this" -> transitions to "planning", does NOT confirm event
  const planRes = await db.query(
    `SELECT public.bonded_mutate_template_bucket_list(
      $1, 'plan_item', 'item_pasta', '{}'::jsonb, $2, NULL, NULL, 'guest_partner'
    ) as result`,
    [testCode, partnerTokenHash]
  );
  const planData = (planRes.rows[0] as { result: { success: boolean; items: DbBucketRow["items"] } }).result;
  assert.equal(planData.success, true);
  const itemPasta = planData.items.find((i) => i.id === "item_pasta");
  assert.equal(itemPasta?.status, "planning");
  assert.ok(itemPasta?.planning_started_at);
  assert.ok(!itemPasta?.completed_at);

  // 6. Explicit completion action -> transitions to "completed"
  const completeRes = await db.query(
    `SELECT public.bonded_mutate_template_bucket_list(
      $1, 'complete_item', 'item_pasta', '{}'::jsonb, $2, NULL, NULL, 'guest_partner'
    ) as result`,
    [testCode, partnerTokenHash]
  );
  const completeData = (completeRes.rows[0] as { result: { success: boolean; items: DbBucketRow["items"] } }).result;
  assert.equal(completeData.success, true);
  const completedPasta = completeData.items.find((i) => i.id === "item_pasta");
  assert.equal(completedPasta?.status, "completed");
  assert.ok(completedPasta?.completed_at);

  // 7. Offer memory capture afterward -> attach memory photo & note
  const memoryRes = await db.query(
    `SELECT public.bonded_mutate_template_bucket_list(
      $1, 'attach_memory', 'item_pasta', $2::jsonb, $3, NULL, NULL, 'guest_partner'
    ) as result`,
    [
      testCode,
      JSON.stringify({
        memory_photo_url: "https://example.com/pasta_photo.jpg",
        memory_note: "Flour was everywhere but it tasted amazing!",
      }),
      partnerTokenHash,
    ]
  );
  const memoryData = (memoryRes.rows[0] as { result: { success: boolean; items: DbBucketRow["items"] } }).result;
  assert.equal(memoryData.success, true);
  const memoriedPasta = memoryData.items.find((i) => i.id === "item_pasta");
  assert.equal(memoriedPasta?.memory_photo_url, "https://example.com/pasta_photo.jpg");
  assert.equal(memoriedPasta?.memory_note, "Flour was everywhere but it tasted amazing!");

  // 8. Unauthorized stranger without tokens cannot mutate bucket list
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_mutate_template_bucket_list(
          $1, 'complete_item', 'item_star', '{}'::jsonb, NULL, NULL, NULL, NULL
        )`,
        [testCode]
      );
    },
    /Not authorized to modify bucket list/
  );
});
