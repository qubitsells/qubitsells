import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { authCallbackDestination } from "@/lib/auth/navigation";

export async function GET(request: Request) {
  const destination = await authCallbackDestination(request.url, async code => {
    const supabase = await createClient();
    return supabase.auth.exchangeCodeForSession(code);
  }, process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_BASE_URL : undefined);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
