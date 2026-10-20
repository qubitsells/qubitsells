import { NextResponse } from "next/server";
import { adminClient, apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/security";
import { databaseResult, privateHeaders } from "@/lib/server/commerce";
import {createClient} from "@/lib/supabase/server";
import { ensureReviewInvitations } from "@/lib/server/reviews";

export async function GET(request: Request) {
  try { const user = await requireUser(); await ensureReviewInvitations(user.id, adminClient()); const db = await createClient();
    const page = Math.max(0, Math.min(Number(new URL(request.url).searchParams.get("page")) || 0, 10000));
    const [items, unread] = await Promise.all([
      databaseResult(db.from("store_notifications").select("id,kind,title,message,href,read_at,created_at").eq("user_id", user.id).order("created_at", {ascending: false}).range(Math.floor(page) * 20, Math.floor(page) * 20 + 19)),
      db.from("store_notifications").select("id", {count: "exact", head: true}).eq("user_id", user.id).is("read_at", null),
    ]);
    if (unread.error) throw new HttpError(503, "Notifications couldn’t be loaded.");
    return NextResponse.json({items, unread: unread.count || 0}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try { requireSameOrigin(request); const user = await requireUser(); const input = await jsonBody(request, 1024) as {id?: unknown; all?: unknown};
    let query = adminClient().from("store_notifications").update({read_at: new Date().toISOString()}).eq("user_id", user.id).is("read_at", null);
    if (input.all !== true) { if (typeof input.id !== "string" || !/^[a-f0-9-]{36}$/i.test(input.id)) throw new HttpError(400, "Choose a notification."); query = query.eq("id", input.id); }
    await databaseResult(query); return NextResponse.json({success: true}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
