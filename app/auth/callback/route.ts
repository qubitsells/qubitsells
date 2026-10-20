import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeRedirect } from "@/lib/security/validation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_BASE_URL || origin));
    }
  }

  // Return the user to the login page with an error parameter
  return NextResponse.redirect(`${origin}/login?error=Could%20not%20sign%20in.%20Please%20try%20again.`);
}
