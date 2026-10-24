# Sender answers during setup

New gifts collect the sender's side before publishing in all six template editors:

- Vibe Check & Poll requires the sender's own choice for a two-person poll.
- Heart-to-Heart Q&A requires the sender's answer to every configured question.
- Synchronized Secret requires the sender's private answer to every configured prompt. Publishing locks those answers and marks the sender ready for the reveal.

Disabled tools require no response. Receiver-only polls need no sender vote. The editor blocks continuation with a clear message, and the publication API validates the same requirements.

Publication saves these responses and fulfills the purchase in one database transaction. Invalid answers roll back the gift and leave the paid order available to try again. Sender choices and secret answers are removed from the publicly returned tool configuration. Q&A answers remain hidden according to each question's reveal mode; secret answers remain hidden until the receiver completes the reveal.

Opening a new gift as its sender shows the already saved answers without asking for another submission. A receiver can finish the tools without waiting for the sender to reopen the gift. Later decisions such as confirming a suggested date or resolving different poll choices remain available.

Existing gifts retain their previous response flow; missing historical answers are not invented or backfilled.

## Database rollout

Apply pending migrations in timestamp order, including `supabase/migrations/20261024025304_sender_setup_responses.sql`, before deploying this application change. This migration depends on the preceding activity-tool migrations. Do not rerun `bootstrap.sql` on an existing database.

No new environment variables are required. Development tests use an isolated PGlite database and intercepted browser requests; they do not modify the live database.

## Verification

- `tests/sender-preparation.test.ts`: actual publication RPC for all six products, response privacy, receiver completion, immutable prepared answers, permissions, rollback and purchase reuse.
- `tests/sender-publish-api.test.ts`: API validation before order fulfillment and setup fields retained through schema parsing.
- `scripts/test-sender-setup-browser.cjs`: six editors and received gifts at desktop and mobile widths, with local fixtures.
