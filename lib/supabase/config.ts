export function publicSupabaseConfig() {
  // Keep literal env accesses: Next.js replaces NEXT_PUBLIC_ values at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in Vercel Project Settings > Environment Variables, then redeploy. Local .env.local values are not uploaded to Vercel.");
  }
  return { url, key };
}
