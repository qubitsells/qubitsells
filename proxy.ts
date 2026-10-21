import { NextResponse,type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/security/sessionCookies";
import { publicSupabaseConfig } from "@/lib/supabase/config";
import { AUTH_RETURN_COOKIE, authRequestOrigin, authReturnDestination, signInDestination } from "@/lib/auth/navigation";
export async function proxy(request:NextRequest) {
  // Supabase can fall back to Site URL when its redirect allowlist is missing an
  // entry. Exchange that code on the server before the homepage client sees it.
  if(request.nextUrl.pathname==="/") {
    if(request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("error")) {
      const callback=new URL("/auth/callback",authRequestOrigin(request,process.env.VERCEL==="1"));
      callback.search=request.nextUrl.search;
      // The navigation cookie is optional; the PKCE verifier still validates
      // the code exchange. Without a saved destination, finish on the homepage.
      callback.searchParams.set("next",authReturnDestination(request.cookies.get(AUTH_RETURN_COOKIE)?.value)||"/");
      const redirect=NextResponse.redirect(callback);
      redirect.headers.set("Cache-Control","private, no-store");
      redirect.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
      return redirect;
    }
    return NextResponse.next();
  }
  let response=NextResponse.next({request});
  const {url,key}=publicSupabaseConfig();
  const client=createServerClient(url,key,{
    cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,authCookieOptions(options,request.cookies.get("bonded_remember_session")?.value!=="0",process.env.NODE_ENV==="production")));},
    },
  });
  const {data:{user}}=await client.auth.getUser();
  const pathname=request.nextUrl.pathname;
  if(user && (pathname==="/login" || pathname==="/signup")) {
    const target=signInDestination(request.nextUrl.searchParams);
    const redirect=NextResponse.redirect(new URL(target,request.url));
    response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config={matcher:["/","/profile","/couple-space/profile","/time-capsule","/login","/signup","/auth/callback"]};
