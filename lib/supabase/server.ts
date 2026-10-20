import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { authCookieOptions } from '@/lib/security/sessionCookies'
import { publicSupabaseConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = publicSupabaseConfig()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, authCookieOptions(options, cookieStore.get("bonded_remember_session")?.value !== "0", process.env.NODE_ENV === "production"))
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
