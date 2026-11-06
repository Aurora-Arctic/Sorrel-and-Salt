# Wave 21 — Billing and memberships

**The row is** `M21.1 → M21.20`.

**This wave exists on the owner's call of 2026-11-06**, made while M17.1 was re-scoped: subscription billing is twenty tasks, so it gets a wave and not a place on Wave 17 (Fast follow), which holds scoping and audits. The tasks are in [`tasks/m21.md`](../tasks/m21.md) and the reasoning is the decision record, [`m17.1-subscription-billing-scope.md`](../design-decisions/m17.1-subscription-billing-scope.md), with the research in [`billing/`](../billing/README.md). Nothing in the wave runs until the owner schedules it. Its trigger is a decision to charge.

**The order is the dependency order.**

1. **M21.1** is the proof of concept. It chooses between `@better-auth/stripe` and a thin service over the Stripe SDK, and captures the webhook fixtures. It runs on the throwaway branch `spike/m17-stripe`, which is never merged.
2. **M21.2 and M21.3** put Stripe's mock server in CI and compose, and add the scheduled run against real test mode. They follow M21.1.
3. **M21.4** is the table task: the billing tables and Stripe's row in the privacy policy. Every behaviour task needs it.
4. **M21.5** is the billing service and the entitlement check, with the pause, lapsed-member and switch rules. **M21.6** is the webhook route, and **M21.7** the site-hosted checkout page, the only page that loads Stripe.js.
5. **M21.8 → M21.11** are the discount, the exemption, the curator coven and trial, and the payer mode.
6. **M21.12 → M21.15** are the four pages: the steward's coven billing page, the account memberships page, the keeper's billing page and the public pricing page. **M21.16**, the subscription picker, follows the pricing page.
7. **M21.20** collects the stories.

**M21.17, M21.18 and M21.19 have no code dependency.** M21.17 reduces support load and must land before billing opens. M21.18 scopes an executive pay maximum ratio. M21.19 adds `/.well-known/security.txt` to the public list.

**Every task in the wave names the tests it ships** from the record's billing test plan: integers in the smallest unit, entitlement tested both ways by direct id, webhook idempotency, signature failure, out-of-order delivery and unknown events, audit and catalogue tests, pause-rule tests, one story per billing path, and the two guards. No task may be met by a skipped or flaky test.

**No operations-stack task is minted.** The cost model prices and recommends one, and the owner decided that nothing sets it up here.
