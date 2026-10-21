import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_RETURN_COOKIE, authCallbackDestination, authRequestOrigin } from "@/lib/auth/navigation";

export async function GET(request: Request) {
  const jar = await cookies();
  const origin = authRequestOrigin(request, process.env.VERCEL === "1");
  const destination = await authCallbackDestination(request.url, async code => {
    const supabase = await createClient();
    return supabase.auth.exchangeCodeForSession(code);
  }, origin, jar.get(AUTH_RETURN_COOKIE)?.value);
  const response = NextResponse.redirect(destination);
  response.cookies.set(AUTH_RETURN_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax", secure: origin.startsWith("https:") });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
