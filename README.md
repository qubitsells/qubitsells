# Bonded

A Next.js application for private couple spaces, solo/shared time capsules, romantic wishes, and anime-themed messages.

## Setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`, configure Supabase and Cloudinary, and run `npm run security:setup`. Never commit `.env.local`.
3. Prepare the database and migrate existing media using [SECURITY.md](SECURITY.md). Existing projects must apply the security migration before using this version of the app. New projects must also run `supabase/bootstrap.sql` before the historical migrations.
4. Configure Supabase Auth site/redirect URLs for your own origin and `/auth/callback`, and enable the desired email/Google providers. Set `NEXT_PUBLIC_BASE_URL` to the actual deployed origin in production.
5. Start development with `npm run dev`. Build with `npm run build`, then serve with `npm start`.

The default development URL is `http://localhost:3000`.

For Google sign-in on `https://qubitsells.com`, follow the complete [Google Cloud, Supabase, and Vercel setup guide](docs/google-sign-in.md). The Google OAuth secret belongs in Supabase provider settings. Vercel needs the Supabase public URL/key at build time; local `.env.local` values are not automatically uploaded.

For profile password reset and account deletion, follow [Account security setup](docs/account-security.md). Apply `20261020223922_account_deletion.sql` before enabling deletion in production, and configure Supabase recovery email delivery. The endpoint blocks deletion until the safety trigger is installed.

## Features

- Profiles and verified pairing through random invitation codes. Both partners retain one shared couple space.
- Solo capsules are readable only by their creator. Timed solo capsules stay sealed until their selected date.
- Shared drafts are editable by the creator until the partner co-seals them. Opening a sealed shared capsule requires the date to arrive and both partners to approve separately. Both partners can view an opened shared capsule.
- Photos, videos, microphone recordings, folders, letters, notes, and predictions use trusted uploads and authorized media access.
- Wishes store personal messages behind random share links. Anime messages retain scene/music selection, media galleries, and expiry.
- Landing-page heat maps, calendar, savings, and date examples are interactive previews. Vibe Check copies a plan to share. The invitation form opens an email draft for the user to send.

The boutique and CJ Dropshipping integration have been removed.

## Checks

```text
npm test
npm run typecheck
npm run lint
npm run security:check
npm run build
npm run security:check-bundle
npm audit
```

Security tests execute the actual SQL migrations/policies in an isolated PGlite PostgreSQL database. They do not mutate the connected production database or upload/delete real Cloudinary files.

The app uses Next.js 16's `proxy.ts` convention. Read the installed Next guides before changing framework APIs. The local glob adapter and patched transitive versions are documented in `vendor/safe-glob/README.md`.

## Deployment and recovery

Vercel Web Analytics is included in the root layout with the Next.js integration. In the Vercel dashboard, open the project's **Analytics** area and enable **Web Analytics**, then deploy these changes. Visit `qubitsells.com` and check the dashboard for traffic. No analytics API key is needed. Query strings/fragments are removed from analytics URLs, shared gift codes are masked, and auth callback/API URLs are excluded. See [Vercel's setup guide](https://vercel.com/docs/analytics/quickstart).

Read [SECURITY.md](SECURITY.md) before deployment. It explains credential rotation, private database content, legacy media migration, encryption-key backups, cron authorization, trusted proxy IP configuration, and the limits of server-managed encryption.

Keep failed cleanup records for retries. Do not remove the encryption key or delete media ownership records to resolve a cleanup error. Recover the database and key together from a secure backup when necessary.
