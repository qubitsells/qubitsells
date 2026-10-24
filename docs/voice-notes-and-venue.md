# Voice & Photo Notes and Date Venue & Format

Both tools share components across all six storefront templates and use each template's palette. Replies remain in their own section in My Creations; date venue information appears under Tool responses.

## Behavior

- Receivers can send the enabled combination of text, a reaction, photos, and one recorded voice note. Recording limits, photo counts, and enabled formats are enforced when saving. Adding or removing photos does not interrupt recording or invalidate the other previews.
- A recording can be played before sending, discarded, played after saving, and played in My Creations. Names, message text, reactions, submission times, photos, voice formats, and available durations are preserved.
- Failed saves keep the draft and reuse uploaded attachments on retry. New notes use new draft IDs. Reloading restores the latest saved note from the receiver's private receipt cookie. Deletion removes only the selected note; the existing cleanup workflow handles its media.
- Venue settings support an in-person location and optional venue/reservation link, or an online platform and optional meeting link. Venue details can appear without Date Night & RSVP enabled. When RSVP is enabled, they appear within the invitation. Links accept only HTTP or HTTPS without embedded credentials.

## Deploy

Apply `supabase/migrations/20261023221928_voice_notes_and_venue.sql` **before deploying this application update**. Use the normal migration workflow or run this file in Supabase SQL Editor. It adds provider-verified recording duration and updates the media registration and reply functions. Existing notes and files remain intact. Earlier recordings gain media classification/format information where available; their duration remains unavailable if it was never stored.

If the earlier Date Night & RSVP work has not been applied yet, apply `20261023213926_date_night_rsvp_details.sql` first. Do not rerun the bootstrap or previously applied migrations. No new environment variables are needed.

## Verification

The automated test suite passes, including reply metadata, ownership, private receipts, idempotent retries, disabled formats, recording limits, venue validation, and My Creations rendering.

Start a local production server on port 3105 and run `node scripts/test-voice-venue-browser.cjs` to repeat browser checks. Set `CHROME_PATH` or `RSVP_TEST_URL` for another Chrome installation or local port. The script refuses production hosts and intercepts all API requests with fixtures. It records from Chrome's synthetic microphone rather than a physical microphone.

The browser check covers all six recipient templates and My Creations at 1440px and 390px, photo selection/removal, actual MediaRecorder recording and playback, recording while photos change, save retry, media access URLs, independent venue details, and responsive layout. It also checks restored notes, new draft IDs, and deletion. Mobile screenshots are saved in `.next/voice-venue-audit`.

These checks do not modify the live database, upload to the real media provider, charge an order, or send email. Real-device microphone permissions and provider delivery still depend on the browser and deployment configuration.
