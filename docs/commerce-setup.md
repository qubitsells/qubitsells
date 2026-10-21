# QubitSells commerce setup

QubitSells supports live Stripe-hosted payments in production and a separate test configuration for development. Set production credentials using the Production section below. Checkout requires valid configuration and access to the commerce tables. Customer-facing pages use normal purchase wording and the active support address, support@qubitsells.com. Test-payment notices appear only when checkout is actually configured for test payments; historical test orders and reviews retain their labels.

## Database

Apply `supabase/migrations/20261019215057_storefront_commerce.sql` to the same Supabase project configured in `.env.local`, after the existing migrations. The migration adds individual-account orders, wishlists, verified reviews, notifications, service-only publishing/review functions, and activity triggers. It does not delete existing templates or change their expiry.

An authorized project owner can apply missing migrations through the normal migration workflow or Supabase SQL Editor. An existing store with the commerce migration already applied does not need to rerun it to enable live Stripe payments. The migration is tested against the existing schema migrations with PGlite.

## Stripe test configuration

For other environments, add these server-only values to `.env.local` or the hosting environment (see `.env.example`):

```dotenv
STRIPE_MODE=test
STRIPE_SECRET_KEY=sk_test_your_actual_test_secret
STRIPE_WEBHOOK_SECRET=whsec_your_actual_signing_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Use actual Stripe test credentials; the example values do not enable checkout. Restart the development server after editing configuration. No publishable key is needed because checkout is hosted by Stripe. Never prefix either secret with `NEXT_PUBLIC_` or commit secrets to source control.

Forward these Stripe events to `/api/stripe/webhook`:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

For local testing, use Stripe CLI forwarding and its signing secret. A Dashboard endpoint has a different signing secret. Follow [Stripe’s checkout fulfillment guide](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted).

## Verify the experience

1. Sign in with a test customer account and open `/products/halloween-pumpkin-moon`.
2. Save it to the wishlist and confirm it appears in `/profile?view=wishlist`.
3. Choose a duration: 3 days = $2; 7 days = $3; 30 days = $3.49.
4. Complete the **test** checkout using Stripe’s documented test card `4242 4242 4242 4242`, a future expiry, and any valid test CVC. Never use a real card for testing.
5. Confirm the signed webhook and checkout return produce one paid order. Replaying the event must not duplicate the order or its notification.
6. Select View My templates after checkout, or use My templates in the navbar. Confirm that only paid purchases appear, with All purchases, Ready to personalize, and Published filters. Select Personalize template and publish. The chosen lifetime starts on publication. The order can create only one link, even if the template is later deleted or expires. Pending and refunded checkouts remain in My orders for payment history.
7. Open Quick review from the order, product page, success page, or review invitation. Choose 1–5 stars, a title, and your experience. An unpaid account must be denied by the API. Test reviews are labelled and excluded from live ratings. In `/profile?view=reviews`, confirm that purchased templates awaiting review and your submitted feedback appear separately, with edit/remove controls for eligible purchases.
8. Submit a recipient reply and a completed question response. Confirm the creator receives activity notifications; private drafts and unrevealed answers must not appear in notifications.
9. A duplicate-safe review invitation is saved immediately after payment confirmation. The next notification fetch also fills in invitations for existing paid purchases without a review. Its Quick review action opens the matching template’s form in My reviews. Saving a review marks matching invitations as read and refreshes the notification bell. The bell refreshes while the browser is visible. Notifications are in-app; no email or push integration is included. These additions use the existing commerce tables and need no new SQL migration.

## Continuing an unpaid order

My orders shows **Complete payment** on pending orders and **Retry payment** on expired checkouts. Both submit the existing order ID to the authenticated checkout endpoint. An open Stripe session is reused; an expired session is replaced on the same order with a new, stable Stripe idempotency key. Cancelling checkout returns to that order in My orders. A completed payment is reconciled before returning to the success page, and an already-paid order opens personalization without another charge.

Buying the same product and duration from its product page also reuses a matching pending order in the current payment mode. Other users’ orders, refunded orders, and orders in a different payment mode cannot be resumed. Server-side prices and purchased durations remain authoritative.

Regression coverage in `tests/checkout-resume.test.ts` uses isolated Supabase/Stripe HTTP fixtures, including concurrent retries and a failed database attachment. These checks do not charge a card or modify an external account.

## Production

Keep test mode during development. Live checkout requires explicit `STRIPE_MODE=live`, matching live credentials and webhook, the real HTTPS `NEXT_PUBLIC_BASE_URL`, and a completed live-store setup. Test orders and reviews remain separate. Full refunds revoke unused publishing access and exclude the linked review from public results. Partial refunds are recorded on the order.

In Vercel, set these variables for **Production** and redeploy the latest code:

```dotenv
STRIPE_MODE=live
STRIPE_SECRET_KEY=rk_live_your_actual_restricted_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_live_endpoint_signing_secret
NEXT_PUBLIC_BASE_URL=https://qubitsells.com
```

`STRIPE_SECRET_KEY` accepts either a restricted key (`rk_live_` / `rk_test_`) or a secret key (`sk_live_` / `sk_test_`) matching `STRIPE_MODE`. Keep this variable server-only regardless of key type. Restricted keys authenticate the same way, but Stripe enforces the permissions assigned to them. The app creates and reads Checkout Sessions with inline product/price data, and reads PaymentIntents with their latest charge. A key configured with **Full access—except sensitive operations** covers the current integration; custom permissions must cover those operations and their referenced resources. The app does not request payouts or transfers. [Stripe restricted-key documentation](https://docs.stripe.com/keys/restricted-api-keys).

Create the production webhook in Stripe's live account with **Snapshot** payloads, the event list above, and endpoint `https://qubitsells.com/api/stripe/webhook`. Use that endpoint's signing secret rather than a sandbox or CLI signing secret. A different key type alone does not require a database migration. `/api/checkout` reports the configured mode and whether credentials have an accepted format and commerce storage is accessible; this availability check does not verify the key's actual Stripe permissions.
