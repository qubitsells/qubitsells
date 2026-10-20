import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { authCookieOptions } from '@/lib/security/sessionCookies'
import { publicSupabaseConfig } from './config'

export function createClient() {
  const { url, key } = publicSupabaseConfig()
  return createBrowserClient(
    url,
    key,
    { cookies: {
      getAll: () => typeof document === "undefined" ? [] : parseCookieHeader(document.cookie),
      setAll: values => {
        if (typeof document === "undefined") return;
        const remember = !parseCookieHeader(document.cookie).some(cookie => cookie.name === "bonded_remember_session" && cookie.value === "0");
        values.forEach(({ name, value, options }) => { document.cookie = serializeCookieHeader(name, value, authCookieOptions(options, remember, window.location.protocol === "https:")); });
      },
    } }
  )
}
