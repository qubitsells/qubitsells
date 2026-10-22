# Local sign-in and Stripe testing

## Keep sign-in on localhost

The app builds Google OAuth callbacks from the browser's current origin. Supabase must allow that exact local callback; otherwise authentication can return to the configured production Site URL. A production redirect also loses the local browser's host-only PKCE cookie.

In **Supabase → Authentication → URL Configuration → Redirect URLs**, keep the existing production entries and add:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=**
```

Keep **Site URL** set to the live website. Do not change the shared project's Site URL to localhost. The first entry handles Google sign-in; the second handles email confirmation and password reset returns. [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)

In **Google Cloud → Google Auth Platform → Clients → your web client → Authorized JavaScript origins**, add `http://localhost:3000` alongside the production origins. Google's authorized redirect URI remains the Supabase project's `/auth/v1/callback`, as shown in its Google provider settings.

Use `http://localhost:3000` consistently when starting and finishing sign-in. If Next starts on a different port, add matching callbacks/origins for that port. `127.0.0.1` and `localhost` are different cookie hosts: if you use the IP instead, allow its exact callback too. A separate development Supabase project is also supported; configure the provider in the project actually used by `.env.local`.

## Local environment

In the ignored `.env.local` file:

```dotenv
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STRIPE_MODE=test
STRIPE_SECRET_KEY=YOUR_TEST_SECRET_OR_RESTRICTED_KEY
STRIPE_WEBHOOK_SECRET=YOUR_LOCAL_STRIPE_LISTENER_SIGNING_SECRET
```

Keep the project's existing Supabase and other required server variables. Use an `sk_test_` or `rk_test_` key from the intended test account/sandbox. Never put Stripe secret keys or webhook secrets in a `NEXT_PUBLIC_` variable. Vercel Production keeps its own live configuration. Restart `npm run dev` after changing `.env.local`.

New local checkouts return to the local host and port, even if a production base URL was accidentally copied into local configuration. Existing Stripe Checkout Sessions retain their original success/cancel URLs. If an old pending **test** session still returns to production, expire that test session in Stripe and retry the same pending order; the app renews an expired session without creating another order.

## Receive test payment webhooks

In a separate terminal, authenticate the Stripe CLI to the same test account as the local key:

```powershell
stripe login
stripe listen --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,charge.refunded --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the listener's `whsec_...` value into the local `STRIPE_WEBHOOK_SECRET`. This is the CLI listener secret, not the live dashboard webhook secret. Restart the development server and keep the listener running while testing. Do not add `--live`. [Stripe local webhook testing](https://docs.stripe.com/webhooks)

## Test templates

1. Start at `http://localhost:3000`, sign in, and confirm the address stays local.
2. Open any product, choose a duration, and continue to test checkout.
3. Use card `4242 4242 4242 4242`, any future expiry, and any three-digit CVC. Use test card details only. [Stripe test payments](https://docs.stripe.com/testing)
4. Confirm you return to localhost, the order becomes paid, and personalization/publishing is available. Repeat with other templates and durations.

The application separates test and live payment records and rejects key/mode mismatches. If both environments use the same Supabase project, accounts and other application content still share that database; Stripe test mode does not create a separate database.
