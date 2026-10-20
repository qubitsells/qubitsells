import { NextResponse } from "next/server";
import { adminClient, apiError, requireUser } from "@/lib/server/security";
import { privateHeaders } from "@/lib/server/commerce";
import { accountOrders } from "@/lib/server/orders";

export async function GET(request: Request) {
  try { const user = await requireUser();
    return NextResponse.json(await accountOrders(adminClient(),user.id,new URL(request.url)), {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
