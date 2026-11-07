# Dashboard redesign

- [x] Restyle financial overview and navigation to match the supplied reference.
- [x] Preserve existing financial views and controls.
- [x] Verify desktop, mobile, theme switching and navigation.

# Shared SaaS visual system

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
- [ ] Verify signed outcome recording and delivery-result handling, then remove replaced legacy files.
- [ ] Confirm compilation and leave the update unpublished for review.
- [ ] Sending remains blocked until the configured sender domain is DNS-verified; no shared Lovable sender is available.
