import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scratchRevealToolSchema,
  templateInputSchema,
} from "../lib/security/validation";

test("Scratch reveal: validates valid message type configuration", () => {
  const input = {
    id: "scratch_t07",
    type: "scratch_reveal",
    enabled: true,
    coverTitle: "A special secret for you",
    coverInstruction: "Scratch with your finger or mouse to reveal",
    contentType: "message",
    hiddenMessage: "I love you more than words can say!",
  };

  const parsed = scratchRevealToolSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.id, "scratch_t07");
    assert.equal(parsed.data.type, "scratch_reveal");
    assert.equal(parsed.data.contentType, "message");
    assert.equal(parsed.data.hiddenMessage, "I love you more than words can say!");
    assert.equal(parsed.data.coverTitle, "A special secret for you");
  }
});

test("Scratch reveal: requires hiddenMessage when contentType is message", () => {
  const missingMsg = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "message",
    coverTitle: "Surprise",
  };
  const emptyMsg = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "message",
    hiddenMessage: "   ",
    coverTitle: "Surprise",
  };

  const res1 = scratchRevealToolSchema.safeParse(missingMsg);
  assert.equal(res1.success, false);

  const res2 = scratchRevealToolSchema.safeParse(emptyMsg);
  assert.equal(res2.success, false);
});

test("Scratch reveal: validates photo type configuration", () => {
  const input = {
    id: "scratch_t07",
    type: "scratch_reveal",
    enabled: true,
    coverTitle: "Our sweetest memory",
    contentType: "photo",
    hiddenPhotoUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7",
    hiddenMessage: "Remember this day?",
  };

  const parsed = scratchRevealToolSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.contentType, "photo");
    assert.equal(
      parsed.data.hiddenPhotoUrl,
      "https://images.unsplash.com/photo-1518199266791-5375a83190b7"
    );
    assert.equal(parsed.data.hiddenMessage, "Remember this day?");
  }
});

test("Scratch reveal: requires hiddenPhotoUrl when contentType is photo", () => {
  const missingPhoto = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "photo",
    coverTitle: "Surprise Photo",
  };
  const emptyPhoto = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "photo",
    hiddenPhotoUrl: "   ",
  };

  const res1 = scratchRevealToolSchema.safeParse(missingPhoto);
  assert.equal(res1.success, false);

  const res2 = scratchRevealToolSchema.safeParse(emptyPhoto);
  assert.equal(res2.success, false);
});

test("Scratch reveal: validates invitation coupon reference type", () => {
  const input = {
    id: "scratch_t07",
    type: "scratch_reveal",
    enabled: true,
    coverTitle: "A Golden Ticket For You",
    coverInstruction: "Scratch to unveil your date pass",
    contentType: "invitation",
    invitationRefId: "invitation_t02",
    hiddenMessage: "Free candlelit dinner & movie of your choice!",
  };

  const parsed = scratchRevealToolSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.contentType, "invitation");
    assert.equal(parsed.data.invitationRefId, "invitation_t02");
    assert.equal(
      parsed.data.hiddenMessage,
      "Free candlelit dinner & movie of your choice!"
    );
  }
});

test("Scratch reveal: uses sensible defaults for titles and instructions", () => {
  const minimal = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "invitation",
  };

  const parsed = scratchRevealToolSchema.safeParse(minimal);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.coverTitle, "A secret surprise for you");
    assert.equal(
      parsed.data.coverInstruction,
      "Scratch with your finger or mouse to reveal"
    );
    assert.equal(parsed.data.enabled, true);
  }
});

test("Scratch reveal: enforces length bounds", () => {
  const tooLongTitle = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "invitation",
    coverTitle: "A".repeat(101),
  };
  assert.equal(scratchRevealToolSchema.safeParse(tooLongTitle).success, false);

  const emptyTitle = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "invitation",
    coverTitle: "",
  };
  assert.equal(scratchRevealToolSchema.safeParse(emptyTitle).success, false);

  const tooLongMsg = {
    id: "scratch_t07",
    type: "scratch_reveal",
    contentType: "message",
    hiddenMessage: "A".repeat(1001),
  };
  assert.equal(scratchRevealToolSchema.safeParse(tooLongMsg).success, false);
});

test("Template input schema: accepts scratch reveal tool inside template payload", () => {
  const payload = {
    scene_index: 0,
    partner_name: "Taylor",
    partner_from: "Alex",
    sender_gender: "male" as const,
    message: "Happy Anniversary my love!",
    has_media: false,
    media_items: [],
    expiry_hours: 48,
    tools: [
      {
        id: "scratch_t07",
        type: "scratch_reveal",
        enabled: true,
        coverTitle: "A Secret Surprise",
        coverInstruction: "Scratch to open",
        contentType: "message",
        hiddenMessage: "You are my best friend forever.",
      },
      {
        id: "reply_t01",
        type: "reply",
        enabled: true,
      },
    ],
  };

  const result = templateInputSchema.safeParse(payload);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.tools.length, 2);
    assert.equal(result.data.tools[0].type, "scratch_reveal");
    assert.equal(result.data.tools[0].contentType, "message");
  }
});
