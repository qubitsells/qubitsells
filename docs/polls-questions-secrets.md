# Vibe Check & Poll, Heart-to-Heart Q&A, Synchronized Secret

All six recipient templates share theme-aware components with responsive layouts, keyboard controls, visible error/retry states, and reduced-motion support.

- Polls use native checkboxes for multiple choices and radio buttons for a single choice. Receivers can add a suggestion, revise votes, and see agreement or disagreement. New gifts collect the sender's vote during setup; older gifts retain voting through the management link or signed-in owner account. A poll result remains an idea rather than a confirmed calendar plan.
- Q&A supports short/long text, offered choices, required questions, optional skips, private draft saving/restoration, and a review step before submission. Real answer content and valid choices are checked on the server. Submitted question prompts are captured so later card edits do not relabel newly received answers.
- Secrets support every configured prompt. New gifts lock the sender's answers during setup, so the receiver can answer and reveal without waiting for another sender visit. Older gifts retain the independent answer and withdraw flow. After both lock, either person can open the reveal with its countdown. The other person's answer is withheld from API responses until the reveal is confirmed. The page refreshes status every 15 seconds and when the tab regains focus.

My Creations separates these tool details from personal replies. It shows poll choices and suggestions, submitted Q&A answers and skips, secret lock times, and the receiver's answers after the reveal. Drafts and unrevealed secret answers remain private. Links take the sender directly to the relevant tool in the gift.

## Deployment

Apply `supabase/migrations/20261023225545_poll_questions_secret_details.sql` **before deploying the updated application**. Use the normal migration workflow or execute this file in Supabase SQL Editor. Do not rerun the bootstrap or earlier applied migrations.

This migration repairs recoverable JSON-string answers saved by earlier API versions, protects Q&A draft ownership, validates submitted answers and poll resolutions, preserves question snapshots for future submissions, prevents edits to locked/revealed secrets, and restricts the changed RPCs to the server role. Existing answers are retained. Older submissions cannot recover historical prompts that were never captured.

Apply any still-pending earlier RSVP and voice/venue migrations first, in timestamp order. No new environment variables are needed. This work has not applied changes to the live database or deployed the site.

## Verification

`node node_modules/tsx/dist/cli.mjs --conditions=react-server --test tests/template-activities.test.ts tests/activity-api.test.ts tests/template-poll.test.ts tests/template-question.test.ts tests/template-reveal.test.ts tests/creator-center-data.test.ts tests/creator-center-display.test.ts`

The database tests use an isolated Postgres-compatible database. API tests invoke the real route handlers with fixture credentials and an intercepted RPC transport, including checks that JSON arguments remain objects/arrays and that public template payloads omit private sender answers.

For browser checks, start a local production server on port 3105, then run `node scripts/test-activities-browser.cjs`. `CHROME_PATH` and `RSVP_TEST_URL` support another Chrome installation or local port. All API requests use fixtures; production hosts are refused. The script exercises all six themes at 1440px and 390px, including poll selections and suggestions, failed saves, Q&A draft restoration/review/skipping, secret withdrawal and sender reveal, and My Creations details. Mobile screenshots are saved in `.next/activity-audit`.

These checks do not create live orders, mutate the production database, or send email.
