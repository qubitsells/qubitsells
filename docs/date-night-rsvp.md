# Date Night & RSVP

All six storefront templates use the same RSVP component, styled with each template’s palette. Activity cards and offered dates are native checkboxes: receivers can select several, clear selections, add an alternative idea, write a note, suggest another time, decline, or decide later.

Submitting checked dates saves **Awaiting your confirmation**. The sender opens **My Creations → Replies & tool responses → Tool responses** and confirms one checked date. An alternative time also needs sender approval. Confirmation appears in the recipient template on refresh, returning to the tab, or its 30-second status check. Calendar downloads are offered only for a confirmed date.

The six editors use exact date/time inputs and the sender’s device time zone. Existing human-readable date labels remain readable, but a legacy label without a calendar date cannot produce a calendar download. Reschedule those invitations with exact dates to enable calendar exports.

## Deploy

Apply `supabase/migrations/20261023213926_date_night_rsvp_details.sql` to Supabase **before deploying the application changes**. Use the project’s normal migration workflow, or run this file in Supabase SQL Editor. Do not rerun the bootstrap or earlier migrations. The migration adds receiver activity choices, alternative ideas, and available dates, and updates the invitation functions. Existing invitation rows and responses remain intact.

Then deploy to Vercel. No new environment variables are needed. The existing invitation-response notification and email queue continue to notify the sender. Anonymous receivers have no verified email address; confirmation is shown on their template rather than sent to an invented recipient address.

## Verification

`node node_modules/tsx/dist/cli.mjs --conditions=react-server --test tests/template-invitation.test.ts tests/creator-center-data.test.ts tests/creator-center-display.test.ts`

These tests use an isolated Postgres-compatible database and fixtures. They exercise all six themes, multiple available dates, creator-only confirmation, checked/unchecked presentation, response details, stale revisions, cancelled/expired links, private-note protection, forged slot data, time zones, and calendar exports. They do not create live orders, send emails, or write to the production database.

To repeat the browser checks, start a local production server on port 3105 and run `node scripts/test-date-night-browser.cjs`. It tests the actual six recipient pages and My Creations at 1440px and 390px, with intercepted API fixtures. It also verifies that a failed request cannot display a saved response. Set `CHROME_PATH` if Chrome is installed elsewhere, or `RSVP_TEST_URL` for another local port. Production URLs are refused.
