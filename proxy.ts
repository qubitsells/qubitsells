import { NextResponse,type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeRedirect } from "@/lib/security/validation";
import { authCookieOptions } from "@/lib/security/sessionCookies";
export async function proxy(request:NextRequest) {
  let response=NextResponse.next({request});
  const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,authCookieOptions(options,request.cookies.get("bonded_remember_session")?.value!=="0",process.env.NODE_ENV==="production")));},
    },
  });
  const {data:{user}}=await client.auth.getUser();
  const pathname=request.nextUrl.pathname;
  if(user && (pathname==="/login" || pathname==="/signup")) {
    const code=request.nextUrl.searchParams.get("code");
    const target=code?`/couple-space/profile?code=${encodeURIComponent(code.slice(0,100))}`:safeRedirect(request.nextUrl.searchParams.get("redirect"),"/profile");
    const redirect=NextResponse.redirect(new URL(target,request.url));
    response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config={matcher:["/profile","/couple-space/profile","/time-capsule","/login","/signup","/auth/callback"]};
