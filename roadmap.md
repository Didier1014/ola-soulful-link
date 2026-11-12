# Return to Pagar

- [x] Route new checkout, payment-link and merchant charges to Pagar using existing protected credentials; preserve pending VendusPay reconciliation, prices and fees.
- [ ] Verify adapter tests, preview and saved Pagar authentication; no real buyer charge without a chosen recipient.

# MozeSMS update

- [x] Keep the SMS editor visible when sending is disabled; dedicated message save/reload verified in the authenticated account, original settings restored without sending SMS; six tests pass.
- [x] Allow premium and admin sellers to edit automatic post-payment SMS; server and database guard roles, delivery uses authorized templates, six tests pass, authenticated save/reload/restore and mobile verified without sending SMS.
- [x] Securely linked MozeSMS and replaced all shared SMS delivery with sender ESHOP; authentication succeeds and adapter tests/build pass.
- [x] Confirm real SMS delivery; the requested “Teste concluído” SMS was accepted by MozeSMS for the user's chosen recipient.

# Checkout operation monitoring

- [x] Add seller-owned external funnels, installation code, anonymous event collection and private reports.
- [x] Track navigation, page completion, quiz, HTML5 VSL milestones, engagement and checkout attribution without collecting field contents.
- [x] Installed script on a separate origin: consent, two-page journey, quiz and actual HTML5 video playback read back in authenticated UI; custom checkout attribution confirmed without payment. Eleven tests pass, domain/payment claims rejected, desktop/mobile checked. Validation funnels paused; production installation requires publishing.
- [x] Add private seller checkout funnel, hourly traffic, source/product filters and recent activity.
- [x] Track anonymous milestones on all public checkouts without changing payment logic or collecting field contents.
- [x] Verify tracking and aggregation through an actual checkout visit and completed form read back in the authenticated seller view; owner-only RLS and five tests pass; desktop/mobile have no overflow or runtime errors. No charge triggered.

# Dashboard redesign

- [x] Expand the desktop overview to fill the workspace; authenticated checks at 1920px, 1440px and 390px, sidebar collapse and period filter pass without overflow or runtime errors.
- [x] Restyle financial overview and navigation to match the supplied reference.
- [x] Preserve existing financial views and controls.
- [x] Verify desktop, mobile, theme switching and navigation.

# Shared SaaS visual system

- [x] Apply full desktop workspace width to all internal pages; 17 authenticated pages verified at 1920px and 390px without horizontal overflow. Public checkouts unchanged. Existing live-update subscription errors surfaced on notifications/withdrawals, unrelated to layout.
- [x] Extend the reference-led shell, icons and surfaces to all authenticated areas.
- [x] Match mobile menus, forms and dialogs to the shared system without touching checkouts.
- [x] Verify transactions, products, customers, links and other internal pages.

# Pagar production payments

- [x] Investigate the reported failed checkout after the LIVE credential update: GET /wallet authenticates as LIVE, but both the existing client and the exact official signing example receive HTTP 401 API_SIGNATURE_INVALID on a non-chargeable validation request.

- [x] Verify the current provider contract at https://pagar.co.mz/docs: direct C2B payments, signed POST requests and authenticated status queries.
- [x] Obtain and verify Pagar LIVE API key securely; GET /wallet now authenticates successfully and returns environment LIVE.
- [x] Replace active VPay creation with Pagar direct C2B for checkouts, payment links and merchant payments; preserve prices and fees and exclude TEST operations from paid sales and balance credit.
- [x] Add timestamped Pagar webhook signature verification and atomic LIVE settlement.
- [x] Reuse the stored PAGAJA_WHSEC for Pagar webhook verification when PAGAR_WEBHOOK_SECRET is absent; provider delivery still needs validation.
- [ ] Complete end-to-end payment tests; the current client and an independent copy of the official signing example both return API_SIGNATURE_INVALID after the LIVE update (request IDs req-epoh and req-epoo). Blocked on Pagar accepting a matching signing secret for this LIVE app; no real charge was triggered.
- [x] Pass local test-mode credit guards and webhook signature tests; validate preview compilation.
- [x] New LIVE credentials saved via secure form: signed POST /payments now returns 202 with environment LIVE (previously 401 API_SIGNATURE_INVALID).

# Email update

- [x] Inventory legacy senders, auth branding and existing audit writes.
- [x] Replace auth and app sending with managed helpers and preserve notification audit records.
- [x] Verify delivery-result audit handling, reject unsigned events and remove replaced legacy files; seven tests pass.
- [x] Confirm compilation, render all nine email previews and leave the update unpublished for review; no real email delivery claimed.
- [ ] Sending remains blocked until the configured sender domain is DNS-verified; no shared Lovable sender is available.

# VendusPay replacement

- [x] Review the official documentation and uploaded WooCommerce plugin.
- [x] Securely connect VendusPay and verify credentials without creating a charge (401/403 invalid; any other status valid; key stored only server-side).
- [x] Replace new checkout, payment-link and merchant payments while preserving prices, fees and pending Pagar reconciliation.
- [x] Add signed VendusPay callbacks and verified, atomic settlement.
- [x] Webhook secret available (STRIPE_WEBHOOK_SECRET fallback).
- [ ] VendusPay must register the callback URL; first signed delivery not yet observed.
- [ ] Verify the public checkout flow; real phone authorization requires a buyer's payment confirmation.
