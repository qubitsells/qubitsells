# Profile security controls

The personal profile now has an **Account security** section with password reset and account deletion. The layout stacks on mobile, uses the existing cyan theme, supports keyboard focus, and respects reduced-motion settings. Couple profile and personal profile remain separate.

## Activate on production

1. Apply `supabase/migrations/20261020223922_account_deletion.sql` in your Supabase SQL Editor after the existing migrations. The new API deliberately refuses account deletion until this safety migration is installed. This prevents the old foreign-key cascades from deleting a surviving partner's personal capsules.
2. In Supabase **Authentication → URL Configuration**, keep Site URL `https://qubitsells.com` and these redirect allowlist entries:

   ```text
   https://qubitsells.com/auth/callback
   https://qubitsells.com/auth/callback?next=**
   ```

   Password recovery uses the existing PKCE callback with `next=/reset-password`; it does not require a new Google OAuth redirect URI.
3. Enable the Supabase email/password provider. For customer email delivery configure **Authentication → SMTP Settings** with your production mail service and a verified sender. Supabase's built-in email service has delivery restrictions and is intended for testing. Check your **Reset Password** email template: keep its `{{ .ConfirmationURL }}` link so Supabase can verify the recovery token before returning to the app. Do not replace it with a plain `/reset-password` URL.
4. Keep `NEXT_PUBLIC_BASE_URL=https://qubitsells.com` and your matching Supabase URL/public key in Vercel Production. Deletion also needs the existing server-only `SUPABASE_SERVICE_ROLE_KEY`; rate limiting and recovery depend on your existing server configuration. Preserve the encryption key and other existing server variables.
5. Deploy the updated code. No live account is deleted by installing the code or migration. Real email and deletion testing must use a disposable test account.

## Request origin troubleshooting

If a deployment reports **Request origin is not allowed**, confirm Vercel Production has `NEXT_PUBLIC_BASE_URL=https://qubitsells.com` and redeploy the current code. API origin checks accept the actual domain and port serving the request, including `www` and preview deployments, rather than allowing the canonical base URL to override them. Cross-site requests and missing/invalid Origin headers are still rejected. An origin error no longer incorrectly asks the user to sign in again.

## Password reset behavior

- Profile: **Send password reset email** sends a recovery link to the signed-in account's address.
- Login: **Forgot your password?** opens `/reset-password`, where signed-out users can request an email without revealing whether the address is registered.
- Open the email link in the browser that requested it. PKCE binds the recovery to that browser's verifier cookie.
- After the callback establishes the session, the reset page accepts matching passwords of 8–128 characters and verifies the current user with Supabase before submitting the change. Supabase's configured password rules still apply.
- Signed-in users can also change their QubitSells password on that page. This does not change a linked Google account's password.
- Expired/invalid links return to sign-in with a retry message. Use **Forgot your password?** to request another email.

## Account deletion behavior

The confirmation explains the permanent effects before showing email and `DELETE` fields. The server verifies the user, requires a sign-in within ten minutes, validates both confirmations, rejects caller-supplied user IDs, checks the same-origin request, and rate-limits attempts. Older sessions receive a **Sign in again to continue** action that works with either Google or email sign-in.

After checking the migration, the server revokes the user's refresh sessions and calls the Supabase admin deletion API. The app then clears its local session and shows a deletion confirmation on the login page. Already-issued JWTs may remain cryptographically valid until expiry, but the auth user and its app records are removed, and this app's authenticated server operations verify the user with Supabase.

The database trigger runs within the auth user's deletion transaction. It removes the account's templates and recipient interactions, capsules, profile, order history, reviews, wishlists, and notifications. It closes shared calendar plans and deletes shared capsules. If a partner survives, their account, purchases, wishlist, and personal capsules remain. Their existing Couple Space becomes unconnected with a rotated invitation code and cleared shared settings.

Cloudinary asset records are marked for deletion before their parent records disappear, including recipient uploads attached to the deleted templates. Cleanup starts after the request and the existing cron retries failures. Media deletion from the external provider may take time; browser downloads and recipient copies cannot be recalled. Stripe may retain its own payment records; account deletion does not refund purchases or cancel external transactions. Use the payment provider's separate refund/support flow when needed.

## Verification

Automated checks use an isolated PostgreSQL-compatible database and fixture HTTP responses against the real Supabase SDK. They test both partner positions, unpaired accounts, access restrictions, cleanup queue retention, recent sign-in and confirmation guards, session revocation order, and recovery redirects. They do not delete a real account or send a real recovery email.

Production smoke test: use a disposable account, request/reset its password, verify sign-in, then delete it through the confirmation. Check Supabase Auth, the removed app records, and the surviving partner's personal capsules if testing a connection. Do not use a real customer account for this check.

References: [Supabase password recovery](https://supabase.com/docs/guides/auth/passwords), [production email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [admin user deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [user deletion and token behavior](https://supabase.com/docs/guides/auth/managing-user-data).
