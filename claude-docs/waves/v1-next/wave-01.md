# N · Wave 01 — Privacy

**This wave exists on the owner's call of 2026-11-03**, made while M15.61 was scoped: the GDPR work from [M15.58](../../design-decisions/support.md#what-gdpr-asks-of-sorrel--salt) gets a wave of its own, run after launch, instead of sitting on Wave 15 (Launch). It takes M15.61 and N1.12 → N1.2 from Wave 15; their ids and entries are unchanged.

**The row is** `M15.61 · N1.1 · N1.2 · N1.3 → N1.11 · N1.12 · N1.13`.

**M15.61 comes first** because it is the scope the N1 tasks come from ([`support.md`, "A way for people to take their own writing with them"](../../design-decisions/support.md#a-way-for-people-to-take-their-own-writing-with-them)). N1.1 (the daily sweep of expired sign-in rows) and N1.2 (consent for the last-used sign-in cookie) need nothing from the N1 tasks.

**N1.3 → N1.11 are the way for people to take their data with them** ([`tasks/v1-next/n1.md`](../../tasks/v1-next/n1.md)): the table (N1.3), a hint on staff notes (N1.4), the copy itself (N1.5), the zip (N1.6), asking and the mailed link (N1.7), the emailed code and download (N1.8), an admin sending a copy to someone who cannot sign in (N1.9), a reminder in the leave dialog (N1.10) and a coven owner's export (N1.11). N1.3 is a table task and goes first; N1.5 and N1.6 precede N1.7 and N1.8; N1.11 reuses them all. N1.7, N1.8, N1.9 and N1.11 each add a story (92 to 95).

**N1.12 and N1.13 come last** so erasure can reuse the pieces the N1 tasks build: the classification map, the subject-scoped finders, the "fill every table" test fixtures, the `privacy_requests` table, the link-and-code confirmation and the admin action that names a support request. The scope's "Built for reuse by erasure" table lists them, and N1.13's entry says which it may use.

**The cron limit.** The batch adds a fourth daily cron route. Vercel's Hobby plan allows 100 cron jobs per project, each at most once a day, so no task to merge the routes is needed.

**The trigger for the wave is v1 launched.** The code of ethics promises the export, so the wave is not optional once launched, but it is not a launch blocker.
