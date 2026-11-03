# Wave 17 — Fast follow

**This wave exists on the owner's call of 2026-10-30**: a home for the post-launch work the backlog lists under V Fast Follow, minted one task at a time as each is scoped, so that nothing post-launch sits on Wave 15 (Launch) as unscheduled-by-design when it has a schedule of its own. It runs after Wave 15, and its trigger is v1 launched.

**The order is M17.1, then the tasks M17.1 mints.** M17.1 settles how subscription billing is carried, by a spike against Stripe's test mode rather than from the plugin's documentation (MB.79 wrote the requirements and the fit; `DESIGN.md` §13), and breaks the billing work into `M17.n` tasks, a table task before every behaviour task. Those tasks are added to this wave's row and to [`tasks/m17.md`](../tasks/m17.md) by M17.1 itself, in the order the record gives them.

**M17.2 and M17.3 scope the two ingredient warnings** the backlog lists under V Fast Follow, on the owner's call of 2026-11-02: the closed-practice warning and the ethical warnings, each from the data M14.29 gathered in `compendium/ethics/`. Neither depends on the billing work, so they sit after M17.1 in board order only. Each mints its own build tasks, and the task that ships a warning updates the Code of Ethics in the same PR.

**M17.4 follows M17.3**, minted on 2026-11-02 on the owner's call: hourly cron jobs for the unverified-account expiry and the address-change lapse, which replace two runs that sleep. Its trigger is the move to Vercel Pro, since Hobby runs a cron job at most once a day; it needs M15.68.

**M17.5 scopes a better editing experience for ingredients and spells**, minted on 2026-11-02 on the owner's call while M15.59 scoped the editor for the site's documents ([`tasks/m17.md`](../tasks/m17.md)). It depends on M15.71, whose editor it may reuse for the free-text fields, and is a prerequisite for nothing yet.

**MB.163, MB.175 and MB.78 stay on Wave 15**, unscheduled by design and trigger-based, until the owner moves them: they were minted before this wave existed and nothing about them changed.
