# Architecture rules

- All SMS callers share the legacy SMS adapter routed through the linked MozeSMS gateway connection; credentials remain server-only and the approved sender is enforced centrally to avoid rejected custom senders.
- Post-payment SMS templates are account-wide in integration_settings.mozesms; saving and delivery consult protected user_roles, with default fallback after privilege revocation, so product legacy fields cannot override authorized settings.

- Scope the professional SaaS visual system to the authenticated shell and its portals; public checkouts must remain visually isolated.
- International checkout typography uses locally scoped font tokens; loading its font families must not change the authenticated workspace or national checkout fonts.
- Dashboard visualizations consume existing transaction and stats functions; presentation changes must not alter payment or balance logic.
- Workspace currency selection scopes read-only finance and activity views to one ledger currency; never converts or mixes amounts, and international provider receipts must not be presented as a withdrawable national balance. Privileged finance reads verify protected roles before loading the admin client.
- International checkout analytics link payments only to matching owner/product sessions with verified capabilities; anonymous analytics never receive buyer field contents. Leaf routes own page metadata through a shared helper.
- All authenticated pages use the full desktop workspace width through the shared shell and page-wrapper CSS, with aligned header gutters; modal and individual control widths remain independent.
- Active payments use the Pagar server-only client through the legacy adapter; pending VendusPay references stay reconcilable and TEST operations never settle as real sales.
- Product checkout currency/provider combinations are validated centrally; international products have zero legacy MZN price to prevent national callers from charging foreign prices as MT.
- Paystack uses the linked server-only gateway and its hosted card popup; capability-protected verification checks reference, amount, currency and environment before releasing delivery, never browser success claims.
- International payments use a separate owner-readable ledger, never MZN balances; every Paystack initialization centrally enforces the approved global split without client overrides. Recorded platform fees are accounting-only unless the provider split reserves them.
- Paystack callbacks validate SHA512 against the builder-designated saved LIVE secret, then independently verify through the linked connector; callback claims alone never settle a payment.
- Gateway settlement (Pagar and VendusPay, webhook, polling and reconciliation) uses the restricted atomic settlement function so webhook retries and polling cannot credit a seller twice.
- Pagar webhooks prefer the dedicated webhook secret and fall back to the previously saved PagAja webhook secret, preserving signature validation without copying secret values.
- App notifications send synchronously through the managed template helper; kept email tables are audit-only, and signed outcome events preserve their legacy status contract without gating sends.
- Purchase email delivery reads persisted LIVE paid ledger rows, uses event-specific managed idempotency keys and signed private-file links; welcome targets newly created confirmed accounts only, and test emails target the authenticated account only to prevent arbitrary sends.
- Premium product approval is enforced by a database trigger using protected user_roles entries, never editable profile fields; automatically approved products do not request admin approval.
- Checkout operation uses anonymous capability-protected sessions and owner-only RLS aggregates; payment outcomes come from existing non-test transactions, not browser claims, to preserve financial truth and seller privacy.
- External funnel analytics use a public domain-scoped installation identifier and hashed session capabilities; owner-only reports link to same-owner checkout sessions, never infer sales from browser events, and do not collect form contents.
- Checkout language preferences live in product config and are resolved independently of prices and ledger currencies; visitor country uses edge geolocation, stores only a two-letter country, and falls back to browser language only in automatic mode.
- Dashboard cash-flow filters share the workspace currency and calendar-period helper; outgoing values use paid national withdrawals only, while unavailable international settlement outflows remain unknown, never inferred from accounting fees.
