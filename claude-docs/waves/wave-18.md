# Wave 18 — Privacy

**This wave exists on the owner's call of 2026-11-03**, made while M15.61 was scoped: the GDPR work from [M15.58](../design-decisions/m15.58-gdpr-scope.md) gets a wave of its own, run after launch, instead of sitting on Wave 15 (Launch). It takes M15.61 and M15.73 → M15.76 from Wave 15; their ids and entries are unchanged.

**The row is** `M15.61 · M15.75 · M15.76 · M18.1 → M18.9 · M15.73 · M15.74`.

**M15.61 comes first** because it is the scope the M18 tasks come from ([`m15.61-take-your-writing-scope.md`](../design-decisions/m15.61-take-your-writing-scope.md)). M15.75 (the daily sweep of expired sign-in rows) and M15.76 (consent for the last-used sign-in cookie) need nothing from the M18 tasks.

**M18.1 → M18.9 are the way for people to take their data with them** ([`tasks/m18.md`](../tasks/m18.md)): the table (M18.1), a hint on staff notes (M18.2), the copy itself (M18.3), the zip (M18.4), asking and the mailed link (M18.5), the emailed code and download (M18.6), an admin sending a copy to someone who cannot sign in (M18.7), a reminder in the leave dialog (M18.8) and a coven owner's export (M18.9). M18.1 is a table task and goes first; M18.3 and M18.4 precede M18.5 and M18.6; M18.9 reuses them all. M18.5, M18.6, M18.7 and M18.9 each add a story (92 to 95).

**M15.73 and M15.74 come last** so erasure can reuse the pieces the M18 tasks build: the classification map, the subject-scoped finders, the "fill every table" test fixtures, the `privacy_requests` table, the link-and-code confirmation and the admin action that names a support request. The scope's "Built for reuse by erasure" table lists them, and M15.74's entry says which it may use.

**The cron limit.** The batch adds a fourth daily cron route. Vercel's Hobby plan allows 100 cron jobs per project, each at most once a day, so no task to merge the routes is needed.

**The trigger for the wave is v1 launched.** The code of ethics promises the export, so the wave is not optional once launched, but it is not a launch blocker.
