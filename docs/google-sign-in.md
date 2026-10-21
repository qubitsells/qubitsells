# Activate Google sign-in for QubitSells

The app has a **Continue with Google** button on `/login` and `/signup`. It uses Supabase's cookie-based PKCE flow. New users get an individual account; Couple Space remains optional. Checkout destinations and couple invitation review pages survive sign-in and retries. Google Cloud and Supabase provider configuration must be completed before customers can use the button.

## 1. Collect the correct URLs

The local configuration currently points to the Supabase project below. Confirm it is also the project used by your Vercel **Production** environment before copying these values. If it differs, copy the callback from that project's Google provider panel instead.

| Setting | Value |
| --- | --- |
| Public website / Supabase Site URL | `https://www.qubitsells.com` |
| Google authorized JavaScript origin | `https://www.qubitsells.com` |
| Google authorized redirect URI (Supabase handles Google's response) | `https://dchlnbscflzaulsqyvdu.supabase.co/auth/v1/callback` |
| App callback (Supabase returns to QubitSells) | `https://www.qubitsells.com/auth/callback` |
| Homepage | `https://www.qubitsells.com` |
| Privacy policy | `https://www.qubitsells.com/privacy` |
| Terms | `https://www.qubitsells.com/terms` |
| Branding authorized domain | `qubitsells.com` |

These two callbacks have different jobs. Google Cloud needs the **Supabase** URL, not the app callback. A custom Supabase auth domain would change Google's callback; copy the URL Supabase displays if you configure one.

## 2. Create the Google Cloud project and consent configuration

1. Sign in at [Google Cloud Console](https://console.cloud.google.com/) with an account you will retain access to.
2. Open the project selector at the top, choose **New project**, name it **QubitSells Production**, and create/select it.
3. Search for **Google Auth Platform**. Older console links may say **APIs & Services → OAuth consent screen**.
4. Click **Get started** if prompted. Enter **QubitSells** as the app name. Use the active support address `support@qubitsells.com` where the console allows you to select it, and enter your developer contact email.
5. Choose **External** so customers outside your own Google Workspace can sign in. Complete Google's required acknowledgments and save.
6. In **Audience**, add your Google account under **Test users** for initial testing. Keep any testing audience restrictions in mind; publish for public access after verification/testing.
7. Open **Branding** and enter the homepage, privacy policy, terms, and authorized domain from the table above. Use a legible QubitSells logo if you want branded consent. Verify all three pages open without signing in and that the support contact is `support@qubitsells.com` before submitting branding for review.
8. Open **Data Access → Add or remove scopes**. Select only:

   ```text
   openid
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

   Save. This implementation uses basic identity information, so Gmail, Drive, Contacts, and Calendar permissions are unnecessary. QubitSells' shared calendar remains an app feature, independent of Google Calendar. [Google consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent), [Supabase Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 3. Create the OAuth client

1. Open **Google Auth Platform → Clients → Create client**.
2. Select **Web application**. Name it **QubitSells Website**.
3. Under **Authorized JavaScript origins**, add `https://www.qubitsells.com`. Origins have no path.
4. Under **Authorized redirect URIs**, paste:

   ```text
   https://dchlnbscflzaulsqyvdu.supabase.co/auth/v1/callback
   ```

5. Create the client. Save the **Client ID** and **Client secret** securely while Google displays them. The secret may not be available to view again later. Both values must come from this same client. [Google web OAuth client documentation](https://developers.google.com/identity/protocols/oauth2/web-server).

## 4. Enable the provider in Supabase

1. Open the matching [Supabase project](https://supabase.com/dashboard/project/dchlnbscflzaulsqyvdu).
2. Open **Authentication → Sign In / Providers → Google** (some dashboard versions show **Providers** directly).
3. Enable **Sign in with Google**.
4. Paste the Google **Client ID** into **Client IDs** and its matching **Client secret** into **Client Secret**.
5. Compare the callback Supabase displays with the redirect URI you saved in Google Cloud. Correct any mismatch.
6. Keep nonce checks enabled; no nonce bypass or manual account-linking setting is required for this flow.
7. Save. The Google secret is stored here, not in the app's public environment variables. [Supabase Google integration](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 5. Set Supabase URL Configuration

In **Authentication → URL Configuration**:

1. Set **Site URL** to `https://www.qubitsells.com`.
2. Add these **Redirect URLs**, one per entry:

   ```text
   https://www.qubitsells.com/auth/callback
   https://www.qubitsells.com/auth/callback?next=**
   ```

3. Save. Google uses the fixed `/auth/callback` URL; the selected product and link duration are stored in a host-only, ten-minute return cookie and consumed by the callback. The second entry supports email confirmation/sign-in links with a return destination. Keep the hostname and callback path constrained; do not add unrestricted third-party domains. Production redirects the apex domain to `www.qubitsells.com`, so begin sign-in on `www`. If both hosts are ever served independently, add `https://qubitsells.com/auth/callback` and `https://qubitsells.com/auth/callback?next=**` too. This keeps the browser's PKCE cookie on the same host throughout sign-in. [Supabase redirect rules](https://supabase.com/docs/guides/auth/redirect-urls).

If sign-in leaves `?code=...` on the homepage, check that the exact `https://www.qubitsells.com/auth/callback` entry above is saved. Supabase can fall back to the Site URL when the requested callback is not allowed. The app also relays homepage auth codes to its server callback even when the navigation cookie is absent. PKCE verification still applies: an expired or invalid code returns to sign-in without putting the raw code into the retry URL. The navigation cookie chooses the destination; it does not authorize sign-in. No Supabase/Google secrets need to change to correct a redirect allowlist.

For optional development, use separate development Google/Supabase projects. In that Supabase project allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=**`, and configure its displayed Supabase callback in the development Google client. Google's production OAuth client should contain production origins only. Preview deployments need their own matching Supabase redirect entries and preview environment variables. [Google production configuration policy](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance).

## 6. Set Vercel variables and redeploy

Open **Vercel → your QubitSells project → Settings → Environment Variables**. For **Production**, set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://dchlnbscflzaulsqyvdu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_BASE_URL=https://www.qubitsells.com
```

Find the URL and publishable key in your Supabase project's **Connect** dialog or **Project Settings → API Keys**. Existing deployments may keep `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of the publishable-key variable; either is supported. If both are set, the publishable key takes precedence. Ensure the key and URL belong to the same Supabase project. Public keys are intentionally browser-visible; service-role keys and Google client secrets must never use a `NEXT_PUBLIC_` name. [Supabase SSR client configuration](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Leave your other existing server-only variables in place. Google sign-in needs no new database migration and no `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, or Google SDK configuration in this app.

Deploy the updated code to Vercel. After changing variables, use **Deployments → latest production deployment → Redeploy**, or push the implementation through your normal deployment process. Values in your local `.env.local` are not automatically uploaded. Public variables are included at build time, so an old deployment will not pick up new values until rebuilt. [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 7. Verify branding and open sign-in to customers

For branded public sign-in, verify ownership of `qubitsells.com` in [Google Search Console](https://search.google.com/search-console): add a **Domain** property, copy Google's TXT record into the domain's DNS provider, and verify. The verifying Google account should also have Owner/Editor access to the Cloud project. Use the provider that actually manages your nameservers; Vercel hosting alone does not mean DNS is managed there.

In Google Auth Platform, complete **Branding / Verification Center** prompts and publish approved branding. When ready for customers, use **Audience → Publish app** to move from testing to production. Basic identity scopes do not request sensitive Google API access, but public app name/logo branding can still require verification. Follow the status shown in your console; publishing the audience and verifying branding are separate steps. If consent shows the Supabase project hostname, that is the default hosted auth domain. A custom Supabase auth domain is optional and requires its own setup. [Google brand/domain verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## 8. Run the real sign-in test

1. Open a private browser window and visit `https://www.qubitsells.com/login`.
2. Click **Continue with Google**, choose your test account, and approve.
3. Confirm you return to `/profile`, with your account menu signed in. Refresh and check you remain signed in.
4. Sign out and repeat from `/signup` with an account that has not used QubitSells. Google can create its individual account without a separate QubitSells password.
5. Sign out, open a product page, select the 7-day or 30-day option, and click **Buy & personalize**. Complete Google sign-in and confirm it returns to that exact product with the same duration selected. Continue checkout from there. With Stripe test credentials, the product uses normal purchase wording and shows a test-payment confirmation only when you proceed; real charging still requires live Stripe configuration. A couple invitation should open its review page and must not automatically connect partners.
6. Cancel Google sign-in once; retry from the message shown in QubitSells.
7. In **Supabase → Authentication → Users**, confirm the test user's identity includes Google.
8. After publishing, repeat with an unrelated Google account on mobile. Existing accounts should use the same verified email when testing access to existing purchases; do not create an unrelated account and expect another account's orders to appear.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | Google's redirect URI must exactly match Supabase's callback, including `/auth/v1/callback`, project ref, protocol, and trailing slash behavior. |
| Provider not enabled / unsupported provider | Enable Google in the same Supabase project referenced by Vercel's public URL. |
| `invalid_client` | Recheck the matching Google client ID and secret saved in Supabase. |
| Access blocked / only testers can enter | Check Audience, user type, Workspace restrictions, and any verification/testing notice in Google Console. |
| Redirects to localhost | Supabase Site URL and Vercel production base URL must use `https://www.qubitsells.com`; redeploy after editing Vercel values. |
| Returns to the homepage instead of the selected product | Redeploy the fixed-callback implementation. Check the exact app callback is allowed in Supabase. The app also relays a Site URL fallback code to the callback when its valid return cookie is present. Start sign-in on the same hostname and complete it within ten minutes. |
| Sign-in fails after returning | Start again in the same browser. Do not switch between `www`, apex, preview, or localhost mid-flow. The PKCE verifier cookie must survive. Old codes are single-use; do not refresh/reuse an old callback URL. |
| Vercel build says Supabase URL/key missing | Add the public URL/key to Production variables, then rebuild. Check accidental whitespace, mismatched projects, and environment selection. |

Do not share client secrets, auth codes, session cookies, or raw callback URLs when troubleshooting. The app intentionally displays a generic retry message rather than exposing provider details.
