# Our Story Memories and Couple Bucket List

Both tools use the invitation theme colors across all six templates, with responsive layouts, keyboard controls, visible errors, and reduced-motion support.

Our Story uses live server cards, ordered chapters, previous/next buttons, chapter selectors, and horizontal touch navigation. Receivers can contribute a photo, name, caption, and optional date label. Sender previews cannot contribute on the receiver's behalf. Only the contributor or sender can remove a submitted memory, and a different visitor cannot overwrite it. My Creations preserves authored date labels such as “Summer 2026”.

The bucket list separates dreaming, planning, and enjoyed ideas. Each side can select or deselect interest independently, add an idea (up to 20 total), start planning, explicitly complete an idea, and return it to planning or dreaming. Starting planning does not book or confirm a date. Completed ideas accept memory notes and photos. Activity history retains earlier notes/photos and records the side and time of each update. Repeated completion keeps the original completion time; returning an idea to planning clears its current completion time while preserving the history.

Photo uploads use owned media receipts and template-scoped delivery URLs. Failed saves retain the draft and reuse the same upload on retry. Discarded pending uploads are released through the existing upload lifecycle. Template expiry/deletion and the existing notification/email workflow continue to apply.

My Creations keeps personal replies separate from tool responses. Story responses include the name, photo, caption, authored date, and submission time. Bucket responses include idea authorship, details, both interests, planning/completion times, current memory attribution, photo/note, and previous activity.

## Deployment

Apply `supabase/migrations/20261024012105_story_bucket_details.sql` before deploying the application. Apply earlier pending migrations first, in timestamp order, without rerunning migrations already applied. The new migration depends on the earlier activity validation helper. No new environment variables are required. This work does not deploy the application or change the live database.

Existing rows retain their current data; history is recorded for new changes after migration. Old notes already overwritten by earlier versions cannot be reconstructed. Earlier timestamps that were stored with an incorrect timezone cannot be reliably inferred and rewritten.

## Verification

- `node node_modules/tsx/dist/cli.mjs --conditions=react-server --test tests/story-bucket-details.test.ts tests/story-bucket-api.test.ts tests/template-our-story.test.ts tests/template-bucket-list.test.ts tests/creator-center-data.test.ts tests/creator-center-display.test.ts`
- Start a local production server on port 3105, then run `node scripts/test-story-bucket-browser.cjs`. `CHROME_PATH`, `RSVP_TEST_URL`, and `MEMORY_TEST_THEME` allow another Chrome installation, local port, or one template. The script refuses production URLs and intercepts all API calls with fixtures. It tests six themes at 1440px/390px with local photo fixtures, retries, removal, interest, planning/completion, history, and My Creations. Mobile screenshots are saved to `.next/memories-audit`.

These checks do not create live orders, upload real media, send notifications/email, or modify production data.
