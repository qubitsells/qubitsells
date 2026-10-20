# Shared couple calendar

The calendar lives at `/couple-space/calendar`. It is linked from Couple Space, the My account dropdown, and the optional Couple Space area of the profile sidebar. Individual accounts remain independent of Couple Space.

## Enable the database

Apply `supabase/migrations/20261020020613_shared_couple_calendar.sql` once in the configured Supabase project, after the existing migrations. Then apply `supabase/migrations/20261020023219_calendar_plan_confirmations.sql` once. If the base calendar migration is already installed, run only the new confirmations migration. Do not rerun the original storefront commerce migration. This migration adds one calendar table, a service-only mutation function, indexes, a connected-pair read policy, and optional Realtime publication membership. The confirmations upgrade adds request/response audit fields, calendar notifications, and notification Realtime support. Existing active plans become requests because their previous status did not record the other partner’s consent.

The migration has been exercised against all repository migrations in an isolated PGlite database. It has **not** been applied to the hosted project: the current CLI account cannot retrieve the project status because it lacks the necessary privileges. Query/advisor access also requires the linked IPv4 pooler on this network. An authorized project owner can use the Supabase SQL Editor or the normal database migration workflow. Run the Supabase security advisors after applying it.

## What partners can do

- Add a date, outing, trip, celebration, or other plan.
- Choose start/end dates, timed or all-day plans, and an explicit time zone.
- Add a location and shared notes. New plans are requests, never self-confirmed.
- The other partner receives an in-app notification and can confirm or decline on the calendar. The sender sees “Waiting for your partner”; the recipient sees “Awaiting your response”.
- A request inbox shows incoming plans across all months. The notification link opens the plan’s current date even if it has been rescheduled.
- Changing dates, times, title, category, location, notes, or time zone asks the other partner to confirm again.
- Mark agreed plans completed, or cancel a plan. A cancelled or already answered request cannot be accepted.
- Either partner may edit or remove a plan. Removal has a confirmation step.
- View the month or a chronological agenda. The month view includes an agenda for the selected day.

Dates and times are displayed in the event's chosen time zone for both partners, rather than being converted to each device's zone. Multi-day plans use inclusive end dates. Event duration is limited to 366 days and supported dates run from 2000 through 2100.

## Privacy and synchronization

The browser may read plans only through RLS while the same two partners remain connected. It has no direct write grants. The application revalidates the signed-in user, membership, request origin, and input before a service-only SQL function checks membership again under a couple-row lock. A version check prevents overwriting a partner's newer edit. A stable event UUID makes a retried creation idempotent.

Events capture the original pair. A replacement partner cannot see old plans even if a couple ID is reused. Deleting the former shared couple during disconnection cascades to its calendar events. No event titles, notes, or locations are included in notifications. Calendar notifications use authenticated reads and are hidden if the original pair changes. Removing a plan or disconnecting cascades to its notifications.

Supabase Realtime changes trigger a fresh authenticated read. A 20-second visible-page poll and focus refresh provide a fallback. On denied access, the application clears plans and closes the editor. The header notification bell also subscribes to notification changes, with a 30-second fallback. Calendar writes require both database migrations; failures are shown explicitly rather than saving to browser-only storage.

The calendar does not send email, push alerts, booking requests, or messages to external calendars.

## Verify after enabling

1. Connect two test accounts using the existing Couple Space invitation flow.
2. Open the calendar in both accounts and create a plan, including location and notes.
3. Check the recipient’s bell and Notifications page. Click “Review plan”, confirm the request, and verify both accounts see “Confirmed together”. The sender must not see approval buttons.
4. Edit the location or time and check that fresh confirmation is required. Decline a request, then revise it and request confirmation again. Cancel a pending plan and verify it cannot be approved.
5. Open the same plan in both accounts, save one edit, then try to save the older form. Confirm the older edit is rejected and its draft is preserved until the form is closed.
6. Check all-day, overnight, multi-day, and cross-month plans.
7. Verify an unrelated account cannot read or change an event by ID.
8. Disconnect and verify the former pair's calendar and calendar notifications are no longer accessible.

Automated coverage: `tests/calendar.test.ts` verifies validation, RLS, write grants, recipient-only confirmation, notification deduplication, re-approval after edits, declines, optimistic conflicts, retries, partner changes, and notification cleanup. `tests/calendar-display.test.ts` renders the actual page, calendar cells, cards, and editor using isolated fixture sessions.
