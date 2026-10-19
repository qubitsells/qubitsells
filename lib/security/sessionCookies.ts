import type { CookieOptions } from "@supabase/ssr";
export function authCookieOptions(options: CookieOptions, remember: boolean, secure: boolean): CookieOptions {
  if (remember || options.maxAge === 0) return { ...options, secure };
  const sessionOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;
  return { ...sessionOptions, secure };
}
