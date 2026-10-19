# QubitSells storefront redesign — implementation and launch status

Implemented locally in `E:\Desktop Projects\cpltools-app`. The existing development server remains at http://localhost:3000. No deployment or dashboard settings were changed.

## Implemented

- White storefront with the supplied cyan, dark button labels, the supplied cyan QubitSells header monogram and black footer monogram, and original product artwork.
- One hero with exactly Pumpkin Moon Date, Our Little Pink Day, and The Midnight Key. The three video filenames were read from disk and tested, including the literal ellipsis. Each slide updates its video, title, planned price, preview, and specific editor destination together.
- Desktop hero video spans the entire slide behind the product copy, with a continuous light scrim for readability instead of an opaque side panel. Mobile retains the landscape video above its product details.
- The active video autoplays muted after hydration and the carousel rotates automatically every 12 seconds. Backgrounds crossfade over 900 ms; product copy fades as one unit. A real poster stays underneath each video, and video opacity fades in when playback begins. Exiting videos pause during their fade. Hovering controls or focusing an action holds rotation without freezing the background; merely hovering the video does not stop rotation. Manual navigation preserves autoplay, while the pause control, page visibility, and preview dialog pause video playback. Reduced motion initially uses a still image; playing is an explicit action. Arrow keys navigate the hero. Blocked autoplay retains the poster and can be retried with the Play control.
- Native modal artwork previews, a mobile navigation disclosure with Escape handling, and a skip link. Mobile moves the product information below the landscape video.
- Six real template cards and populated All, Celebrations, Romance, and Halloween filters. Birthday and Thank You are omitted because no verified suitable products are available. The original scenic editor remains linked from the catalog.
- Numbered creation steps, four working local interaction examples, a restrained Couple Space panel, six accessible native FAQ accordions, closing action, and public footer links.
- Reply, scratch, choice, and invitation examples never call the real response APIs. They are labeled Example and have local reset controls.
- `/couple-space` links to the existing private profile and time capsule flows and preserves the working Vibe Check generator. Unsupported calendar/notification demonstrations are not presented as real functionality.
- Public `/about`, `/contact`, `/privacy`, `/terms`, and `/refund-policy` pages based on the implemented data and access flows. No invented company suffix or refund guarantee.
- Production metadata uses the owner-provided intended domain `https://qubitsells.com`; production deployment must set `NEXT_PUBLIC_BASE_URL` accordingly. Public template editors have distinct metadata and canonicals. Structured data is WebSite and catalog ItemList, without fake reviews or live paid offers.
- Public-only sitemap, robots exclusions, and no-index metadata/headers for recipient, account, and API routes. Existing server authorization and consent mechanisms are preserved.
- Self-hosted copies of the same cached Geist, Geist Mono, Playfair Display, and Cinzel Decorative fonts, with their official Open Font License notices. This fixes builds that could not reach Google Fonts.

## Pricing and payments

The owner confirmed QubitSells as the operator name and these prices per template: $2 USD for links lasting up to 3 days, $3 USD for 7 days (base + $1), and $3.49 USD for 30 days (base + $1.49). Stripe is the intended payment provider. Displayed prices are explicitly labeled **planned launch pricing**. Paid checkout is **not live**.

The source has no existing checkout integration, Stripe configuration, or payment-backed fulfillment to reuse. Existing free editor/create/share behavior remains intact. Buttons lead to the chosen product's real editor; they do not charge, create an order, or claim payment success. Duration prices are recorded centrally in integer USD cents in `lib/storefront.ts`. Paid sales require server-validated duration pricing, real Stripe Checkout, verified and idempotent payment fulfillment, cancellation handling, and end-to-end testing before enabling them. Do not assume that displaying the planned price enforces payment.

## Verification

- Existing suite: 58 tests passed, including recipient tools, expiry, creator deletion, consent, and private access.
- Added storefront contracts: 3 tests passed, covering exactly three video/product mappings, real artwork and editors, populated filters, and exclusion of private content from the sitemap.
- Type checking passed.
- Production build passed after self-hosting the existing fonts.
- The new storefront files passed scoped ESLint. Full-project ESLint reports existing errors and warnings in older editors/tools/tests; the three new link errors from the first pass were corrected.
- Source security scan passed.
- HTTP checks returned 200 for `/`, `/templates`, `/couple-space`, `/about`, `/contact`, `/privacy`, `/terms`, `/refund-policy`, `/sitemap.xml`, and `/robots.txt`.
- Recipient routes returned no-index response headers and metadata. All three exact MP4 URLs returned the expected video content type.
- No browser surface was available to this session. Visual/mobile, real keyboard interaction, autoplay failure, and reduced-motion behavior still need browser QA. Implementation and source inspection are not substitutes for those checks.
- No real payment or Google OAuth transaction was run, and no private customer data was created for verification.

## Remaining launch work

1. Buy and activate `qubitsells.com`, provision TLS, and activate `support@qubitsells.com`. The pages disclose that the mailbox is planned; mail delivery has not been verified.
2. Finalize the applicable jurisdiction. QubitSells is the owner-confirmed operator name, and QubitSells remains the product name without an unverified corporate suffix.
3. Complete Stripe checkout/fulfillment using the confirmed $2 / $3 / $3.49 duration prices. The current implementation is not ready for paid sales.
4. Capture an authorized, sanitized screenshot of the real Couple Space interface. The current panel deliberately uses an existing time capsule image labeled **illustration**; it is not passed off as a screenshot.
5. Complete desktop/mobile, keyboard, reduced-motion, failure-state, live personalization/recipient, and OAuth browser QA, then deploy the public pages. Neither deployment nor external dashboard changes were made.

### Google Cloud — separate external action

Configure Google Auth Platform branding as QubitSells with the matching logo, homepage `https://qubitsells.com`, privacy URL `https://qubitsells.com/privacy`, terms URL `https://qubitsells.com/terms`, active support address, and authorized domain. Configure the web client's production origin and the actual Supabase callback URL. Confirm only the required openid/email/profile scopes and complete any requested brand verification. Do not claim approval before Google returns it.

### Supabase dashboard — separate external action

Enable/configure the Google provider with the appropriate OAuth client, verify its displayed callback URL against Google Cloud, and set Site URL to `https://qubitsells.com`. Allow the production `https://qubitsells.com/auth/callback` redirect and retain development redirects only where intended. Existing application callback code exchanges the code and preserves its validated relative destination. Do not change database consent or ownership controls to make sign-in work.

### Search Console — separate external action

Verify ownership of the new domain after DNS setup and submit `https://qubitsells.com/sitemap.xml` after deployment. Check public page accessibility and exclusion of private recipient/account content. Search indexing and rankings are not guaranteed.

Official sign-in setup reference: https://supabase.com/docs/guides/auth/social-login/auth-google

## QubitSells rebrand

The website is now named QubitSells. The header uses `/logo/bonded-logo-cyan.png` in its original cyan. The cyan footer uses `/logo/white.png` rendered in black. Both are image-only brand links with accessible QubitSells home labels. Public metadata, structured data, policy copy, sign-in labels, and template viewer credits use QubitSells. Existing lowercase database/RPC names, cookie names, media paths, and browser storage keys are intentionally retained for compatibility. Google Cloud consent-screen branding still needs to be updated externally to QubitSells.

Rebrand verification: checked 11 public/sign-in/template pages for the QubitSells name and absence of the old visible name; the supplied logo URL returned 200. Scoped lint and the source security scan passed.

Header refinement: larger cyan monogram, centered desktop navigation with current-page indicators and animated underlines, a quiet account button, and a cyan browse action with a contained arrow. Tablet/mobile layouts use the accessible disclosure menu. Motion honors the reduced-motion preference.
