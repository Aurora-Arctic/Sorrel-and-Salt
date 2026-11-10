# N · Wave 05 — Email consent and notifications

**The row is** `N5.1 → N5.7`.

The build work for promotional email consent and for the switchable support mails. It is separate from N · Wave 04 (Billing and memberships) because it has no dependency on billing. The tasks are in [`tasks/v1-next/n5.md`](../../tasks/v1-next/n5.md); the decision is [`support.md`, "Promotional email needs recorded consent, withdrawn in one click"](../../design-decisions/support.md#promotional-email-needs-recorded-consent-withdrawn-in-one-click) and the research is [`email/promotional-consent.md`](../../email/promotional-consent.md). Nothing in the wave runs until the owner schedules it. Its trigger is a decision to send the first promotional mail, or to let users switch off support mail.

**The order is the dependency order.**

1. **N5.1 and N5.2** are the table tasks: the consent and unsubscribe-token tables, and the mail preferences table. Every behaviour task needs them.
2. **N5.3** is the consent service and the recipient finder. **N5.4** honours the support mail preferences. Both follow their tables.
3. **N5.5** is the one-click route, the unsubscribe headers and the promotional mail frame, with the rule-1 correction. It follows N5.3.
4. **N5.6** is the one-time prompt and the Email Notifications section of `/account`. It follows N5.3 and N5.4.
5. **N5.7** collects the stories.

**Every task follows CLAUDE.md's Testing rules and N · Wave 04's standard of naming the tests it ships: an authorisation test asserts that direct-id access is refused and shows why it could have succeeded, every table has audit and catalogue tests, a story is proved by a browser flow, and no task is met by a skipped or flaky test.**
