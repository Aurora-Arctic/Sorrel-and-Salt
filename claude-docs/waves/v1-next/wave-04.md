# N · Wave 04 — Billing and memberships

**The row is** `N4.1 → N4.20`.

**This wave exists on the owner's call of 2026-11-06**, made while M17.1 was re-scoped: subscription billing is twenty tasks, so it gets a wave and not a place on Wave 17 (Fast follow), which holds scoping and audits. The tasks are in [`tasks/v1-next/n4.md`](../../tasks/v1-next/n4.md) and the reasoning is the decision record, [`ingredients.md`, "Subscription Billing Scope"](../../design-decisions/ingredients.md#subscription-billing-scope), with the research in [`billing/`](../../billing/README.md). Nothing in the wave runs until the owner schedules it. Its trigger is a decision to charge.

**The order is the dependency order.**

1. **N4.1** is the proof of concept. It chooses between `@better-auth/stripe` and a thin service over the Stripe SDK, and captures the webhook fixtures. It runs on the throwaway branch `spike/m17-stripe`, which is never merged.
2. **N4.2 and N4.3** put Stripe's mock server in CI and compose, and add the scheduled run against real test mode. They follow N4.1.
3. **N4.4** is the table task: the billing tables and Stripe's row in the privacy policy. Every behaviour task needs it.
4. **N4.5** is the billing service and the entitlement check, with the pause, lapsed-member and switch rules. **N4.6** is the webhook route, and **N4.7** the site-hosted checkout page, the only page that loads Stripe.js.
5. **N4.8 → N4.11** are the discount, the exemption, the curator coven and trial, and the payer mode.
6. **N4.12 → N4.15** are the four pages: the steward's coven billing page, the account memberships page, the keeper's billing page and the public pricing page. **N4.16**, the subscription picker, follows the pricing page.
7. **N4.20** collects the stories.

**N4.17, N4.18 and N4.19 have no code dependency.** N4.17 reduces support load and must land before billing opens. N4.18 scopes an executive pay maximum ratio. N4.19 adds `/.well-known/security.txt` to the public list.

**Every task in the wave names the tests it ships** from the record's billing test plan: integers in the smallest unit, entitlement tested both ways by direct id, webhook idempotency, signature failure, out-of-order delivery and unknown events, audit and catalogue tests, pause-rule tests, one story per billing path, and the two guards. No task may be met by a skipped or flaky test.

**No operations-stack task is minted.** The cost model prices and recommends one, and the owner decided that nothing sets it up here.
