# Architecture rules

- Scope the professional SaaS visual system to the authenticated shell and its portals; public checkouts must remain visually isolated.
- Dashboard visualizations consume existing transaction and stats functions; presentation changes must not alter payment or balance logic.
- Active payments use the Pagar server-only client through the legacy adapter; sign POSTs with stable idempotency keys and never settle TEST operations as real sales.
- Pagar LIVE settlement uses the restricted atomic settlement function so webhook retries and polling cannot credit a seller twice.
- Pagar webhooks prefer the dedicated webhook secret and fall back to the previously saved PagAja webhook secret, preserving signature validation without copying secret values.