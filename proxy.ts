import { NextResponse,type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/security/sessionCookies";
import { publicSupabaseConfig } from "@/lib/supabase/config";
import { signInDestination } from "@/lib/auth/navigation";
export async function proxy(request:NextRequest) {
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
export const config={matcher:["/profile","/couple-space/profile","/time-capsule","/login","/signup","/auth/callback"]};
