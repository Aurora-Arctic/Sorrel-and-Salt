# Wave 17 — Fast follow

**The row lists its finished tasks first, in the order they ran, and its open tasks after them** (the owner's call, 2026-11-03), so the board reads as done work, then the schedule. The placements below give the order each task was planned in, and hold among the open tasks.

**This wave exists on the owner's call of 2026-10-30**: a home for the post-launch work the backlog lists under V Fast Follow, minted one task at a time as each is scoped, so that nothing post-launch sits on Wave 15 (Launch) as unscheduled-by-design when it has a schedule of its own. It runs after Wave 15, and v1 launches at its end: M11.14, which promotes `release/1.0.0` to `main`, sits after every other task in the row bar M7.A.1 (the owner's call, 2026-11-08).

**M17.1 comes first, and the billing tasks it mints live on Wave 21.** M17.1 settles how subscription billing is scoped, priced and carried: the research is in `claude-docs/billing/` and the decisions in `claude-docs/design-decisions/ingredients.md`, "Subscription Billing Scope" (MB.79 wrote the requirements and the fit; `DESIGN.md` §13). Its twenty build tasks are M21.1 → M21.20 on [Wave 21](wave-21.md) and [`tasks/m21.md`](../tasks/m21.md), not on this wave, because they are too many for a wave of scoping and audits.

**M17.2 and M17.3 scope the two ingredient warnings** the backlog lists under V Fast Follow, on the owner's call of 2026-11-02: the closed-practice warning and the ethical warnings, each from the data M14.29 gathered in `compendium/ethics/`. Neither depends on the billing work, so they sit after M17.1 in board order only. Each mints its own build tasks, and the task that ships a warning updates the Code of Ethics in the same PR. M17.2's build went to [Wave 19](wave-19.md), as M19.1 → M19.10, on the owner's call of 2026-11-06.

**M17.18 scopes opt-in consent for promotional email**, minted on 2026-11-06 on the owner's call, with its draft accepted as written. It records how the site must gather and record consent before its first marketing mail, from the law of the US, UK, EU and Canada, and it classes every mail the site sends today as transactional or promotional. It is research only; its findings go to `email/promotional-consent.md`, and any build tasks go to [Wave 21](wave-21.md) after the owner approves them. It follows M17.3 and precedes MB.175, and it is a prerequisite for nothing yet.

**M17.6 → M17.11 follow M17.29, in the order M17.7, M17.9, M17.8, M17.6, M17.10, M17.11**, minted on 2026-11-03 on the owner's call: six whole-site audits, of search engines (M17.6), design and flows (M17.7), duplicated code (M17.8), accessibility (M17.9), test speed and bloat (M17.10) and Lighthouse (M17.11). Each writes its findings to `claude-docs/audits/` and changes no code, and each finding becomes its own task after the owner reviews it. They sit late in the row because none blocks the post-launch work before them, and an audit run later finds more of the finished site.

**M17.12 follows M17.11**, minted on 2026-11-03 on the owner's call: it gives each PR one Vitest comment and one Playwright comment, each updated in place as results arrive, in place of four comments that each appear only when their job ends. It is developer tooling and a prerequisite for nothing.

**M17.19 and M17.20 follow M17.12**, minted on 2026-11-07 on the owner's call: two housekeeping tasks with no behaviour change. M17.19 keeps one Drizzle snapshot in `src/db/migrations/meta/` in place of one per migration, and M17.20 adds the stories eleven components lack. Neither is a prerequisite for anything.

**M17.24 follows M17.23 and comes before the other audits**, minted on the owner's call of 2026-11-08: an audit of the format checks and format-as-you-type of every form input that keepers, curators, stewards and practitioners use. Like M17.6 → M17.11, it writes findings and changes no code, and it is a prerequisite for nothing.

**M17.27 → M17.29 follow M17.24 and come before the other audits**, minted on the owner's call of 2026-11-09 so the audits see them: an About Us page (M17.27), keeper invitations that turn on coven creation (M17.28), and invitations and a sign-in dialog that do not assume an account (M17.29). M17.29's design is approved before it is built.

**M11.14 and M7.A.1 close the row**, moved here from Wave 15 on the owner's call of 2026-11-08. M11.14 promotes `release/1.0.0` to `main` once the wave's other work is done. M7.A.1 turns on the merge queue; it is unscheduled by design, its trigger is in [`tasks/m7a.md`](../tasks/m7a.md), and it sits last only so it has a place.

**M17.10 also proves the coverage gates before release**, the work M11.11 held until it was merged into M17.10 on the owner's call of 2026-11-08.

**M17.4 and MB.163 are in the Deferred milestone**, moved there from this wave on the owner's call of 2026-11-08, since each waits on its trigger ([TASKS.md](../TASKS.md), "Milestones without a row").

**MB.175 and M17.13 → M17.17 sit before the audits**, moved here from Wave 15 on the owner's call of 2026-11-06: the help articles, the glossary and the sub pages ship after launch. They come before the audits so the audits, M17.9's accessibility audit among them, find the help pages. MB.175 is the scoping record; its five build tasks follow it in table-then-behaviour order: M17.13 the table, M17.14 the services and GraphQL, M17.15 the keepers' page, M17.16 the public pages and M17.17 the seed. M17.21, minted on the owner's call of 2026-11-07, follows them and draws the widgets and screenshots, in the same PR. M17.25, minted on the owner's call of 2026-11-09, follows M17.21 in that PR and makes Guide its own help page kind. M17.26, minted the same day, follows it on its own branch and lets the help search answer questions. M17.22 and M17.23, minted the same day, add renaming a coven, table then behaviour, before the audits so they see it. M19.8's closed-practice help pages and M20.15's warning help page wait on them.

**M17.3 only scopes the ethical warnings on ingredients.** Its build tasks and the tasks that put the `needs-review` questions in `compendium/ethics/` to the owner are Wave 20 ([`wave-20.md`](wave-20.md)).
