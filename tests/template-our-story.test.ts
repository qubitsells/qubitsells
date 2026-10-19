import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  storyCardSchema,
  ourStoryToolSchema,
  submitPartnerSideSchema,
  templateInputSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testourstory123";

const partnerToken = randomBytes(32).toString("hex");
const partnerTokenHash = createHash("sha256").update(partnerToken).digest("hex");

interface DbStoryRow {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  cards: Array<{ id: string; photo_url: string; caption: string; date?: string; order: number }>;
  partner_contribution?: {
    id: string;
    author_name: string;
    photo_url: string;
    caption: string;
    date?: string;
    created_at: string;
  } | null;
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
        "insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-STORYPAIR',$2,$3)",
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

test("Our Story Memories: validation schemas validate 3 to 5 cards and bounds", () => {
  const card1 = {
    id: "card_1",
    photo_url: "https://example.com/photo1.jpg",
    caption: "The first day we met",
    date: "Day 1",
    order: 0,
  };
  const card2 = {
    id: "card_2",
    photo_url: "https://example.com/photo2.jpg",
    caption: "Our first road trip",
    date: "Summer 2023",
    order: 1,
  };
  const card3 = {
    id: "card_3",
    photo_url: "https://example.com/photo3.jpg",
    caption: "Late night stargazing",
    order: 2,
  };
  const card4 = {
    id: "card_4",
    photo_url: "https://example.com/photo4.jpg",
    caption: "Cooking disaster turned wonderful",
    order: 3,
  };
  const card5 = {
    id: "card_5",
    photo_url: "https://example.com/photo5.jpg",
    caption: "Our anniversary sunset",
    order: 4,
  };
  const card6 = {
    id: "card_6",
    photo_url: "https://example.com/photo6.jpg",
    caption: "One card too many",
    order: 5,
  };

  // Valid 3 cards
  const valid3 = ourStoryToolSchema.safeParse({
    id: "our_story_t10",
    type: "our_story",
    enabled: true,
    title: "Our Story Memories",
    description: "Moments we cherish",
    cards: [card1, card2, card3],
  });
  assert.equal(valid3.success, true);

  // Valid 5 cards
  const valid5 = ourStoryToolSchema.safeParse({
    id: "our_story_t10",
    type: "our_story",
    enabled: true,
    title: "Our Story",
    cards: [card1, card2, card3, card4, card5],
  });
  assert.equal(valid5.success, true);

  // Invalid: < 3 cards (only 2 cards)
  const invalidTooFew = ourStoryToolSchema.safeParse({
    id: "our_story_t10",
    type: "our_story",
    enabled: true,
    title: "Our Story",
    cards: [card1, card2],
  });
  assert.equal(invalidTooFew.success, false);

  // Invalid: > 5 cards (6 cards)
  const invalidTooMany = ourStoryToolSchema.safeParse({
    id: "our_story_t10",
    type: "our_story",
    enabled: true,
    title: "Our Story",
    cards: [card1, card2, card3, card4, card5, card6],
  });
  assert.equal(invalidTooMany.success, false);

  // Invalid card missing photo_url
  const invalidCard = storyCardSchema.safeParse({
    id: "card_x",
    photo_url: "",
    caption: "Missing photo",
    order: 0,
  });
  assert.equal(invalidCard.success, false);

  // Partner side submission validation
  const validPartnerSide = submitPartnerSideSchema.safeParse({
    author_name: "Rowan",
    caption: "My side of our story: you make every day bright.",
    photo_url: "https://example.com/partner_photo.jpg",
    date: "October 2024",
  });
  assert.equal(validPartnerSide.success, true);

  // Partner side submission missing photo
  const invalidPartnerSideNoPhoto = submitPartnerSideSchema.safeParse({
    caption: "No photo provided",
    photo_url: "",
  });
  assert.equal(invalidPartnerSideNoPhoto.success, false);
});

test("Our Story Memories: template input schema accepts our_story_t10 in tools", () => {
  const cards = [
    {
      id: "card_1",
      photo_url: "https://example.com/1.jpg",
      caption: "Chapter 1",
      order: 0,
    },
    {
      id: "card_2",
      photo_url: "https://example.com/2.jpg",
      caption: "Chapter 2",
      order: 1,
    },
    {
      id: "card_3",
      photo_url: "https://example.com/3.jpg",
      caption: "Chapter 3",
      order: 2,
    },
  ];

  const payload = {
    scene_index: 0,
    partner_name: "Rowan",
    partner_from: "Charlie",
    message: "Our entire journey together!",
    sender_gender: "male" as const,
    has_media: false,
    media_items: [],
    expiry_hours: 72,
    tools: [
      {
        id: "our_story_t10",
        type: "our_story",
        enabled: true,
        title: "Our Story Memories",
        description: "From day one to forever",
        cards,
      },
    ],
  };

  const parsed = templateInputSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("Our Story Memories: lifecycle, separate authorship, partner contribution, and deletion", async () => {
  const storyConfig = {
    id: "our_story_t10",
    type: "our_story",
    enabled: true,
    title: "Our Story Memories",
    description: "Moments of us",
    cards: [
      {
        id: "c1",
        photo_url: "https://example.com/c1.jpg",
        caption: "Where it all began",
        date: "June 2022",
        order: 0,
      },
      {
        id: "c2",
        photo_url: "https://example.com/c2.jpg",
        caption: "Our first road trip",
        date: "September 2022",
        order: 1,
      },
      {
        id: "c3",
        photo_url: "https://example.com/c3.jpg",
        caption: "Under the stars",
        date: "August 2023",
        order: 2,
      },
    ],
  };

  // 1. Create template with Our Story Memories tool
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
        theme: "anime_male",
        scene_index: 0,
        partner_name: "Rowan",
        partner_from: "Charlie",
        message: "Here is our story!",
        has_media: false,
        media_items: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        sender_gender: "male",
        tools: [storyConfig],
      }),
    ]
  );
  assert.ok(createRes.rows[0]);

  // 2. Verify sync trigger created template_our_story row
  const getInitial = await db.query(
    `SELECT public.bonded_get_template_our_story($1, $2, NULL, $3::uuid) as result`,
    [testCode, deletionHash, creatorId]
  );
  const initialData = (getInitial.rows[0] as { result: { success: boolean; is_creator: boolean; story: DbStoryRow } }).result;
  assert.equal(initialData.success, true);
  assert.equal(initialData.is_creator, true);
  assert.equal(initialData.story.cards.length, 3);
  assert.equal(initialData.story.partner_contribution, null);

  // 3. Creator cannot submit as partner (must fail closed)
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_submit_our_story_partner_side(
          $1, $2, $3, $4, $5, NULL, $6, $7::uuid, NULL
        )`,
        [
          testCode,
          "Fake Partner",
          "This should fail",
          "https://example.com/fake.jpg",
          "2024",
          partnerTokenHash,
          creatorId,
        ]
      );
    },
    /Creators cannot submit partner side/
  );

  // 4. Partner contributes "Add your side"
  const partnerContribRes = await db.query(
    `SELECT public.bonded_submit_our_story_partner_side(
      $1, $2, $3, $4, $5, NULL, $6, NULL, 'guest_partner_token'
    ) as result`,
    [
      testCode,
      "Rowan",
      "And here is my favorite memory with you!",
      "https://example.com/rowan_favorite.jpg",
      "October 2024",
      partnerTokenHash,
    ]
  );
  const contribData = (partnerContribRes.rows[0] as { result: { success: boolean; partner_contribution: { id: string; author_name: string; caption: string; photo_url: string; date: string } } }).result;
  assert.equal(contribData.success, true);
  assert.equal(contribData.partner_contribution.author_name, "Rowan");
  assert.equal(contribData.partner_contribution.caption, "And here is my favorite memory with you!");
  assert.equal(contribData.partner_contribution.photo_url, "https://example.com/rowan_favorite.jpg");

  // 5. Query story as partner: verifies is_partner = true and sanitized contribution
  const getPartnerView = await db.query(
    `SELECT public.bonded_get_template_our_story($1, NULL, $2, NULL) as result`,
    [testCode, partnerTokenHash]
  );
  const partnerViewData = (getPartnerView.rows[0] as { result: { success: boolean; is_creator: boolean; is_partner: boolean; story: DbStoryRow } }).result;
  assert.equal(partnerViewData.success, true);
  assert.equal(partnerViewData.is_creator, false);
  assert.equal(partnerViewData.is_partner, true);
  assert.ok(partnerViewData.story.partner_contribution);
  assert.equal(partnerViewData.story.partner_contribution?.author_name, "Rowan");

  // 6. Stranger without tokens cannot delete partner contribution
  await assert.rejects(
    async () => {
      await db.query(
        `SELECT public.bonded_delete_our_story_partner_side($1, NULL, NULL, $2::uuid)`,
        [testCode, strangerId]
      );
    },
    /Not authorized to delete this contribution/
  );

  // 7. Partner can delete their own contribution
  const deleteRes = await db.query(
    `SELECT public.bonded_delete_our_story_partner_side($1, $2, NULL, NULL) as result`,
    [testCode, partnerTokenHash]
  );
  const deleteData = (deleteRes.rows[0] as { result: { success: boolean } }).result;
  assert.equal(deleteData.success, true);

  // 8. Confirm partner contribution is now null
  const getAfterDelete = await db.query(
    `SELECT public.bonded_get_template_our_story($1) as result`,
    [testCode]
  );
  const afterDeleteData = (getAfterDelete.rows[0] as { result: { success: boolean; story: DbStoryRow } }).result;
  assert.equal(afterDeleteData.story.partner_contribution, null);
});
