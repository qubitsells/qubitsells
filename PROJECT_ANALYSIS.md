# Bonded project analysis

**Historical assessment:** this document records the findings before the security fixes. The implementation has since changed, and the boutique was removed at the user's request. See [SECURITY.md](SECURITY.md) for current protections and required deployment steps.

Reviewed on 14 October 2026. This report covers the application source, routes, components, authentication, persistence helpers, supplied SQL migrations, assets, dependencies, and deployment configuration.

## Assessment

Bonded is a substantial couples-app prototype with a consistent visual identity and implemented authentication, profile editing, media-rich time capsules, shareable wishes, anime templates, and supplier integration code. It builds successfully, but several authorization and data-loss defects make it unsuitable for handling private memories or real orders in its current state.

The most urgent work is securing media operations and database access, protecting saved media from cleanup, and making persistence and checkout failures visible. A frontend redesign is not the first priority.

This is a source and tooling assessment. The deployed Supabase schema, grants, policies, provider settings, hosting behavior, and live supplier/Cloudinary credentials were not inspected. SQL findings describe the migrations supplied here; deployed configuration may differ. No real uploads, purchases, cleanup jobs, or database mutations were performed. Browser behavior, responsive layouts, and accessibility were not interactively tested.

## Architecture and feature status

| Layer | Implementation |
| --- | --- |
| Framework | Next.js 16.3.3 App Router, React 19.2.8, TypeScript with strict mode |
| Presentation | Tailwind CSS 4, Framer Motion, Lucide icons, canvas-confetti; rose/pink theme, local script font, Google fonts |
| Authentication | Supabase SSR browser/server clients, cookie-refresh middleware, global AuthProvider |
| Persistence | Direct browser Supabase access plus localStorage fallbacks; privileged template APIs use a server service-role key |
| Media | Cloudinary upload, deletion, and template-expiry cleanup |
| Commerce | CJ Dropshipping catalog and order helper; curated catalog fallback |
| Music | FreeToUse search, YouTube oEmbed metadata and embedded playback |
| Hosting | Vercel configuration with template cleanup every 30 minutes |

| Route / feature | Current status |
| --- | --- |
| `/` | Landing page with interactive demonstrations, showcases, and navigation |
| `/login`, `/signup`, `/auth/callback` | Password, magic-link, email confirmation, and Google OAuth code exists; actual provider configuration unverified |
| `/profile` | Profile, couple code, pairing, shared anniversary/motto, and YouTube anthem; persistence errors can be hidden |
| `/time-capsule` | Rich creation/viewing/editing, photos, video, microphone recording, notes, predictions, seal requests and unlock votes; serious privacy/lifecycle defects |
| `/wishes`, `/love/[slug]` | Template catalog and cinematic viewer; personalization is encoded directly in URL query parameters |
| `/anime-template`, `/t/[code]` | Media/music wizard, database-backed short links, expiry, cinematic playback |
| `/boutique` | Catalog, variants, cart, shipping form and checkout; fulfillment is not dependable and no payment-verification flow exists |
| Heat map, calendar, savings jar, blind-date showcase | Demonstration data/local component state, rather than persisted collaborative tools |
| Landing-page invitation and Vibe Check send | UI success states without actual email delivery or partner messaging |

Data flow is primarily client-driven: React components call Supabase directly under RLS, AuthProvider loads couple data and subscribes to couple changes, and time capsules merge database behavior with a shared browser cache. Anime templates follow a different model: public APIs insert with service privileges, viewers fetch by short code, and cleanup deletes database rows and associated Cloudinary media.

## Priority findings

### 1. Critical: hardcoded Cloudinary secret and unrestricted media operations

Evidence: `app/api/upload/route.ts:8`, `:88`; `lib/cloudinaryCleanup.ts:11`.

Cloudinary configuration contains a literal secret fallback. Its current validity was not tested, but the value should be treated as exposed and rotated if valid. Environment overrides do not remove an exposed fallback from source.

Neither POST nor DELETE on `/api/upload` authenticates the caller or verifies asset ownership. DELETE accepts caller-supplied asset URLs and public IDs, then signs destructive requests using server credentials. POST allows caller-selected folders/resource types without application-level file-size, MIME, or quota controls. Middleware session refresh does not reject unauthenticated API callers.

Repair: remove credential fallbacks, require valid server configuration, authenticate operations, and validate ownership using server-controlled media records. If anonymous template creation is intentional, issue scoped upload capabilities with strict limits and track ownership independently of a login session.

### 2. Critical: capsule RLS permits access beyond the intended owner/couple

Evidence: `supabase/migrations/20260901_time_capsules.sql:41–72`.

SELECT and UPDATE allow rows with `couple_id IS NULL`. With the necessary table grants, this includes callers outside the intended owner and can include anonymous callers. INSERT accepts any authenticated caller without ensuring `creator_id` is the caller or that the target couple belongs to them.

Solo capsules are described as private to their creator, but the SELECT policy allows either couple member to retrieve their entire content. The React filter in `components/TimeCapsuleStudio.tsx:1352` only hides cards after data reaches the browser.

Repair: define authenticated owner/couple predicates for each operation, validate inserted ownership and membership, and enforce solo visibility in the database. Verify grants and allow/deny cases against the actual database. Supabase documents grants and RLS as separate checks: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 3. High: template input can cause deletion of unrelated media

Evidence: `app/api/templates/create/route.ts:102`, `:182`; `lib/cloudinaryCleanup.ts:112–175`.

Template creation validates the media array's count but not its entries or ownership. Cleanup later trusts the stored `public_id` and deletes that asset using privileged credentials. A public caller can submit another asset's ID and arrange for cleanup to target it when the template expires.

Repair: accept only server-issued media references belonging to the creator/upload capability; derive asset identifiers and resource types from trusted records.

### 4. High: public template policies undermine rate limits and link privacy

Evidence: `supabase/migrations/20260919_couple_templates.sql:43–105`; `app/api/templates/create/route.ts:117`.

The supplied INSERT policy uses `WITH CHECK (true)`, allowing direct Data API insertion when table grants permit it, bypassing the API's validation and rate limit. The SELECT policy permits every non-expired row; knowing a short code is not required to list templates through the Data API. Short links therefore do not provide exclusive access.

Cleanup RPCs use SECURITY DEFINER and have no explicit EXECUTE revocations or caller checks in the migration. PostgreSQL's default function privileges can make expired-template reads/deletes callable publicly unless privileges are tightened elsewhere.

The API also ignores rate-limit RPC errors and proceeds unless the result is explicitly false. Its count-then-insert sequence is not atomic.

Repair: route writes and private-link reads through controlled APIs, minimize public grants, restrict cleanup RPC execution to the intended service role, and use an atomic rate limiter that handles failures deliberately.

### 5. High: closing a saved couple capsule deletes its media

Evidence: `components/TimeCapsuleStudio.tsx:1010`, `:1089`, `:1129`, `:3851`, `:3870`, `:3907`.

After saving a couple capsule, the wizard keeps its uploaded photos/videos/voice notes in state while displaying the partner waiting screen. Return-to-vault buttons invoke the same close handler used for cancellation. That handler purges all those assets without checking whether they already belong to the saved capsule. The database retains references to deleted files.

Repair: track upload ownership/lifecycle explicitly and purge only uncommitted assets. Clear or mark committed uploads immediately after a successful save; closing a saved draft must preserve its media.

### 6. High: capsule sealing, privacy, and encryption claims exceed enforcement

Evidence: `lib/supabase/timeCapsules.ts:188`, `:238`; `components/TimeCapsuleStudio.tsx:958`, `:1029`; `supabase/migrations/20260906_capsule_seal_requests.sql:40–51`; `app/time-capsule/page.tsx:11`, `:51`.

The creation component requests `is_locked: false` for a couple draft, but the persistence helper always overwrites it with true. This contradicts the partner-approval workflow and the filtering logic for pending drafts.

Seal-request UPDATE permits either participant to change the row's fields, including both vote columns and acceptance status. There is no database transition enforcing whose vote is being cast or requiring both votes before unlocking a capsule. Capsule content is fetched in full even while locked; dates and the hold-to-unlock simulation do not protect the data from the client.

No application-level encryption/key-management implementation was found. Notes and media references are stored as readable JSON and localStorage. Provider transport/storage encryption is different from the product's implied sealed private vault behavior.

Repair: define one state machine for draft, pending approval, sealed, and opened; enforce transitions and participant-specific votes transactionally on the server/database. Restrict content retrieval where required. Implement the promised cryptographic model or revise product claims to match actual guarantees.

### 7. High: browser cache can leak accounts' memories and resurrect stale data

Evidence: `lib/supabase/timeCapsules.ts:118`, `:206`, `:221`; `context/AuthContext.tsx:159`.

All accounts share `bonded_time_capsules_v2`. The cache is not cleared by sign-out, keyed by user/couple, or filtered by ownership when read. A successful empty database result falls back to old cache contents, just as a failed query does. The capsule page also runs its load effect before an authenticated identity is established.

Repair: scope caches by identity, wait for auth resolution, clear account-specific data on sign-out, treat an empty successful response as authoritative, and keep offline drafts explicitly distinct from synchronized records.

### 8. High: failed checkout is presented as successful fulfillment

Evidence: `lib/cjdropshipping.ts:508–560`; `app/api/dropshipping/checkout/route.ts:20`, `:44`.

Missing supplier authentication returns a mock order marked successful. Supplier rejection returns a supposedly queued order, and network exceptions return a successful fallback. No durable queue supporting those promises is implemented. The UI celebrates and clears the cart.

The API attempts supplier order creation before checking the user. It does not validate product variants/quantities against a trusted catalog, verify payment, or enforce idempotency. Product IDs are passed as CJ variant IDs while the selected variant name is ignored by the order helper. The order log is an optional wishlist insert rather than a durable order record.

Repair: separate an explicit demo mode from real checkout, propagate supplier failures, validate orders and shipping server-side, resolve real variant IDs, and add durable order/payment state and idempotency before enabling fulfillment.

### 9. High: persistence and cleanup helpers report success after failures

Evidence: `lib/supabase/timeCapsules.ts:329–355`, `:442–447`; `components/ProfileStudio.tsx:315–409`; `lib/cloudinaryCleanup.ts:166–227`; `app/api/upload/route.ts:140`.

Supabase generally returns `{ error }` instead of throwing, but several callers rely on try/catch and ignore returned errors. Capsule deletion returns true after a failed database operation. Profile edits can celebrate shared synchronization when only auth metadata was saved. Media cleanup deletes template rows even after some asset deletions fail, losing the references needed for retries. Upload DELETE can label a provider error as an `ok` result and counts attempted assets as deleted.

Repair: inspect error/result fields, return explicit outcomes, reconcile optimistic updates, and retain failed cleanup jobs for retries. Authorize a deletion before removing files, and preserve sufficient state to recover from partial failure.

### 10. High: pairing can succeed without a real partner connection

Evidence: `lib/supabase/couple.ts:132–198`; `components/AuthForm.tsx:185`; `components/CouplePairingCard.tsx:37`.

If the RPC/table lookup fails, any string beginning with `LOVE-` can mark the current user's editable metadata as connected. This is a simulated state, not a real shared couple row. The direct-table fallback reads then updates without an atomic check that the partner slot is still empty, and does not remove the joining user's previous standalone couple. Subsequent `.maybeSingle()` lookups can fail if the user belongs to multiple rows.

Invite links contain `?code=...`, but AuthForm does not read that parameter. Signup stores a supplied couple code as metadata rather than invoking the join operation.

Repair: implement and version an atomic pairing RPC, enforce membership uniqueness, surface pairing errors, and consume invitation codes in a verified join flow.

### 11. Medium: cleanup authorization and lifecycle are unreliable

Evidence: `app/api/templates/cleanup/route.ts:16–30`; `lib/cloudinaryCleanup.ts:231`; `app/api/templates/[code]/route.ts:62`, `:115`; `app/api/templates/create/route.ts:238`.

Cleanup bypasses the secret check for `x-vercel-cron: 1` and fails open if CRON_SECRET is absent. The source trusts that header without validating its provenance. Require a configured secret and verify it regardless of a caller's claimed identity.

Opportunistic cleanup and view increments launch unawaited promises. Their completion after a serverless response is not guaranteed by this code; process-local throttling also does not coordinate across instances. Cleanup has no batching/claiming, and synchronous expired-template reads can spend considerable time purging media.

Template DELETE requires a creator token, but creation does not issue one and the creator UI does not store/use one. GET spreads all database fields into the public response, including `creator_hash`. The token's fallback signing salt is hardcoded.

Repair: use a durable bounded cleanup job, platform-supported background execution, a real creator deletion capability, required secrets, and explicit public response fields.

## Database and operational completeness

- The first capsule migration starts with `DROP TABLE ... CASCADE`, which destroys existing capsule data and dependent objects if run against an existing installation. Replace upgrade instructions with non-destructive, versioned migrations and a backup/restore procedure.
- The supplied migrations reference `couples` but do not create it. They also omit base definitions/policies for `profiles`, `wishlists`, and `join_couple_by_code`. There is no Supabase project configuration or database test suite here. A fresh database cannot be reproduced from the supplied files alone.
- Capsule/request foreign keys and RLS lookup columns lack supporting indexes in the supplied migrations. Add appropriate indexes after confirming real access patterns. The template `short_code` index duplicates the index already provided by its UNIQUE constraint.
- `unlock_date` combines date/time values and human-readable trigger text in one TEXT column. Separate timed unlocks from event-triggered capsules so constraints and server enforcement are possible.
- Core records use JSONB heavily. This suits flexible media/note payloads, but ownership, votes, lifecycle state, and media cleanup references need validated relational structure.
- README remains the starter template. Setup does not document schema prerequisites, provider configuration, cleanup behavior, demo modes, or operational recovery. `walkthrough.md` describes title/date-based deletion, while the current helper deletes only by ID; update the document to match the code.
- `.env.example` lists Spotify settings and a callback route that is absent. The implemented music paths use FreeToUse and YouTube. `NEXT_PUBLIC_BASE_URL`, used by template creation, is not documented there.
- This folder is not a Git repository, so history, CI configuration in history, branches, and tracked-secret exposure could not be assessed.

## Maintainability, UX, and performance

The project has sensible top-level separation into app routes, components, context, and integration helpers, with consistent metadata and Suspense boundaries. Its largest components combine presentation, recording/playback, uploads, state machines, forms, and persistence in single files: TimeCapsuleStudio is 4,133 lines, WishesMarketplace 2,398, AnimeTemplatePage 1,982, anime creator 1,890, and ProfileStudio 1,509.

Extract domain hooks and smaller components after correcting data ownership and state transitions. Generate Supabase schema types, introduce shared runtime request validation, and use a consistent error/result contract. The 48 explicit-any lint findings show where compile-time checks currently cannot establish payload correctness.

Specific follow-up issues:

- Anime uploads update entries by array index. Removing an entry during another upload can associate its result with the wrong file. Use stable upload IDs. Removing/abandoning anime uploads does not purge Cloudinary assets, and the preview cleanup effect captures the initial empty array.
- Typewriter intervals in the recipient viewers are created inside timeout callbacks whose returned cleanup React never calls. Keep both timer handles in the effect cleanup.
- Microphone tracks are stopped after recording ends, but closing/unmounting during an active recording lacks an equivalent cleanup path.
- AuthProvider loads couple data through both initial session loading and auth events, and subscribes globally even on public recipient pages. Keep event handlers short and avoid duplicate/in-flight stale loads.
- Middleware runs a user lookup on most requests, including APIs and media extensions not excluded by its matcher. Review its scope and copy refreshed cookies when returning redirects.
- Modal markup lacks a shared focus-trap/dialog implementation. Some lightboxes have Escape handling, but modal keyboard/focus behavior is inconsistent. No reduced-motion support was found despite extensive perpetual animations.
- Public assets include a 6.60 MB PNG and videos of 5.59 MB and 4.59 MB. Compress/resize backgrounds and set deliberate image/video loading strategies. Several catalog images use plain img elements.
- Wishlist/order catalog ratings include hardcoded or randomly generated reviews. They should be marked as demonstration content or replaced with verified product data.
- Wishes place names and message text in URLs. This affects browser history and link-sharing privacy; persistent short links would be preferable for sensitive content.
- Remember-me is a UI checkbox without persistence behavior. Several footer links are placeholders. Invitation, savings, calendar, and Vibe Check controls should either implement their promises or be presented clearly as previews.

## Verification results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run build` | Passed after retry with network access for Google Fonts |
| Framework warning | middleware.ts is deprecated in Next.js 16; migrate filename/export to proxy.ts/proxy using the installed documentation |
| `npm run lint` | Failed: 98 errors and 75 warnings |
| `npm audit --json` | Nine affected dependency packages: one critical and eight high package-level classifications |
| Automated feature/database tests | No test files or test script found in application scope |

Lint is dominated by explicit-any (48), unused variables (67), unescaped JSX text (25), set-state-in-effect (14), plus memoization, purity, immutability, dependency, image, and navigation issues. TimeCapsuleStudio has 24 errors/23 warnings; ProfileStudio 14/5. A successful Next build does not establish a clean lint result.

Audit packages: `next`, `sharp`, `source-map-js`, `brace-expansion`, `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, and `eslint-config-next`. Several are development/transitive dependencies rather than independent production vulnerabilities.

Next.js 16.3.3 falls within the critical Node ImageResponse advisory range. No `next/og` or ImageResponse usage was found in this application, so the critical dependency flag is not evidence of a reachable remote-code-execution path here. The advisory explicitly requires attacker-controlled SVG values passed to Node ImageResponse: [Next.js ImageResponse advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). Audit also reports a high-severity image-optimization issue: [Next.js image optimization advisory](https://github.com/advisories/GHSA-cjq9-62q9-8jv4).

The audit proposed Next.js 16.4.0 as a fix target and a major downgrade for eslint-config-next. Do not run a forced automatic audit fix without reviewing compatibility; choose a coherent patched Next.js/ESLint dependency set, read the relevant version guides, and repeat build, lint, and audit.

## Suggested repair sequence

1. Rotate/remove exposed Cloudinary credentials; secure upload/deletion and reject unowned template media.
2. Rebuild database authorization for capsules, solo privacy, votes, template access, and privileged RPCs; verify actual grants/policies with positive and negative database tests.
3. Fix saved-media deletion and draft/sealed state contradictions. Scope browser caches and handle synchronization/deletion failures explicitly.
4. Make pairing atomic and remove simulated production success. Make checkout report actual supplier outcomes and add durable order/payment handling.
5. Update vulnerable dependencies and migrate middleware to Proxy. Complete a reproducible schema/setup and reliable cleanup worker.
6. Add focused tests for cross-user isolation, vote enforcement, saved-media preservation, cache account switching, failed supplier orders, and failed persistence. Then split large components, resolve lint, improve keyboard/reduced-motion behavior, and optimize media assets.

This assessment predates the subsequent source fixes. Current changes and deployment requirements are documented in SECURITY.md.
