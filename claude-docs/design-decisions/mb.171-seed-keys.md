# MB.171 — A seeded row keeps the key the seed gave it

**Status:** decided · **Date:** 2026-10-06

MB.156 was to seed the vocabulary docs' sources as `references` rows,
idempotent by the rendered citation. Scoping it, the owner asked what a reseed
does to a seeded reference an admin has since edited. The answer was that it
no longer recognises the row and inserts the original again as a twin, and
that every vocabulary seed has the same gap: they key by slug, the slug is
derived from the name, and M5.6, M5.6a, M5.6b, MB.95 and MB.132 all rename a
row and re-slug it. `deploy.yml` reseeds whenever a push touches a seed file,
so the twin arrives on the first such deploy after the edit. The owner chose a
stable key on every seeded row, for every data type this can happen to
([`mb.171-plan.md`](mb.171-plan.md)). The build is MB.171 (the column), MB.172
(the vocabulary seeds keyed on it) and MB.156 (the sources seed, keyed from its
first row). DESIGN.md §5, "`seedKey`", carries the model; this record carries
the alternatives.

## Decided

**Each seeded table carries `seed_key`, the identity the seed gave the row at
insert, never changed after.** A vocabulary row's is its slug at insert; a
reference's is the citation the seed rendered. A row an admin or a member
writes holds null. A partial unique index covers live keyed rows, as rule 4
asks of every unique index. Nothing outside `src/db/seed/` writes it, and no
input, service or GraphQL field names it.

The four options put to the owner:

- **A, accept the twin and document it.** This is how the vocabularies already
  behave: simple and exact, with no schema change. But a twin carries the
  original's links, sits beside the edit until an admin notices it and
  soft-deletes it, and nothing flags it.
- **B, skip a source whose rows already carry links.** No schema change, but
  it guesses. It would silently skip a genuinely new source added for an
  already-sourced deity, which is the commonest reason to touch the seed. A
  missing source is worse than a visible twin, because nothing shows it.
- **C, a stable key on each seeded row — chosen.** The seed recognises its
  own row whatever an admin did to it, never twins, and still adds what is
  new. It costs a seed-only column on nine domain tables, and three PRs where
  there was one.
- **D, run once.** It never twins, and it never delivers a later addition to a
  doc either, which defeats the deploy's reseed.

**Why a column rather than a ledger table.** A table of `(table, key, row
id)` would keep the domain tables clean, but its row id could point at no
foreign key, since it spans nine tables. The column needs no integrity of its
own and travels with the row.

**Which tables.** Only the ones `migrate.yml` seeds on a deployed database:
`category_groups`, `categories`, `ingredient_form_groups`,
`ingredient_forms`, `planets`, `zodiac_signs`, `deity_traditions`,
`deities` and `references`. Two kinds of seeded row are left out:

- The scenarios (`minimal`, `standard`, `demo`) run on fresh local and test
  databases only, and key by fixed id.
- `reference_links` is keyed by its two ids, which no edit changes.

**The backfill is exact.** `0044_seed-keys` keys every row the bootstrap user
created by its slug. No rename writer had shipped, so every such row still
carries the slug the seed gave it. `references` holds no seeded row yet.

**What a reseed takes as present** (MB.172, MB.156) is a matching key, live
or soft-deleted. It also takes as present a live row holding the slug, so a
row an admin created under a seed name does not trip the slug index.

## What it changed

- DESIGN.md §5 names `seedKey` on the nine tables and §14 records the
  question. `db/seed-module.md` gains "Seed keys".
- MB.171 and MB.172 were minted. MB.156 is amended to key on the column, and
  re-estimated to 6h for the doc normalisation it also carries.
- `db/expand-contract.md` records `0044_seed-keys` as a column added while
  MB.168's drop was pending.
