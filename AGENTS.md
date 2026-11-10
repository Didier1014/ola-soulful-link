# Architecture rules

- Scope the professional SaaS visual system to the authenticated shell and its portals; public checkouts must remain visually isolated.
- Dashboard visualizations consume existing transaction and stats functions; presentation changes must not alter payment or balance logic.
- All authenticated pages use the full desktop workspace width through the shared shell and page-wrapper CSS, with aligned header gutters; modal and individual control widths remain independent.
- Active payments use the VendusPay server-only client through the legacy adapter; legacy Pagar references stay reconcilable and TEST operations never settle as real sales.
- Gateway settlement (Pagar and VendusPay, webhook, polling and reconciliation) uses the restricted atomic settlement function so webhook retries and polling cannot credit a seller twice.
- Pagar webhooks prefer the dedicated webhook secret and fall back to the previously saved PagAja webhook secret, preserving signature validation without copying secret values.
- App notifications send synchronously through the managed template helper; kept email tables are audit-only, and signed outcome events preserve their legacy status contract without gating sends.
- Premium product approval is enforced by a database trigger using protected user_roles entries, never editable profile fields; automatically approved products do not request admin approval.
- Checkout operation uses anonymous capability-protected sessions and owner-only RLS aggregates; payment outcomes come from existing non-test transactions, not browser claims, to preserve financial truth and seller privacy.
- External funnel analytics use a public domain-scoped installation identifier and hashed session capabilities; owner-only reports link to same-owner checkout sessions, never infer sales from browser events, and do not collect form contents.