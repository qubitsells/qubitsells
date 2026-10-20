# Couple Space

Couple Space is a dedicated area, separate from the personal profile and commerce account. Enter from the main navbar, the My account dropdown, or the optional Couple Space link in the personal account sidebar.

| Page | Purpose |
| --- | --- |
| `/couple-space` | Overview, connected partners, anniversary, shared message, tools, upcoming plans, and pending plan requests |
| `/couple-space/profile` | Couple profile, invitation review, partner connection, relationship settings, and disconnect |
| `/couple-space/calendar` | Shared plans and partner confirmation requests |
| `/couple-space/time-capsules` | Shared capsules only; new capsules use couple mode |
| `/couple-space/date-ideas` | Date inspiration, copyable ideas, and access to the shared calendar |

Every couple page has the same Couple Space navigation and a Personal account link. The personal profile retains account details, purchases, wishlist, and reviews. The existing `/time-capsule` collection remains available for personal capsules and the optional combined collection.

Visiting Couple Space never creates a couple or accepts an invitation. The shared capsule workspace opens only for authenticated users with a connected partner. Capsule creation, sealing, opening, and permissions use the existing workflows. Private capsule drafts retain their existing visibility rules.

The overview uses the existing authenticated calendar API for its plan preview and request counts. It refreshes on focus and every 20 seconds while visible. Calendar errors are displayed instead of inventing empty counts. The calendar still requires the migrations described in `shared-calendar-setup.md`; this navigation and workspace change requires no additional migration.

Couple routes have noindex metadata and headers, are excluded from the sitemap, and are disallowed in robots.txt.
