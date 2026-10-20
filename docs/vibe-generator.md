# Vibe Generator

The generator is available in Couple Space under Vibe Generator (`/couple-space/date-ideas`) and through the floating button on the Couple Space overview. The existing `#vibe-check` and `open-vibe-check` entry points still open the generator.

Users must sign in and have a connected partner. Both the UI and the POST `/api/couple/vibe` route check this. The route verifies the signed-in user, request origin, current couple membership, partner presence, and a generation rate limit. It reads membership with the authenticated Supabase client and RLS. A client-supplied connection flag cannot grant access.

The user chooses a mood, home/out setting, 30/60/120 minutes, and a budget preference. The server builds a plan from curated activities, adapts the pacing and budget guidance, and avoids immediately repeating the same idea. It does not use an external AI provider, location service, or reservation service. It makes no claim to unlock coordinates or book a venue.

A result includes three timed steps, items to bring, a conversation question, and budget guidance. Copying the plan writes to the user's clipboard. Generating or copying does not notify the partner or create a calendar event.

To propose a plan, the user opens the schedule form, chooses the day, start time, and time zone, then explicitly sends the plan request. The existing calendar API stores it as a pending request and notifies the partner. Date/time rollover preserves the chosen floating event time zone. A stable event UUID and a retained request body prevent network retries from creating another event or silently changing the request details.

No new database migration or API key is required. Calendar proposals depend on the existing shared calendar and plan confirmations migrations described in `shared-calendar-setup.md`.

Tests cover generation constraints, nonrepeating choices, date rollover, connection gating with real Supabase query builders, authenticated RLS membership checks in PGlite, and rendered guest/solo/connected/result states.
