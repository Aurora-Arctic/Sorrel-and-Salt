# N · Wave 06 — Operations and vendor ethics

**The row is** `N6.1 → N6.17`.

**This wave exists on the owner's call of 2026-11-11**, made after every vendor the site uses or plans to use was checked against the Code of Ethics. The tasks are in [`tasks/v1-next/n6.md`](../../tasks/v1-next/n6.md); the findings, the owner's choices, and the approved plan are in [`support.md`, "Vendor check against the code of ethics and the operations wave"](../../design-decisions/support.md#vendor-check-against-the-code-of-ethics-and-the-operations-wave). Nothing in the wave runs until the owner schedules it.

**The free tasks come first, then the paid ones.** N6.1 → N6.14 cost nothing. N6.15 → N6.17 cost money (Vercel Pro, tracing, and UptimeRobot), so they come last.

**The order is the dependency order.**

1. **N6.1 → N6.5** are wording, letters, settings, runbooks, and GitHub's free security checks. They have no code dependency on each other.
2. **N6.6** is the alert helper. **N6.7** (the daily database check), and **N6.8** (the Resend bounce webhook) call it.
3. **N6.9, N6.10, and N6.11** are the DMARC records, the weekly restore test, and the incident runbook. They have no dependency on the tasks above.
4. **N6.12** is the visit counts table, the table task. **N6.13** counts visits on the server, and **N6.14** shows keepers the counts.
5. **N6.15** moves the site to Vercel Pro. **N6.16** adds tracing, and follows it. **N6.17** adds uptime monitors and cron heartbeats, and follows N6.3, N6.6, and N6.7.

**Tasks that already exist elsewhere.** N4.19 (security.txt, in N · Wave 04) is free, has no billing dependency, and can run at any time. ND.1 (hourly crons on Pro, in the deferred file) is triggered by N6.15. Stripe monitoring (Radar Lite, dispute alerts) belongs to the N4 Stripe tasks and is not repeated here.

**No error tracker is bought.** The owner decided on 2026-11-11 that Vercel's logs and the existing error reference cover launch.

**Every task follows CLAUDE.md's Testing rules.** A wording-only or runbook task runs `format:check` and `lint` and no tests. A task that changes what the site stores or who handles it updates `documents/privacy.md` in the same PR. No task is met by a skipped or flaky test.
