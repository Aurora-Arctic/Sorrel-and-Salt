# N · Wave 03 — Ethical warnings

**This wave exists on the owner's call of 2026-11-06**, made while M17.3 was scoped: the build for the ethical warnings on ingredients, and the questions it leaves in `compendium/ethics/`, are fifteen tasks, so they get a wave instead of sitting on Wave 17 (Fast follow), which holds scoping and audits. They are `N3.1 → N3.15` ([`tasks/v1-next/n3.md`](../../tasks/v1-next/n3.md)). The decision record is [`ingredients.md`, "The ethical warnings on ingredients"](../../design-decisions/ingredients.md#the-ethical-warnings-on-ingredients).

**The row is** `N3.1 → N3.16`.

**N3.1 → N3.9 are question tasks.** Each puts one group of the `needs-review` questions in `compendium/ethics/` to the owner and records each answer in the file's `status`. The groups are:

- N3.1 (A): a Wikipedia rating whose assessment was not found.
- N3.2 (B): an assessment of another name or taxon.
- N3.3 (C): a CITES listing wider or narrower than the entry.
- N3.4 (D): a prose claim with no assessor named.
- N3.5 (E): a prose status whose scope is unknown.
- N3.6 (F): a listing scoped to Hawaii.
- N3.7 (G): a United Plant Savers genus-level listing.
- N3.8 (H): whether something counts as an animal part.
- N3.9 (I and J): a re-review of the 22 already decided, and the 21 `needs-review` files that hold no question. The owner folded the two into one task on 2026-11-06.

**The question tasks may run in any order**, and beside the table and services tasks, because they change only files under `compendium/ethics/` and the build does not read those files until the seed.

**The table comes before the behaviour tasks.** N3.10 is the table. It has no prerequisite in N · Wave 03, and follows N2.4 only if both tasks widen the `reference_links_one_row` check. N3.11 (services and GraphQL) follows it, and N3.12 (the curator's controls) follows N3.11. N3.13 (the notice, with the card marks and filter) follows N3.11, and N2.6 if it reuses that notice component. N3.13 updates the Code of Ethics in its own PR.

**The seed comes after every question task.** N3.14 reads `compendium/ethics/`, so it waits on N3.1 → N3.9 and on the table, to seed answers that are settled rather than ones that may still change. It writes without the services, so it does not wait on N3.11 or N3.12.

**The data marks 33 entries today, and 32 once peyote leaves under N2.1.** The question tasks may change the list.

**The help page waits on M17.16.** N3.15 documents the warning in the help pages, which M17.16 builds from MB.175's scope. It also follows N3.13.

**N3.16 confirms before a toxic ingredient is used**, minted on the owner's call of 2026-11-09: a confirmation when a toxic ingredient goes into a spell, and when a working of such a spell is recorded. It builds on the toxic flag, which already exists, and waits on nothing else in the wave.
