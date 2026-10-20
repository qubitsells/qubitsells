# Security changes and rollout

The source now enforces solo ownership, shared couple membership, timed unlocking, separate partner votes, authenticated media delivery, upload ownership, durable cleanup, and real error reporting. The boutique and supplier integration were removed at your request.

These protections require the new database migration. Editing this workspace does not update the deployed database or rotate provider credentials.

## Required rollout steps

1. Back up the Supabase database and temporarily stop app writes while changing its security schema and migrating existing media.
2. Rotate the Cloudinary API credentials that previously appeared as literal source-code fallbacks. Update `.env.local` and your deployment's secret settings. Revoke unused CJ credentials in the provider account if appropriate; this app no longer uses them.
3. Keep `.env.local` private. `npm run security:setup` generated any missing strong `CAPSULE_ENCRYPTION_KEY`, `IP_HASH_SALT`, and `CRON_SECRET` locally without printing their values. Copy these through your deployment's secure secret manager. **Back up the encryption key securely: losing or casually replacing it makes encrypted capsule contents and wishes unreadable.** All app instances must use the same key.
4. For the existing project, apply only `supabase/migrations/20261013203022_security_hardening.sql`. It preserves capsule content in `private.capsule_payloads`, clears browser-readable content columns, replaces policies/grants, and adds the guarded operations used by the app. It keeps existing couple IDs and relationships. Guessable legacy invitation codes are replaced with random codes; copy fresh invitations from the profile screen.
5. Run `npm run security:migrate-media` to preview counts after applying the migration. The preview does not upload, encrypt, change records, or delete files.
6. During the maintenance window, run `npm run security:migrate-media -- --apply` to encrypt existing capsule payloads and copy legacy public Cloudinary files into authenticated storage, updating their references. Original files are retained. If any capsule has no creator, assign its rightful owner explicitly before continuing; the tool never guesses ownership.
7. After checking the protected copies and migrated records, run the utility with `--apply --retire-legacy` to schedule deletion of the old public copies. This step is necessary to close access through previously shared public media URLs. Originals are retired only after the whole migration scan completes successfully; failure retains them and permits retry. Files outside the configured Cloudinary account or the `bonded/` namespace require manual review.
8. Deploy the app with the matching schema and secrets. Verify both partners' profiles, a solo capsule, a pending shared draft, co-sealing, date restrictions, dual unlock, and media playback. Confirm the authenticated cleanup cron runs and retries failed deletions.

Fresh installations must run `supabase/bootstrap.sql` before the historical migrations, then apply all migrations in order. The old capsule setup no longer drops the table.

On Windows PowerShell, use `npm.cmd` when forwarding flags, for example `npm.cmd run security:migrate-media -- --apply`. This avoids PowerShell's npm wrapper consuming the flags.

## Configuration and privacy

- `SUPABASE_SERVICE_ROLE_KEY`, Cloudinary credentials, encryption key, hashing salt, and cron secret stay server-side and are protected by `server-only` imports. Never prefix them with `NEXT_PUBLIC_`.
- The Supabase URL and anon/publishable key are intentionally browser-visible for authentication. They are not administrator credentials. Database grants, RLS, and restricted RPC execution protect private data even when someone copies that key.
- New capsule note payloads and stored wishes use AES-256-GCM with the record ID authenticated as additional data. This is server-managed encryption at rest, not end-to-end encryption. Existing content must go through the migration utility to receive the same encryption.
- Uploaded files use Cloudinary's authenticated delivery type. The browser receives an app media URL, and the app re-checks ownership, capsule state, or an unexpired template link before streaming the original. The provider's signed URL is never returned to the browser.
- Public wishes/templates remain shareable by link. Anyone who receives a working link can view its intended contents. New wishes store the message behind a random link rather than embedding the message in the URL. Existing query-string wishes continue to work, but their historical URL exposure cannot be undone.
- Cleanup accepts only `Authorization: Bearer CRON_SECRET`; a caller-supplied cron header or query-string secret does not bypass authorization. The worker claims bounded batches with leases and keeps records when provider deletion fails. `vercel.json` schedules cleanup once daily (`0 0 * * *`, UTC) for compatibility with Vercel Hobby; invocation timing within the hour is not guaranteed. Template access checks enforce expiry independently, and requests for expired templates also attempt background cleanup. Redeploy after changing the cron configuration.
- On Vercel, rate limiting uses the platform's IP header. Elsewhere set `TRUSTED_PROXY_IP_HEADER` only when a reverse proxy strips and overwrites that header. Without a trusted IP source the app uses a conservative shared bucket rather than accepting attacker-selected IPs.
- Media uploads accept supported raster images, MP4/WebM video and supported audio, up to 25 MB per file. SVG uploads and mismatched file signatures are rejected. Pending abandoned uploads are scheduled for cleanup after 24 hours.
- The private schema must not be exposed in Supabase Data API settings. Its tables also deny browser roles; the guarded pairing function is the only private function executable by authenticated clients.

## Verification

`npm test` runs actual PostgreSQL policies and operation functions in PGlite, plus validation/encryption tests. `npm run typecheck`, `npm run lint`, `npm run security:check`, `npm run build`, `npm run security:check-bundle`, and `npm audit` cover types, source checks, production compilation, browser-secret exposure, and known dependency advisories.

Local verification on 14 October 2026: all 19 tests passed, type checking and production compilation passed, source and built-browser secret scans passed, and npm audit reported zero known vulnerabilities. ESLint reported zero errors and 70 warnings, mostly unused symbols and existing hook/image guidance. Fifteen read-only HTTP checks against the production server verified public pages, removed boutique routes, unauthenticated capsule denial, cross-site write rejection, and rejection of spoofed cleanup authorization. These checks did not change live records or media; production provider settings and real two-account browser interactions still require rollout verification.

The local `vendor/safe-glob` adapter retains Next's directory-discovery interface using tinyglobby and removes an upstream braces dependency with no available patched release. It does not disable Next's ESLint rules. Test its interface and dependency tree when upgrading Next.

The connected database's table columns were inspected without reading private memories. The migration and media utility have not been applied to the remote project, and exposed provider credentials have not been rotated by this workspace change. No claim of a completed production rollout is implied.
