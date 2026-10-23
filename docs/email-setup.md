# Spacemail transactional email setup

The app sends order confirmations, order-status updates, review invitations, template activity summaries, and shared-calendar requests/responses from `support@qubitsells.com`. It uses the same events as the website notification inbox. Private replies, answers, capsule contents, payment card details, and creator-management tokens are not put into emails.

## 1. Apply the database migration

In the Supabase project used by the live site, open **SQL Editor**, paste and run the complete contents of:

[`../supabase/migrations/20261023002021_notification_email_outbox.sql`](../supabase/migrations/20261023002021_notification_email_outbox.sql)

The earlier commerce/calendar migrations must already be installed. This adds a server-only outbox, an insert trigger, and two worker functions. It does not send emails or backfill existing notifications. New notifications created after the migration queue one delivery each. Account/notification deletion cascades to their delivery records.

## 2. Add the Vercel Production environment variables

In **Vercel → your project → Settings → Environment Variables**, add:

```dotenv
EMAIL_DELIVERY_ENABLED=true
SMTP_HOST=mail.spacemail.com
SMTP_PORT=465
SMTP_USER=support@qubitsells.com
SMTP_FROM=support@qubitsells.com
SMTP_PASSWORD=YOUR_MAILBOX_PASSWORD
```

Use the actual mailbox password as the value of `SMTP_PASSWORD`. Do not include surrounding quotes in the Vercel value and do not send the password in chat. These variables must never have a `NEXT_PUBLIC_` prefix. Keep the existing `SUPABASE_SERVICE_ROLE_KEY`, strong `CRON_SECRET`, and production `NEXT_PUBLIC_BASE_URL` configured.

Set these for **Production**, then deploy/redeploy the updated app. Leave email delivery disabled in Preview/local environments unless intentionally testing: those environments may share the production Supabase database and would otherwise be able to deliver real queued emails.

Spacemail documents `mail.spacemail.com`, port **465**, SSL/TLS, and the full mailbox address as the username. IMAP/POP3/SMTP access must be enabled in Spacemail Manager. The app also supports **587**, using required STARTTLS automatically; never disable certificate validation. [Spacemail connection settings](https://www.spaceship.com/knowledgebase/connect-spacemail-to-email-client/), [Nodemailer SMTP settings](https://nodemailer.com/smtp)

Verify Spacemail's SPF, DKIM, and DMARC records in the domain's authoritative DNS settings. If DNS is hosted elsewhere, copy the values supplied by Spacemail Manager. [Spacemail setup and DNS](https://www.spaceship.com/knowledgebase/getting-started-with-spacemail/)

## 3. Verify and request a test email

For local checks, put the same SMTP settings in ignored `.env.local`, temporarily enable delivery, and run:

```powershell
npm run email:verify
```

This checks the SMTP connection, TLS, and authentication without sending a message or draining the database queue.

To explicitly send one sample email to your own mailbox:

```powershell
npm run email:test -- support@qubitsells.com
```

Check both inbox and spam. SMTP acceptance is not a guarantee of final inbox placement. Disable local email delivery again before browsing a local app connected to the live database.

Test order emails are marked **[Test]** and state that no real payment was taken. A production order confirmation is queued only after the server confirms payment; visiting a checkout-success URL cannot generate a paid receipt by itself.

## 4. Automatic processing and optional database webhook

Successful checkout/Stripe, template-response, calendar, and review-invitation routes schedule delivery with Next.js `after()`. Sending happens after the response, so an SMTP failure does not reverse a completed payment or interaction. The existing daily `/api/templates/cleanup` cron also retries due emails; the Vercel Hobby cron remains once per day.

For notifications inserted outside those application routes, configure a Supabase **Database Webhook**:

- Name: `qubitsells-notification-email`
- Table: `public.notification_email_outbox`
- Event: **INSERT** only
- Method: **POST**
- URL: `https://www.qubitsells.com/api/notifications/email`
- Header `Content-Type`: `application/json`
- Header `Authorization`: `Bearer YOUR_EXISTING_CRON_SECRET`

Use the canonical deployed hostname so the POST does not redirect. Keep the authorization header private. The endpoint ignores supplied recipients/content and only processes trusted queued events. Do not point the webhook at outbox UPDATE events, which would create a retry loop. [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)

The webhook is optional for normal app actions. Transient failures retry with backoff when another action/webhook or the daily cron runs. If retries must happen within minutes even when nobody is using the site, have an external scheduler call this protected endpoint or use a hosting plan that permits a more frequent cron. Do not add a subdaily Vercel Hobby cron. [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## 5. Configure Supabase Auth email separately

Application environment variables do not configure Supabase's hosted authentication mailer. For signup confirmations and password-reset emails, open **Supabase → Authentication → Email → SMTP Settings** (or the project's Authentication custom SMTP settings), enable custom SMTP, and save:

| Setting | Value |
| --- | --- |
| Sender email | `support@qubitsells.com` |
| Sender name | `QubitSells` |
| Host | `mail.spacemail.com` |
| Port | `465` |
| Username | `support@qubitsells.com` |
| Password | Your mailbox password |

Keep email confirmation enabled and preserve the existing Site URL/allowed redirect URLs. Review Auth's email rate limits against the mailbox plan. Request a password reset for your own verified account to test the hosted Auth mailer. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Monitoring and recovery

In Supabase SQL Editor, inspect counts without exposing recipient addresses:

```sql
select status, count(*) from public.notification_email_outbox group by status;
select notification_id, attempts, last_error, next_attempt_at
from public.notification_email_outbox
where status in ('queued', 'failed') order by next_attempt_at limit 50;
```

Rows use short error codes instead of raw SMTP/provider messages. Only the service role can claim/finish deliveries; public and signed-in clients cannot read or edit the outbox. Each worker claims jobs atomically with a lease, and retrying a Stripe event does not create a second notification email. Stable Message-IDs help identify delivery attempts. SMTP does not offer an exactly-once guarantee: a process failure after the provider accepts a message but before its database acknowledgement can cause a repeat on recovery.

After fixing a configuration problem, an operator can retry a specific failed job:

```sql
update public.notification_email_outbox
set status='queued', attempts=0, next_attempt_at=now(), last_error=null,
    lease_token=null, locked_until=null
where notification_id='REPLACE_WITH_THE_NOTIFICATION_UUID'::uuid and status='failed';
```

Then invoke the protected delivery endpoint with the cron secret, or let the next background run process it. Delivery stops after six failed attempts until an operator retries. Unverified/missing accounts and obsolete activity are skipped. Existing `profiles.email_reminders=false` suppresses activity/review emails; order receipts/status updates remain transactional. No mailing list or promotional campaign is added.
