# Scratch Card Surprise, Sweet Love Coupon, Open When Letter

All six recipient templates use shared components styled with each template's colors. The tools support narrow screens, keyboard controls, visible save errors, and reduced-motion preferences.

- Scratch cards support mouse and touch gestures, preserve partial scratching through resizing, and provide an accessible reveal button. The server records the first reveal timestamp and method. Sender previews do not mark the receiver's surprise as opened. Revealed messages, photos, and invitation/coupon links remain available on return.
- Coupons support requests with notes and optional preferred dates in the receiver's local time. The sender can accept, suggest another time, cancel, and mark an accepted coupon as enjoyed. Every new request and status change retains its note, preferred date, and response in the history. Requesting alone does not redeem a coupon, and a used coupon cannot be redeemed twice.
- Letters open only after server confirmation. Failed requests leave them sealed and retryable. Reopening preserves the original timestamp. Sender previews do not record recipient opens. Opened letters can display their photo/video, and an enabled reply action opens the gift's note tool. Closing a letter unmounts its media player.

My Creations keeps personal replies separate from tool activity. It shows scratch reveals, coupon request history and dates, and opened/sealed letters with their saved content and media. Original scratch content and newly opened letters are captured so later edits do not replace what the receiver actually opened. Older browser-only scratch records and historical coupon requests deleted by earlier code cannot be recovered retroactively.

## Deploy

Apply `supabase/migrations/20261023232326_scratch_coupon_letters_details.sql` **before deploying the application changes**. Use the normal migration workflow or run the file in Supabase SQL Editor. Apply still-pending earlier migrations first, in timestamp order; do not rerun the bootstrap or migrations already applied.

The migration adds restricted scratch activity storage and coupon history, validates letter IDs and coupon transitions, corrects UTC letter timestamps, protects unopened content, and preserves original opened content. Scratch reveals generate an in-app notification through the existing notification/email queue. Coupon requests and letter opens keep their existing notification workflow. No new environment variables are required.

This work does not apply migrations to the live database or deploy to Vercel.

## Verification

`node node_modules/tsx/dist/cli.mjs --conditions=react-server --test tests/template-surprises.test.ts tests/surprise-api.test.ts tests/template-scratch.test.ts tests/template-coupon.test.ts tests/template-open-when.test.ts tests/creator-center-data.test.ts tests/creator-center-display.test.ts`

The tests use an isolated Postgres-compatible database and fixture credentials. They verify all six themes, first-reveal idempotency, preview handling, hidden content, expiry, disabled activity checks, coupon history/authorization, original letter content, and My Creations data. API tests invoke the actual handlers with an intercepted RPC transport, including checks for the correct coupon parameter names and sender preview behavior.

For browser checks, start a local production server on port 3105 and run `node scripts/test-surprises-browser.cjs`. `CHROME_PATH`, `RSVP_TEST_URL`, and `SURPRISE_TEST_THEME` support another Chrome installation, local port, or one theme. The script refuses production URLs and intercepts API requests with fixtures. It checks every theme at 1440px and 390px, simulates actual mouse/touch scratching, tests letter images and a synthetic video, retries failed saves, and verifies coupon management and My Creations. Mobile screenshots are saved under `.next/surprise-audit`.

The checks do not create live orders, upload real media, send email, or mutate production data.
