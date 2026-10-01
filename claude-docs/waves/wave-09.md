# Wave 09 — Workspaces

M6's UI half: its schema (M6.2) landed in Wave 3 and its authorization (M6.3, M6.6) in Wave 5. M6.8 precedes M6.16, whose remedy needs the reason M6.8's refusal carries, and M6.11 and M6.12 land before M6.13 because the members page composes both. **MB.10 lands immediately before M6.18**, which requires the display name to resolve without an N+1 and had no loader to call. **M6.17 is not here**: it is a census of every mutating service, so it closes at Wave 14 ([wave-14.md](wave-14.md)).

MB.30 was the one task that could have re-scoped this wave. Had Better Auth's organization plugin carried workspaces, M6.7, M6.8, M6.9, M6.11, M6.14 and M6.15 would have become hooks and thin service wrappers rather than hand-built implementations, with the UI tasks unaffected either way. It was not adopted, so they are built by hand ([`design-decisions/mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md)). MW.9 is retired (MB.31).
