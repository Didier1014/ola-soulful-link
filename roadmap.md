# Dashboard redesign

- [x] Restyle financial overview and navigation to match the supplied reference.
- [x] Preserve existing financial views and controls.
- [x] Verify desktop, mobile, theme switching and navigation.

# Shared SaaS visual system

- [x] Extend the reference-led shell, icons and surfaces to all authenticated areas.
- [x] Match mobile menus, forms and dialogs to the shared system without touching checkouts.
- [x] Verify transactions, products, customers, links and other internal pages.

# Pagar production payments

- [x] Verify the current provider contract at https://pagar.co.mz/docs: direct C2B payments, signed POST requests and authenticated status queries.
- [ ] Obtain and verify Pagar LIVE API key and signing secret securely; GET /wallet authenticated successfully but the provider returned environment TEST, so production credentials are still required.
- [x] Replace active VPay creation with Pagar direct C2B for checkouts, payment links and merchant payments; preserve prices and fees and exclude TEST operations from paid sales and balance credit.
- [x] Add timestamped Pagar webhook signature verification and atomic LIVE settlement.
- [x] Reuse the stored PAGAJA_WHSEC for Pagar webhook verification when PAGAR_WEBHOOK_SECRET is absent; provider delivery still needs validation.
- [ ] Complete end-to-end payment tests; checkout and independent signed request both return API_SIGNATURE_INVALID, including after the signing secret was updated. Requires API key and matching signing secret from the same Pagar app.
- [x] Pass local test-mode credit guards and webhook signature tests; validate preview compilation.