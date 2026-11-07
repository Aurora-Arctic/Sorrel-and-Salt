# Wave 22 — Email consent and notifications

**The row is** `M22.1 → M22.7`.

**This wave exists on the owner's call of 2026-11-07**, made while M17.18 was scoped: the build work for promotional email consent and for the switchable support mails is 7 tasks, so it gets a wave of its own and not a place on Wave 21 (Billing and memberships). The tasks are drafted in [`tasks/m22.md`](../tasks/m22.md) and the reasoning is the decision record, [`m17.18-promotional-email-consent.md`](../design-decisions/m17.18-promotional-email-consent.md), with the research in [`email/promotional-consent.md`](../email/promotional-consent.md). The tasks are not minted until the owner approves them, and nothing in the wave runs until the owner schedules it. Its trigger is a decision to send the first promotional mail, or to let users switch off support mail.

**The order is the dependency order.**

1. **M22.1 and M22.2** are the table tasks: the consent and unsubscribe-token tables, and the mail preferences table. Every behaviour task needs them.
2. **M22.3** is the consent service and the recipient finder. **M22.4** honours the support mail preferences. Both follow their tables.
3. **M22.5** is the one-click route, the unsubscribe headers and the promotional mail frame, with the rule-1 correction. It follows M22.3.
4. **M22.6** is the one-time prompt and the Email Notifications section of `/account`. It follows M22.3 and M22.4.
5. **M22.7** collects the stories.

**Every task follows CLAUDE.md's Testing rules and Wave 21's standard of naming the tests it ships: an authorisation test asserts that direct-id access is refused and shows why it could have succeeded, every table has audit and catalogue tests, a story is proved by a browser flow, and no task is met by a skipped or flaky test.**

**No task is minted.** The record proposes them, and the owner approves, changes or drops each before an issue is made.
