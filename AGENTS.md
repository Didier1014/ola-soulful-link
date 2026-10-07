# Architecture rules

- Keep Dashboard visual tokens scoped in the global stylesheet so the financial overview can evolve without restyling public checkouts.
- Dashboard visualizations consume existing transaction and stats functions; presentation changes must not alter payment or balance logic.