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
- [ ] Obtain and verify Pagar LIVE API key and signing secret securely; awaiting the user's production credentials.
- [ ] Replace VPay for checkouts, payment links and merchant payments without changing prices or fees; blocked on verified production access.
- [ ] Add Pagar timestamped webhook signature verification and obtain the LIVE webhook secret after the endpoint is ready.
- [ ] Verify payment creation, status checks and signed webhook handling after provider access is confirmed.