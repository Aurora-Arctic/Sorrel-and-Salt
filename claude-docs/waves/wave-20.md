# Wave 20 — Ethical warnings

**This wave exists on the owner's call of 2026-11-06**, made while M17.3 was scoped: the build for the ethical warnings on ingredients, and the questions it leaves in `compendium/ethics/`, are fifteen tasks, so they get a wave instead of sitting on Wave 17 (Fast follow), which holds scoping and audits. They are `M20.1 → M20.15` ([`tasks/m20.md`](../tasks/m20.md)). The decision record is [`m17.3-ethical-ingredient-warnings.md`](../design-decisions/m17.3-ethical-ingredient-warnings.md).

**The row is** `M20.1 → M20.15`.

**M20.1 → M20.9 are question tasks.** Each puts one group of the `needs-review` questions in `compendium/ethics/` to the owner and records each answer in the file's `status`. The groups are:

- M20.1 (A): a Wikipedia rating whose assessment was not found.
- M20.2 (B): an assessment of another name or taxon.
- M20.3 (C): a CITES listing wider or narrower than the entry.
- M20.4 (D): a prose claim with no assessor named.
- M20.5 (E): a prose status whose scope is unknown.
- M20.6 (F): a listing scoped to Hawaii.
- M20.7 (G): a United Plant Savers genus-level listing.
- M20.8 (H): whether something counts as an animal part.
- M20.9 (I and J): a re-review of the 22 already decided, and the 21 `needs-review` files that hold no question. The owner folded the two into one task on 2026-11-06.

**The question tasks may run in any order**, and beside the table and services tasks, because they change only files under `compendium/ethics/` and the build does not read those files until the seed.

**The table comes before the behaviour tasks.** M20.10 is the table. It has no prerequisite in Wave 20, and follows M19.4 only if both tasks widen the `reference_links_one_row` check. M20.11 (services and GraphQL) follows it, and M20.12 (the curator's controls) follows M20.11. M20.13 (the notice, with the card marks and filter) follows M20.11, and M19.6 if it reuses that notice component. M20.13 updates the Code of Ethics in its own PR.

**The seed comes after every question task.** M20.14 reads `compendium/ethics/`, so it waits on M20.1 → M20.9 and on the table, to seed answers that are settled rather than ones that may still change. It writes without the services, so it does not wait on M20.11 or M20.12.

**The data marks 33 entries today, and 32 once peyote leaves under M19.1.** The question tasks may change the list.

**The help page waits on M17.16.** M20.15 documents the warning in the help pages, which M17.16 builds from MB.175's scope. It also follows M20.13.
