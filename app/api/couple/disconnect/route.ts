import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { apiError, requireSameOrigin, requireUser, rateLimit, HttpError, adminClient } from "@/lib/server/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, "couple-disconnect", 15);

    const admin = adminClient();

    // 1. Locate current connected couple row for this user
    const { data: coupleRow, error: fetchErr } = await admin
      .from("couples")
      .select("*")
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .not("partner_2_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      throw new HttpError(500, "Failed to verify couple status. Please try again.");
    }

    if (!coupleRow || !coupleRow.partner_2_id) {
      throw new HttpError(400, "You are not currently connected to a partner in a couple space.");
    }

    const p1 = coupleRow.partner_1_id;
    const p2 = coupleRow.partner_2_id;
    const oldCoupleId = coupleRow.id;

    // 2. Generate new unique Love Codes for each partner's fresh solo sanctuary
    const code1 = "LOVE-" + randomUUID().replace(/-/g, "").toUpperCase();
    const code2 = "LOVE-" + randomUUID().replace(/-/g, "").toUpperCase();

    // 3. Create fresh solo couple rows for both partners
    const { data: newC1, error: errC1 } = await admin
      .from("couples")
      .insert({
        couple_code: code1,
        partner_1_id: p1,
        partner_2_id: null,
        couple_motto: "Hand in hand, writing our forever story.",
      })
      .select("id")
      .single();

    if (errC1 || !newC1) {
      throw new HttpError(500, "Could not initialize independent space. Please try again.");
    }

    const { data: newC2, error: errC2 } = await admin
      .from("couples")
      .insert({
        couple_code: code2,
        partner_1_id: p2,
        partner_2_id: null,
        couple_motto: "Hand in hand, writing our forever story.",
      })
      .select("id")
      .single();

    if (errC2 || !newC2) {
      throw new HttpError(500, "Could not initialize independent space. Please try again.");
    }

    // 4. Preserve solo capsules for each creator into their new independent space
    await admin
      .from("time_capsules")
      .update({ couple_id: newC1.id })
      .eq("couple_id", oldCoupleId)
      .eq("creator_id", p1)
      .eq("seal_mode", "solo");

    await admin
      .from("time_capsules")
      .update({ couple_id: newC2.id })
      .eq("couple_id", oldCoupleId)
      .eq("creator_id", p2)
      .eq("seal_mode", "solo");

    // 5. Reassign wishlists if applicable
    try {
      await admin
        .from("wishlists")
        .update({ couple_id: newC1.id })
        .eq("couple_id", oldCoupleId)
        .eq("user_id", p1);

      await admin
        .from("wishlists")
        .update({ couple_id: newC2.id })
        .eq("couple_id", oldCoupleId)
        .eq("user_id", p2);
    } catch {}

    // 6. Update user profiles to point to their new spaces and clear partner nickname/anthem
    await admin
      .from("profiles")
      .update({
        couple_id: newC1.id,
        partner_nickname: null,
        couple_anthem: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p1);

    await admin
      .from("profiles")
      .update({
        couple_id: newC2.id,
        partner_nickname: null,
        couple_anthem: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p2);

    // 7. Update user auth metadata for both accounts
    try {
      await admin.auth.admin.updateUserById(p1, {
        user_metadata: {
          partner_nickname: null,
          anniversary_date: "",
          couple_anthem: null,
          couple_code: code1,
        },
      });
    } catch {}

    try {
      await admin.auth.admin.updateUserById(p2, {
        user_metadata: {
          partner_nickname: null,
          anniversary_date: "",
          couple_anthem: null,
          couple_code: code2,
        },
      });
    } catch {}

    // 8. Mark media for any remaining shared couple capsules as deleting
    const { data: sharedCapsules } = await admin
      .from("time_capsules")
      .select("id")
      .eq("couple_id", oldCoupleId);

    if (sharedCapsules && sharedCapsules.length > 0) {
      const capIds = sharedCapsules.map((c) => c.id);
      try {
        await admin
          .from("media_assets")
          .update({ state: "deleting", lease_until: null })
          .in("capsule_id", capIds);
      } catch {}
    }

    // 9. Cascade-delete the shared couple record
    const { error: delErr } = await admin.from("couples").delete().eq("id", oldCoupleId);
    if (delErr) {
      throw new HttpError(500, "Could not finalize disconnection. Please try again.");
    }

    return NextResponse.json({
      success: true,
      message: "Disconnected successfully. Shared couple space and mutual access have been closed.",
    });
  } catch (error) {
    return apiError(error);
  }
}
