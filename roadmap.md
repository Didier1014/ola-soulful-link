# Reference checkout style

- [x] Add selectable normal/offer checkout styles with isolated black/gold presentation and existing national/international payment verification.
- [x] Apply offer style only to front-q6b for the specified owner; original photo, English language and 599 ZAR price preserved.
- [x] Desktop/mobile photo, price and valid form verified without charging; authenticated style selection saved/read back using a temporary product, then removed. Fifteen style/language/currency tests pass; build OK. Publication required; no real purchase performed.

# Paystack credential replacement

- [x] Replace publishable key and global split; use builder-designated saved secret for both provider API and callback signatures, without fallback to the previous connection.
- [x] Saved secret authenticates; requested split is active for ZAR and hosted initialization is accepted without a charge. Twelve payment/signature/currency tests pass and preview build is OK; real purchase and callback remain untested, and publication is required.

# Complete email flows

- [x] Wire buyer receipts and product delivery to verified national/international payments; preserve auth and operational emails. Historical sales are excluded from automatic delivery.
- [x] Add welcome on first authenticated access for new confirmed accounts and self-addressed email test; collect optional buyer email on national checkouts.
- [x] Six email tests and twelve currency/language tests pass; real self-addressed test accepted and managed sent event recorded; authenticated button and mobile checkout verified without charge. New purchase and real recovery-link completion await buyer/account actions; no real purchase or password change performed.

# Bug review and email verification

- [x] All 55 regression tests pass using their appropriate runners; authenticated overview, transactions, products and Operation load without runtime errors. MT/ZAR/USD switching and actual 10 ZAR sale read back; mobile has no overflow. All nine email templates render HTTP 200 and preview build is OK. No application bug reproduced in the checked flows.
- [x] Enable managed project emails; sender domain remains verifying DNS.
- [x] Test actual app-email sending after verification: authenticated test accepted and managed sent event recorded for the requesting account on 13 November 2026; inbox receipt is not observable.

# Multi-currency SaaS and international checkout

- [x] Add product checkout language (Portuguese, English, Spanish, French and automatic) and approximate edge visitor country, shown in Operation; no currency or price changes.
- [x] Place currency controls below dashboard period filters and inside Transactions; include yesterday and paid MT withdrawal outflows. International outflows remain explicitly unavailable, not zero.
- [x] Nineteen tests pass; saved/reloaded English on approved checkout, restored original language, removed validation product, verified actual 10 ZAR sale in Transactions, USD/MT switching, Operation and desktop/mobile without payment or overflow. Live edge geolocation awaits published traffic; local browser has no country by default.

- [x] Restore only the pre-redesign international checkout presentation with reference Manrope/Sora typography; desktop/mobile fonts and form verified without charging, no overflow or runtime errors, build OK. Workspace currencies, analytics and payment logic preserved.
- [x] Add persistent workspace currency selection and separate financial views for MT, ZAR, USD and EUR without conversion or balance mixing; Stripe stays unavailable.
- [x] Include international payments in overview, transactions, reports, products, customers, links and admin; scope operation and funnel checkout conversions by currency and keep national-only operations isolated.
- [x] Match the supplied Velqo checkout reference with Redox identity while preserving hosted secure card entry.
- [x] Verify actual confirmed 10 ZAR sale in authenticated views, currency switching, and desktop/mobile checkout without a new charge; 16 tests pass. Existing withdrawals live-update warning remains unrelated; delivery emails deferred by the user.

# International product checkouts

- [x] Apply the approved global Paystack split to every new initialization; eleven tests pass and actual server adapter initialization is accepted without charging a card. The verified LIVE ZAR split allocates 100% to its recipient, as explicitly approved.
- [x] Configure the supplied public key; designated saved LIVE secret exists and callback/webhook URLs provided.
- [ ] Validate a signed Paystack callback after publication; saved webhook secret is unavailable to local preview and no provider callback has arrived.

- [x] Connect Paystack securely; initialized a LIVE ZAR 50 session and opened actual provider card popup without payment.
- [x] Product creation offers national MT, Paystack ZAR and future Stripe EUR/USD; created and read back ZAR product, then disabled validation product.
- [x] Applied reference-led international design, desktop/mobile checked with no overflow; secure card fields stay hosted by Paystack.
- [x] Separate owner-readable ZAR ledger, MZN guard and nine currency/signature tests pass; ledger read back through authenticated UI and missing capability rejected.
- [x] Resolve Paystack split configuration: user explicitly approved a 100% recipient split without reserving the 8% platform fee. The ledger fee remains accounting-only; no fee collection is claimed.
- [ ] Confirm an authorized real international purchase and delivery; no card details entered or real payment made.

# Return to Pagar

- [x] Route new checkout, payment-link and merchant charges to Pagar using existing protected credentials; preserve pending VendusPay reconciliation, prices and fees.
- [x] Fifteen payment tests pass; saved credentials authenticate as LIVE, signed non-chargeable validation returns 400 VALIDATION_ERROR (not signature rejection), preview checkout renders without runtime errors and unsigned webhook returns 401.
- [ ] Confirm a real payment and signed callback after publication; requires a buyer-selected phone and authorization, no real charge triggered.

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
- [ ] Complete end-to-end payment tests; LIVE authentication and signed requests now pass validation, but a real payment requires buyer authorization and a signed callback after publication.
- [x] Pass local test-mode credit guards and webhook signature tests; validate preview compilation.
- [x] New LIVE credentials saved via secure form: signed POST /payments now returns 202 with environment LIVE (previously 401 API_SIGNATURE_INVALID).

# Email update

- [x] Inventory legacy senders, auth branding and existing audit writes.
- [x] Replace auth and app sending with managed helpers and preserve notification audit records.
- [x] Verify delivery-result audit handling, reject unsigned events and remove replaced legacy files; seven tests pass.
- [x] Confirm compilation, render all nine email previews and leave the update unpublished for review; no real email delivery claimed.
- [x] Sender domain verified and active on 13 November 2026; managed sending is available.

# VendusPay replacement

- [x] Review the official documentation and uploaded WooCommerce plugin.
- [x] Securely connect VendusPay and verify credentials without creating a charge (401/403 invalid; any other status valid; key stored only server-side).
- [x] Replace new checkout, payment-link and merchant payments while preserving prices, fees and pending Pagar reconciliation.
- [x] Add signed VendusPay callbacks and verified, atomic settlement.
- [x] Webhook secret available (STRIPE_WEBHOOK_SECRET fallback).
- [ ] VendusPay must register the callback URL; first signed delivery not yet observed.
- [ ] Verify the public checkout flow; real phone authorization requires a buyer's payment confirmation.
