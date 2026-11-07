## MB — Bugfixes and gap tasks

Closed tasks keep their heading only; the full text of each is in `claude-docs/archive/tasks-closed-waves.tar.gz`.

Work that was not in the original breakdown. `MB.*` ids exist so a defect or a missing dependency can be scheduled without renumbering an immutable ID.

**MB.206 — Repository: the two-tier read scope and the page pair, written once** · 3h

**MB.207 — Schema: the vocabulary columns, indexes and the sourced-entity registry from one place** · 2h

**MB.208 — Seed: one key reader, one actor publisher, one two-tier registry** · 2h

**MB.209 — Validation: one `requiredText`, one `RowId`, one link-or-name rule** · 1.5h

**MB.210 — Vocabulary and identity services: the curated write steps once** · 3h

**MB.211 — Ingredient writes: the child sequence and the input fields once** · 2h

**MB.212 — GraphQL transport: the resolver plumbing and the curated-vocabulary writes once** · 2.5h

**MB.213 — Auth, sign-in and mail: the provider roster once, the gates once** · 2h

**MB.214 — Categories and category groups refuse a blank description** · 0.5h

**MB.224 — Tests assert functional requirements: the rules, lint carries the architecture guards, harness tests go** · 3.5h

**MB.225 — `tests/db/`: catalogue sweeps once, seed content once, harness tests gone** · 2.5h

**MB.226 — Module schema and validation tests: shape once, behaviour particular to the table** · 3h

**MB.227 — Services, GraphQL, loaders and acceptance: one refusal per rule, the transport's half only** · 3.5h

**MB.228 — Component tests: the owner component once, no noun matrices, no presentation, no copy** · 4h

**MB.229 — Page, lib and email tests: no re-run of lib or e2e, no design pins, no copy** · 2.5h

**MB.230 — Playwright: duplicates of Vitest flows go, the build cache warms, the closing measurement** · 3h

**MB.231 — The repository's query helpers and predicates import one way, and the import-cycle lint rule covers `src/db/repository/`** · 1h

**MB.232 — The hand-written `scripts/*.d.mts` declarations go with the `tests/scripts/` files that read them** · 0.5h

**MB.233 — `DROP DATABASE … WITH (FORCE)` may end an autovacuum worker: the test role joins `pg_signal_backend`** · 0.5h

**MB.234 — The e2e build cache is saved from `staging`, so a pull request's Playwright job restores it** · 1h

**MB.215 — Ingredient variants: the model, the record and the re-scoped tasks** · 2h

**MB.216 — `ingredient_variants`, the fill, and identity on the formal name (schema)** · 4.5h

**MB.217 — A variant beneath stock, layers, categories, substitutes and references (schema)** · 5h

**MB.218 — Variants are read and searched** · 5.5h

**MB.219 — Variants are written** · 4h

**MB.220 — Identity is the formal name alone, and the form vocabulary reads variants** · 5.5h

**MB.221 — IngredientForm's Variants section** · 4h

**MB.222 — The form leaves the ingredient row: filters, list, SDL, seeds, fixtures** · 3.5h

**MB.223 — Drop `canonical_key`, `form`, `form_id` and what indexed them** · 1h

**MB.235 — Playwright restores the e2e build cache on a pull request and saves it only from `staging`** · 1h

**MB.236 — Four Playwright workers on the gate's 4-vCPU runner, kept only if measured faster** · 1h

**MB.237 — A Chromium-only e2e image on `node:26.6.0-bookworm-slim`** · 3h

**MB.238 — The `db` project's files that register no mock run without isolation, measured** · 4h

**MB.239 — Two tests that depend on the order of the tests in their file** · 1h

**MB.240 — The compendium seed: scope, sourcing rules, the candidate list and the library** · 3h

**MB.241 — `seed_key` on `ingredients`** · 1h

**MB.242 — `db:seed:compendium`, the guard, CI and a 14-ingredient pilot** · 6h

**MB.243 — The compendium seed: plants A to Cn** · 6h

_Story:_ As a reader, I want the plants from A to Cn in the compendium with their forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the first of six content shards built side by side by separate research lanes after MB.242. It writes `src/db/seed/compendium/plants-a-cn.ts` and `claude-docs/compendium/compendium-seed/plants-a-cn.md`, 112 entries, the rows `candidates.md` gives this shard (the plan's `plants-a-c`, renamed when the list moved the plant split points to Co, L and R for balance). **It merges first** of the six, because it switches the `SEED_ENTRIES` sweep from the fixture shard to `COMPENDIUM` and adds the precondition that `COMPENDIUM` is not empty; the others conflict with it on one line of `compendium/index.ts`. The 6 hours are an estimate, from MB.127's rate (216 rows and their sources in 2.5h, about 96 KB an hour): about 270 KB of literal and doc is about 3 hours, doubled for reading before citing and for sourcing every field; the pilot's measured time re-calibrates it before the lane is briefed.

**From M14.10 it writes markdown files** (M14.10 ended the freeze M14.4 set). Each entry it writes is one file, `compendium/ingredients/<nomenclature>/<slug>.md`, with its per-entry sources under `compendium/sources/` and a `nameBasis` on every citation ([`design-decisions/m14.4-compendium-markdown-files.md`](../design-decisions/m14.4-compendium-markdown-files.md)); nothing is written under `src/db/seed/compendium/`, and the shard's doc is not continued, since it moved to `claude-docs/archive/compendium-seed-shards/`. The files' citations take the place of the doc's one source line per entry, and its "What is left out, and why" goes in the pull request body ([`compendium-seed/README.md`](../compendium/compendium-seed/README.md), "What a source is recorded in").

The lane brief is the README's: every field value traces to a source read during the task, the owner's book by page or a fetched page by URL; a claim with no source is left out; no page, URL, edition or year is invented; `accessed` is the real fetch date; no prose is copied from any source; descriptions are 100 to 250 words, in British spelling, written fresh; shared works are named by their `works.ts` handle; a substitute links only an identity in this shard or an earlier one; every formal name is checked against POWO or Mindat as the entry is written, since the candidate list's are Wikipedia's. Every entry carries at least its primary form; a further form only where a source attaches something to it. An entry that cannot be sourced at depth goes to the doc's "What is left out, and why".

**It sets the toxic flags as it seeds** (M14.1, the owner's call on 2026-10-16). Each entry it writes after M14.1's mechanism lands is flagged `toxic: true` where a source read during the task says any part of it is poisonous, and each form where a source says that form is, cited with `toxic` in `supports`, under M14.1's rule. The entries of a part merged before then are flagged by M14.1.

**Its safety notes record hazards only, and agree with the flag** (the owner, 2026-10-21). A `safetyNotes` value, on an entry or on a form, states a hazard: something a source says can harm. It never says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards. That is not a caution, and where a source says only that, the field is left empty. A note that mixes a safe claim with a hazard keeps the hazard and loses the safe clause. And where a sourced note says the entry, or a form, is poisonous, toxic or fatal if swallowed, that entry or form carries `toxic: true`, cited under M14.1's rule, so the note and the flag never disagree. A note about a dose, a drug interaction or pregnancy on its own sets no flag.

No test is added: the guard and the `SEED_ENTRIES` sweeps run over the real list.

_Acceptance criteria:_

- Seeded entries plus "What is left out" rows equal the shard's candidate rows; a lane that would leave out more than a tenth of them stops and raises it with the owner before opening its pull request
- Every entry cites at least one reference of its own and every form at least one of its own, and every populated field is covered by a citation's `supports`
- The doc has its bibliography in Chicago form and one source line per entry, and records the shard's form count
- The guard is green, and `npm run db:seed:compendium` is idempotent from empty and after `standard`
- Every entry and form a source read during the task calls poisonous is flagged `toxic`, cited with `toxic` in `supports`; a part merged before M14.1's mechanism is left to M14.1
- No `safetyNotes` value, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards; where a source says only that, the field is empty, and a note that also names a hazard keeps the hazard and loses the safe clause
- Every entry or form whose `safetyNotes` value says it is poisonous, toxic or fatal if swallowed is flagged `toxic`, and every flag has a source behind it, so the note and the flag agree
- The pull request body states that every cited page or URL was read during the task
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.244 — The compendium seed: plants Co to K** · 6h

_Story:_ As a reader, I want the plants from Co to K in the compendium with their forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the second content shard, built beside MB.243 by its own research lane after MB.242 and merged after MB.243. It writes `src/db/seed/compendium/plants-co-k.ts` and `claude-docs/compendium/compendium-seed/plants-co-k.md`, 116 entries, the rows `candidates.md` gives this shard, under MB.243's lane brief. The 6 hours are an estimate on MB.243's calibration.

**From M14.10 it writes markdown files** (M14.10 ended the freeze M14.4 set). Each entry it writes is one file, `compendium/ingredients/<nomenclature>/<slug>.md`, with its per-entry sources under `compendium/sources/` and a `nameBasis` on every citation ([`design-decisions/m14.4-compendium-markdown-files.md`](../design-decisions/m14.4-compendium-markdown-files.md)); nothing is written under `src/db/seed/compendium/`, and the shard's doc is not continued, since it moved to `claude-docs/archive/compendium-seed-shards/`. The files' citations take the place of the doc's one source line per entry, and its "What is left out, and why" goes in the pull request body ([`compendium-seed/README.md`](../compendium/compendium-seed/README.md), "What a source is recorded in").

**It sets the toxic flags as it seeds** (M14.1, the owner's call on 2026-10-16). Each entry it writes after M14.1's mechanism lands is flagged `toxic: true` where a source read during the task says any part of it is poisonous, and each form where a source says that form is, cited with `toxic` in `supports`, under M14.1's rule. The entries of a part merged before then are flagged by M14.1.

**Its safety notes record hazards only, and agree with the flag** (the owner, 2026-10-21). A `safetyNotes` value, on an entry or on a form, states a hazard: something a source says can harm. It never says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards. That is not a caution, and where a source says only that, the field is left empty. A note that mixes a safe claim with a hazard keeps the hazard and loses the safe clause. And where a sourced note says the entry, or a form, is poisonous, toxic or fatal if swallowed, that entry or form carries `toxic: true`, cited under M14.1's rule, so the note and the flag never disagree. A note about a dose, a drug interaction or pregnancy on its own sets no flag.

No test is added: the guard and the `SEED_ENTRIES` sweeps run over the real list.

_Acceptance criteria:_

- Seeded entries plus "What is left out" rows equal the shard's candidate rows; a lane that would leave out more than a tenth of them stops and raises it with the owner before opening its pull request
- Every entry cites at least one reference of its own and every form at least one of its own, and every populated field is covered by a citation's `supports`
- The doc has its bibliography in Chicago form and one source line per entry, and records the shard's form count
- The guard is green, and `npm run db:seed:compendium` is idempotent from empty and after `standard`
- Every entry and form a source read during the task calls poisonous is flagged `toxic`, cited with `toxic` in `supports`; a part merged before M14.1's mechanism is left to M14.1
- No `safetyNotes` value, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards; where a source says only that, the field is empty, and a note that also names a hazard keeps the hazard and loses the safe clause
- Every entry or form whose `safetyNotes` value says it is poisonous, toxic or fatal if swallowed is flagged `toxic`, and every flag has a source behind it, so the note and the flag agree
- The pull request body states that every cited page or URL was read during the task
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.245 — The compendium seed: plants L to Q** · 6h

_Story:_ As a reader, I want the plants from L to Q in the compendium with their forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the third content shard, built beside MB.243 by its own research lane after MB.242 and merged after MB.243. It writes `src/db/seed/compendium/plants-l-q.ts` and `claude-docs/compendium/compendium-seed/plants-l-q.md`, 104 entries, the rows `candidates.md` gives this shard, under MB.243's lane brief. The 6 hours are an estimate on MB.243's calibration.

**From M14.10 it writes markdown files** (M14.10 ended the freeze M14.4 set). Each entry it writes is one file, `compendium/ingredients/<nomenclature>/<slug>.md`, with its per-entry sources under `compendium/sources/` and a `nameBasis` on every citation ([`design-decisions/m14.4-compendium-markdown-files.md`](../design-decisions/m14.4-compendium-markdown-files.md)); nothing is written under `src/db/seed/compendium/`, and the shard's doc is not continued, since it moved to `claude-docs/archive/compendium-seed-shards/`. The files' citations take the place of the doc's one source line per entry, and its "What is left out, and why" goes in the pull request body ([`compendium-seed/README.md`](../compendium/compendium-seed/README.md), "What a source is recorded in").

**It sets the toxic flags as it seeds** (M14.1, the owner's call on 2026-10-16). Each entry it writes after M14.1's mechanism lands is flagged `toxic: true` where a source read during the task says any part of it is poisonous, and each form where a source says that form is, cited with `toxic` in `supports`, under M14.1's rule. The entries of a part merged before then are flagged by M14.1.

**Its safety notes record hazards only, and agree with the flag** (the owner, 2026-10-21). A `safetyNotes` value, on an entry or on a form, states a hazard: something a source says can harm. It never says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards. That is not a caution, and where a source says only that, the field is left empty. A note that mixes a safe claim with a hazard keeps the hazard and loses the safe clause. And where a sourced note says the entry, or a form, is poisonous, toxic or fatal if swallowed, that entry or form carries `toxic: true`, cited under M14.1's rule, so the note and the flag never disagree. A note about a dose, a drug interaction or pregnancy on its own sets no flag.

No test is added: the guard and the `SEED_ENTRIES` sweeps run over the real list.

_Acceptance criteria:_

- Seeded entries plus "What is left out" rows equal the shard's candidate rows; a lane that would leave out more than a tenth of them stops and raises it with the owner before opening its pull request
- Every entry cites at least one reference of its own and every form at least one of its own, and every populated field is covered by a citation's `supports`
- The doc has its bibliography in Chicago form and one source line per entry, and records the shard's form count
- The guard is green, and `npm run db:seed:compendium` is idempotent from empty and after `standard`
- Every entry and form a source read during the task calls poisonous is flagged `toxic`, cited with `toxic` in `supports`; a part merged before M14.1's mechanism is left to M14.1
- No `safetyNotes` value, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards; where a source says only that, the field is empty, and a note that also names a hazard keeps the hazard and loses the safe clause
- Every entry or form whose `safetyNotes` value says it is poisonous, toxic or fatal if swallowed is flagged `toxic`, and every flag has a source behind it, so the note and the flag agree
- The pull request body states that every cited page or URL was read during the task
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.246 — The compendium seed: plants R to Z** · 6h

_Story:_ As a reader, I want the plants from R to Z in the compendium with their forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the fourth content shard, built beside MB.243 by its own research lane after MB.242 and merged after MB.243. It writes `src/db/seed/compendium/plants-r-z.ts` and `claude-docs/compendium/compendium-seed/plants-r-z.md`, 98 entries, the rows `candidates.md` gives this shard, under MB.243's lane brief. The 6 hours are an estimate on MB.243's calibration.

**From M14.10 it writes markdown files** (M14.10 ended the freeze M14.4 set). Each entry it writes is one file, `compendium/ingredients/<nomenclature>/<slug>.md`, with its per-entry sources under `compendium/sources/` and a `nameBasis` on every citation ([`design-decisions/m14.4-compendium-markdown-files.md`](../design-decisions/m14.4-compendium-markdown-files.md)); nothing is written under `src/db/seed/compendium/`, and the shard's doc is not continued, since it moved to `claude-docs/archive/compendium-seed-shards/`. The files' citations take the place of the doc's one source line per entry, and its "What is left out, and why" goes in the pull request body ([`compendium-seed/README.md`](../compendium/compendium-seed/README.md), "What a source is recorded in").

**It sets the toxic flags as it seeds** (M14.1, the owner's call on 2026-10-16). Each entry it writes after M14.1's mechanism lands is flagged `toxic: true` where a source read during the task says any part of it is poisonous, and each form where a source says that form is, cited with `toxic` in `supports`, under M14.1's rule. The entries of a part merged before then are flagged by M14.1.

**Its safety notes record hazards only, and agree with the flag** (the owner, 2026-10-21). A `safetyNotes` value, on an entry or on a form, states a hazard: something a source says can harm. It never says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards. That is not a caution, and where a source says only that, the field is left empty. A note that mixes a safe claim with a hazard keeps the hazard and loses the safe clause. And where a sourced note says the entry, or a form, is poisonous, toxic or fatal if swallowed, that entry or form carries `toxic: true`, cited under M14.1's rule, so the note and the flag never disagree. A note about a dose, a drug interaction or pregnancy on its own sets no flag.

No test is added: the guard and the `SEED_ENTRIES` sweeps run over the real list.

_Acceptance criteria:_

- Seeded entries plus "What is left out" rows equal the shard's candidate rows; a lane that would leave out more than a tenth of them stops and raises it with the owner before opening its pull request
- Every entry cites at least one reference of its own and every form at least one of its own, and every populated field is covered by a citation's `supports`
- The doc has its bibliography in Chicago form and one source line per entry, and records the shard's form count
- The guard is green, and `npm run db:seed:compendium` is idempotent from empty and after `standard`
- Every entry and form a source read during the task calls poisonous is flagged `toxic`, cited with `toxic` in `supports`; a part merged before M14.1's mechanism is left to M14.1
- No `safetyNotes` value, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards; where a source says only that, the field is empty, and a note that also names a hazard keeps the hazard and loses the safe clause
- Every entry or form whose `safetyNotes` value says it is poisonous, toxic or fatal if swallowed is flagged `toxic`, and every flag has a source behind it, so the note and the flag agree
- The pull request body states that every cited page or URL was read during the task
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.247 — The compendium seed: resins, woods and other ingredients** · 5h

**MB.248 — The compendium seed: stones and metals** · 8h

_Story:_ As a reader, I want the stones, crystals and metals in the compendium with their forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the sixth content shard, built beside MB.243 by its own research lane after MB.242 and merged after MB.243. It writes `src/db/seed/compendium/stones-and-metals.ts` and `claude-docs/compendium/compendium-seed/stones-and-metals.md`, 136 entries, the rows `candidates.md` gives this shard, under MB.243's lane brief. A mineral variety is `<Species> var. <variety>` as `standard` writes `Quartz var. amethyst`, with Mindat as the reference for names, and a metal is `chemical`. The 8 hours are an estimate on MB.243's calibration, scaled to the shard's size.

**From M14.10 it writes markdown files** (M14.10 ended the freeze M14.4 set). Each entry it writes is one file, `compendium/ingredients/<nomenclature>/<slug>.md`, with its per-entry sources under `compendium/sources/` and a `nameBasis` on every citation ([`design-decisions/m14.4-compendium-markdown-files.md`](../design-decisions/m14.4-compendium-markdown-files.md)); nothing is written under `src/db/seed/compendium/`, and the shard's doc is not continued, since it moved to `claude-docs/archive/compendium-seed-shards/`. The files' citations take the place of the doc's one source line per entry, and its "What is left out, and why" goes in the pull request body ([`compendium-seed/README.md`](../compendium/compendium-seed/README.md), "What a source is recorded in").

**It sets the toxic flags as it seeds** (M14.1, the owner's call on 2026-10-16). Each entry it writes after M14.1's mechanism lands is flagged `toxic: true` where a source read during the task says any part of it is poisonous, and each form where a source says that form is, cited with `toxic` in `supports`, under M14.1's rule. The entries of a part merged before then are flagged by M14.1.

**Its safety notes record hazards only, and agree with the flag** (the owner, 2026-10-21). A `safetyNotes` value, on an entry or on a form, states a hazard: something a source says can harm. It never says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards. That is not a caution, and where a source says only that, the field is left empty. A note that mixes a safe claim with a hazard keeps the hazard and loses the safe clause. And where a sourced note says the entry, or a form, is poisonous, toxic or fatal if swallowed, that entry or form carries `toxic: true`, cited under M14.1's rule, so the note and the flag never disagree. A note about a dose, a drug interaction or pregnancy on its own sets no flag.

No test is added: the guard and the `SEED_ENTRIES` sweeps run over the real list.

_Acceptance criteria:_

- Seeded entries plus "What is left out" rows equal the shard's candidate rows; a lane that would leave out more than a tenth of them stops and raises it with the owner before opening its pull request
- Every entry cites at least one reference of its own and every form at least one of its own, and every populated field is covered by a citation's `supports`
- The doc has its bibliography in Chicago form and one source line per entry, and records the shard's form count
- The guard is green, and `npm run db:seed:compendium` is idempotent from empty and after `standard`
- Every entry and form a source read during the task calls poisonous is flagged `toxic`, cited with `toxic` in `supports`; a part merged before M14.1's mechanism is left to M14.1
- No `safetyNotes` value, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards; where a source says only that, the field is empty, and a note that also names a hazard keeps the hazard and loses the safe clause
- Every entry or form whose `safetyNotes` value says it is poisonous, toxic or fatal if swallowed is flagged `toxic`, and every flag has a source behind it, so the note and the flag agree
- The pull request body states that every cited page or URL was read during the task
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.249 — Close the compendium seed** · 3h

_Story:_ As the owner, I want the seeded compendium counted against the candidate list and every entry shown to be sourced, so that I know what the 614 became and what was left out.

Minted on 2026-10-11 with MB.240 ([`../design-decisions/mb.240-compendium-seed.md`](../design-decisions/mb.240-compendium-seed.md)), the last of the ten. It starts after each shard's final part has merged, not merely after each shard's first PR: five shards, `plants-a-cn`, `plants-co-k`, `plants-l-q`, `plants-r-z` and `stones-and-metals`, merged as part 1 only, as each one's doc under `claude-docs/compendium/compendium-seed/` says, and only `resins-woods-and-other` is whole. It also starts after M14.1, which flags the entries a source calls poisonous, and counts the flagged entries and forms beside the seeded totals. It reconciles the seeded totals against `candidates.md`; gathers the six shards' "What is left out" sections into one view in the README; records the final count in DESIGN.md §14 and the wave file; confirms on staging that the admin compendium page's unsourced filter lists no seeded entry; and adds a note to the `SEED_SCENARIO` and `db:reset` docs that `npm run db:seed:compendium` populates a local compendium. Whether it stays separate or folds into MB.248 is open with the owner.

**From M14.10 it reads the markdown files.** `COMPENDIUM` and the TypeScript shards are gone: the tests above run over the `approved` files `loadCompendium()` returns, and a correction reaches staging as a file marked with `npm run seed:mark` (M14.7). The shard docs with the "What is left out" sections of the parts merged before M14.10 are in `claude-docs/archive/compendium-seed-shards/`; the parts after carry theirs in their pull request bodies.

**MB.249 may read `claude-docs/archive/compendium-seed-shards/`.** This is a one-off exception to the archive's rule that nothing reads it, which the owner granted on 2026-10-23, so that the close can count the entries the shard docs left out. No other task reads that folder.

**It checks the safety notes across every shard** (the owner, 2026-10-21). Two rules hold over the whole seed, and this task shows they do. A `safetyNotes` value records a hazard only: none, on an entry or a form, says the thing is safe, generally regarded as safe (GRAS), non-toxic or free of known hazards, and where a source says only that the field is empty. A note that mixes a safe claim with a hazard ("generally regarded as safe; avoid in pregnancy") keeps the hazard and loses the safe clause. And a note and the `toxic` flag agree: an entry or form whose note says it is poisonous, toxic or fatal if swallowed is flagged. Both can be checked by a test over the full `COMPENDIUM` rather than by reading: a note that makes a safety claim fails, whether or not a hazard sits beside it, while a phrase that states a hazard ("not safe in pregnancy") is not a safety claim and passes; and a note matching poison-wording on an unflagged entry or form fails. The task chooses the patterns and names their few exceptions in the PR body. Any entry an earlier part left in breach is repaired here, by the route the staging repair below takes, since the seed writes an entry once; the repair drops the safe clause from a mixed note and keeps the hazard text, and a note that only says "safe" becomes empty.

**Staging is brought back in line with the literal.** The seed writes an entry once and skips it, with everything beneath it, on every later run (`claude-docs/compendium/compendium-seed/README.md`, "Write-once, and how a correction lands"). So an edit to a shard's literal made after a deploy seeded that entry never reaches staging. Two edits made during MB.115 are of that kind: commit `2aa282b5` rewrote 1,078 seed locator lines from "s.v." to "under", and `f007a51b` relinked Almond's Nut form from Apricot as a whole to Apricot's Seed form, since a form's linked substitute now names a form ([`design-decisions/mb.115-variant-substitutes-name-a-form.md`](../design-decisions/mb.115-variant-substitutes-name-a-form.md)). Any entry staging seeded before those commits still holds the old locators and the whole-ingredient link. This task lists what differs on staging and repairs it, by one of two routes, chosen and argued in the PR body: a correction list a keeper works through on staging's compendium page, which is the README's own rule for a correction, or a one-off step that re-applies those two edits to entries already present. Staging's database has not been read for this entry, so the size of the drift is unknown until the task lists it.

**The deploy and the seed say what they did.** `.github/workflows/deploy.yml` re-seeds only when a file on its watch list changed, and the list omits `src/db/seed/standard.ts`, which `compendium.ts` and `compendium/guard.ts` import `identityOf` from; the task adds it. `scripts/db-seed.ts` prints one fixed line for the compendium, so a deploy log cannot tell how many entries a run added; the seed prints the entries it inserted and the entries it skipped. And a seeded entry can stay out of the public pages for up to an hour, because the compendium reads are cached under the `compendium` tag for `COMPENDIUM_REVALIDATE_SECONDS` (3600, `src/lib/compendium-cache.ts`) and only a keeper write clears the tag; the tag is revalidated after a seed run, and how is part of this task's scoping.

**It closes the addendum too** (the owner, 2026-10-23). The roster widened to 1,111 rows (M14.14), and the reconciliation, the left-out view and the final count cover the addendum shards M14.16 to M14.21 as well, so it starts after each of their final parts has merged.

The hours were re-estimated on review on 2026-10-12, from 1: the staging repair, the deploy and seed changes and two more tests join the reconciliation. They remain an estimate.

Tests are written first:

- every seeded entry has at least one live `reference_links` row on its `ingredient_id`
- the seeded entries reconcile against `claude-docs/compendium/compendium-seed/candidates.md`, each candidate row seeded or listed as left out in `compendium/left-out.md`, read from the doc itself (no test reads it today)
- no seeded `safetyNotes` value, on an entry or a form, makes a safety claim (safe, GRAS, non-toxic or free of known hazards), whether or not it also names a hazard; a phrase that states a hazard, such as "not safe in pregnancy", passes
- no seeded entry or form is unflagged while its `safetyNotes` value says it is poisonous, toxic or fatal if swallowed
- the "runs after the standard scenario" test in `tests/db/seed/compendium.test.ts`, which runs `seedCompendium` once, runs it twice and asserts the second run inserts nothing

_Acceptance criteria:_

- The seeded, left-out and candidate counts are recorded and reconcile, the addendum shards M14.16 to M14.21 included
- The entries and forms flagged toxic are counted beside them
- Across every shard, no `safetyNotes` value makes a safety claim, and a mixed note keeps its hazard text with the safe clause removed; every entry or form whose note calls it poisonous, toxic or fatal if swallowed is flagged `toxic`
- The tests above are green over the full `COMPENDIUM`
- On staging, the admin compendium page's unsourced filter shows no seeded entry
- On staging, every entry seeded before MB.115's two edits carries the literal's locators and links, and the PR body names the route taken
- `src/db/seed/standard.ts` is on the deploy's re-seed watch list
- A compendium seed run prints how many entries it inserted and how many it skipped
- An entry a seed run adds shows on the public compendium without waiting for the hour's revalidation
- Per-file coverage of the touched `src/` directories not below the previous run's `.reports/coverage/coverage-summary.json`, or the exception named in the PR body

**MB.250 — Retired into M14.14 on 2026-10-23.** The roster addendum it described is M14.14's work, widened by the owner from 614 to 1,111 rows. Its branch `feature/mb.250-compendium-roster-addendum` (commit 1c8ac0cbe) is superseded, and its mineral rule and notes were carried into the candidate list and `compendium/left-out.md`.

**MB.251 — Call the planets Celestial Bodies wherever a person reads them** · 3h

**MB.252 — The celestial bodies table and columns, beside the planet ones** · 5h

**MB.253 — Read and write celestial bodies under their own names** · 8h

**MB.254 — Drop the planet columns and view** · 2h

**MB.255 — The e2e session cookie never reaches a WebKit page** · 3h

**MB.256 — An unverified account loops on the email page after a link into the shell** · 3h

**MB.257 — The Coven Landing Shows a Blank Page Before Redirecting** · 3h

**MB.258 — The Edit Source Form Leaves Blank Space and Has No Close Button** · 2h

**MB.259 — ~~Category Chips Sometimes Show a UUID Instead of the Name~~** · **RETIRED 2026-10-16, not done**

**MB.260 — Admin Curated Lists Show No Updated Column** · 5h

**MB.261 — The No Refs Switch Cannot Be Toggled With Enter** · 2h

**MB.262 — Mail Shows Its Light Colours in Zoho Mail's Dark Mode** · 3h

**MB.263 — The Coven Links Still Stop on a Blank Page Before the Coven** · 2h

**MB.264 — The Admin Nav Folds Two Tabs on Refresh at Desktop Width** · 2h

**MB.265 — Admin Pages Fail Axe's Title Check Under Load** · 3h

**MB.266 — Curators Reach the Admin Curated Lists Again** · 2h

**MB.267 — Story 18 and the Sign-In Panel Test Pass Every CI Run** · 3h

**MB.268 — Seeded Users Are Verified** · 1h

**MB.269 — A Repeat Invitation Replaces the Pending One** · 3h

**MB.270 — The Search Sentence Types a Changed Term** · 1.5h

**MB.271 — The Back Link Returns to the Same Results and Place** · 3h

**MB.272 — A Click Anywhere on an Ingredient Card Opens Its Entry** · 2.5h

**MB.273 — Claude Design Previews Render in a Narrower, Shorter Frame Than Storybook** · 3h

**MB.274 — Seeded Compendium Content Stays Stale After a Deploy** · 2h

**MB.275 — Lint Warnings Pile Up Because Nothing Fails on Them** · 6h

**MB.1 — Fix prefers-reduced-motion facet swap in ThemeToggle** · 2h

**MB.2 — Fix sun facet swinging in on first paint in light mode** · 1h

**MB.3 — Fix Prettier formatting in `m1.1-neon-branch-strategy.md`** · 0.5h

**MB.4 — Stop destructive-ddl scanning non-migration changed files** · 1h

**MB.5 — Restore `users` foreign keys on `auditColumns`** · 2h

**MB.6 — Spell recipe view page** · 3h

**MB.7 — Application nav shell** · 16h

**MB.8 — Zod schema for spells** · 1h

**MB.9 — `ingredientsById` DataLoader** · 1h

**MB.10 — `usersById` display-name DataLoader** · 1.5h

**MB.11 — GraphQL field exposing the fuzzy duplicate service** · 1h

**MB.12 — Finish the secrets matrix and verify real OAuth sign-in** · 1h

**MB.13 — Stop branch skills setting the base branch as upstream** · 1h

**MB.14 — Key the per-worker test database off `VITEST_POOL_ID`** · 1h

**MB.15 — Delete the redundant smoke-check workflows** · 1h

**MB.16 — Correct the Postgres version across the live docs** · 1h

**MB.17 — Drop the dead `latest` tag from `build-db-image`** · 1h

**MB.18 — Give `build-db-image` the skip-if-exists check** · 1h

**MB.19 — ~~Move `drizzle-kit`/`drizzle-orm` off the `@esbuild-kit` advisory~~** · **RETIRED 2026-09-17, not done**

**MB.20 — Drop `@pothos/plugin-drizzle` from the GraphQL stack** · 1h

**MB.21 — Drizzle Studio for local development** · 1h

**MB.22 — Set up modern debugging tooling** · 8h (explicit exception to normal 1–2h sizing; see the minting note above)

**MB.23 — Playwright codegen for local development** · 2h

**MB.24 — Decide the RLS role split and read-path identity** · 2h · **merged, then superseded by MB.29**

**MB.25 — ~~Split the database roles so RLS applies to the app~~** · **RETIRED 2026-09-17, not done**

**MB.26 — ~~`withViewer`, the read-side identity wrapper~~** · **RETIRED 2026-09-17, not done**

**MB.27 — `vercel pull` ignores branch-scoped variables** · 1h

**MB.28 — Record the ingredient identity model in the design docs** · 1h

**MB.29 — Defer RLS to the public launch; make the second layer a `Membership` proof** · 2h

**MB.30 — Spike Better Auth's organization plugin for workspaces and invitations** · 2h

**MB.31 — Retire transcripts, the MW compression passes and `TASKS.csv`** · 1h

**MB.32 — Collapse the five check workflows onto one matrix** · 2h

**MB.33 — Ban runtime `drizzle-orm` outside the repository by lint** · 1h

**MB.34 — Hard-delete rows in the three join tables** · 2h

**MB.35 — Make category and form groups admin-curated data** · 2h

**MB.36 — Chip colour from the row, not the token** · 2h

**MB.37 — Restore the destructive-DDL gate as a checks leg, scope the local run to the branch** · 2h

**MB.38 — Move the two workshop guards into Vitest** · 1h

**MB.39 — Settle whether a job-level `if:` really renames a check** · 2h

_Story:_ As a developer, I want to know whether the rule the whole CI filtering design is built on is true, so that every path-filtered-off check stops paying for a container it never uses.

**The claim has never been verified in this repo.** "A job-level `if:` makes GitHub report a differently-named, bare check run" arrived at M0.16 (`1db422a`) as a byte-for-byte copy of `resume-2026`'s `should-run` comments — that task's decision record verified YAML parsing and a `diff` against the originals, and nothing about check-run naming. M0.20 re-cited it as upstream's comments, `ecce1f1` lifted it into `../ci/README.md` as a general rule, and MB.32 extended it to matrix jobs. No commit, decision record or transcript describes the symptom being seen, and none could: no ruleset here has ever required a status check.

**What it costs.** The flag is resolved in the leg's first step, which runs _after_ `Initialize containers` — so a filtered-off leg pulls its image and then does nothing. Measured on run `35301237284`: 20s on `checks / typecheck`, 24s on `checks / lint`, 37s on `vitest`, 46s on `playwright`. A docs-only PR wastes all six.

**Two questions, and they are not the same question.** Every assertion in the workflow files is scoped to _the job that calls a reusable workflow_. Whether an `if:` on an **inner** job — `checks.yml`'s `check`, `vitest.yml`'s `vitest` — renames its check is unanswered, and it is the one that matters, since that is where the container is. A third question, whether a `skipped` conclusion satisfies a required check, needs a ruleset to test against and is scoped out unless the user authorises a scratch one.

Probe on a throwaway branch, PR'd into a `scratch/**` base so `pr-gate.yml` — which triggers only on `main`/`staging`/`release/**` — never fires: a `workflow_call` file with both shapes (a matrix job with `if: matrix.should-run`, and two plain jobs with `if: inputs.run-*`, the `vitest.yml` shape), and a caller triggered on `pull_request: branches: ['scratch/**']`. Whether `matrix` is even available to `jobs.<id>.if` is part of what the run answers — a startup failure naming an unrecognized `matrix` value settles the matrix half on its own.

**Result.** The rule holds for a job that calls a reusable workflow, is false for a job inside one, and a matrix job cannot use `matrix` in its job-level `if:`. A `skipped` check satisfies a required status check, and a required check that never reports blocks the pull request. Evidence: [`mb.39-job-level-if-and-check-names.md`](../design-decisions/mb.39-job-level-if-and-check-names.md).

**Adoption is in this task.** At the owner's decision (2026-10-30) MB.39 adopts the inner-job `if:` for the plain jobs: `vitest.yml`'s four jobs and `playwright.yml`'s job carry `if: inputs.should-run`, and their step-level gating is removed. It also splits `checks.yml`'s matrix into eight plain jobs, each path-filtered leg carrying `if: inputs.run-<leg>`, because a matrix leg cannot skip itself and a leg left out of the matrix would never report. No `pr-gate.yml` job that calls a reusable workflow carries an `if:`.

_Acceptance criteria:_

- The verdict comes from `gh api repos/:owner/:repo/commits/<sha>/check-runs`, quoted verbatim — not read off the UI
- `claude-docs/design-decisions/mb.39-job-level-if-and-check-names.md` carries the provenance trace, the probe, the raw output and the verdict; `../ci/README.md`'s bullet is rewritten from it
- Every surviving assertion of the rule in `checks.yml`, `pr-gate.yml`, `vitest.yml`, `playwright.yml` and this file is corrected or given a pointer to the record, in this PR (MB.31)
- Live GitHub settings are unchanged unless the user authorised a scratch ruleset; a permissions-blocked write is reported, not routed around
- The scratch branches and workflows are gone, and `gh api repos/:owner/:repo/rulesets` shows the same three rulesets with the same rule types as before
- If the rule holds, it is recorded as **verified** with the evidence — a negative result is the deliverable just as much as a positive one
- `vitest-dom`, `vitest-node`, `vitest-db`, the `vitest` merge and `playwright` carry a job-level `if:` on `inputs.should-run`, with no step-level `should-run` gating left in `vitest.yml` or `playwright.yml`; `vitest / vitest` and `playwright / playwright` keep their names, and `e2e-cache.yml`'s call still runs the job
- `checks.yml` is eight plain jobs whose check names are identical to the matrix's (`lint`, `format`, `typecheck`, `codegen`, `build`, `destructive-ddl`, `migration-order`, `audit`); `lint`, `typecheck`, `build`, `destructive-ddl` and `migration-order` carry `if: inputs.run-<leg>`, and `pr-gate.yml`'s call is unchanged
- The record names the ruleset probe: the 403 on ruleset writes, that the owner made the changes in the web UI, and that none of the three real rulesets requires a status check today

**MB.40 — Custom one-off spell ingredients (schema)** · 2h

**MB.41 — Move Vitest tests into `tests/`** · 3h

**MB.42 — CI container jobs run against files the repo has deleted** · 1h

**MB.43 — Map service errors to GraphQL errors with field-level detail** · 2h

**MB.44 — ~~Release to `main`, then drop the coverage excludes MB.42 made dead~~** · **RETIRED 2026-09-19, not done**

**MB.45 — `vercel pull --git-branch` is rejected on the production target** · 1h

**MB.46 — CI cannot see what `vercel pull` actually returned** · 2h

**MB.47 — CI cannot read the Sensitive Vercel variables it needs** · 2h

**MB.48 — A destructive-DDL acknowledgement does not survive the release PR** · 3h

**MB.49 — `drizzle-kit` fails silently, so a bad `DATABASE_URL` has no cause** · 1h

##[error]Process completed with exit code 1.

```

No error, no code, no message — `drizzle-kit migrate` catches whatever postgres.js threw and exits 1. Reproduced locally, **an unreachable host, a wrong password, `sslmode=require` against a server with no TLS, and `channel_binding=require` all produce byte-identical output.** Four different fixes, one indistinguishable failure. That is why MB.45, MB.46 and MB.47 each ended on a hypothesis rather than a diagnosis, and it is the actual defect: not any one bad URL, but that a bad URL cannot be told from a bad network.

**A connectivity probe, before the consumer.** `scripts/probe-database.ts` opens the connection itself and runs `select 1`, printing the driver's own error code and message on failure and the role, database and server version on success. `ECONNREFUSED`, `ENOTFOUND`, `28P01`, `3D000` and `42704` are five different problems with five different fixes, and naming which one happened is the whole task. Fatal in `migrate.yml`, where a migration cannot proceed without a connection; advisory in `deploy.yml`, where a build issues no query and failing on a transient blip would trade one outage for another.

**It validates the _resolved_ URL, which is the gap MB.47 reopened.** MB.46's validator only ever saw the file `vercel pull` wrote; MB.47 then took `DATABASE_URL` from a GitHub secret and handed it straight to drizzle-kit, so a malformed secret failed exactly as silently as a malformed pull used to — one task after the gap was closed, by its own successor. `Resolve DATABASE_URL` now writes whichever value won to `$RUNNER_TEMP/resolved.env` under `umask 077`, and the probe reads that. A file path rather than argv or a step `env:`, for MB.46's reasons.

**`channel_binding` is stripped rather than rejected.** It is a libpq _client-side_ option that postgres.js passes through to the server, which answers `42704` ([`ci/deploy.md`](../ci/deploy.md) has the mechanism). The task first rejected it in the validator, but a hotfix's URL is written by Neon's Vercel integration, which adds the parameter and rewrites the variable, so nobody can delete it by hand. `withoutClientOnlyParams` (`src/db/connection-url.ts`) now removes it wherever a connection opens; postgres.js never enforced channel binding, so nothing is lost.

_Acceptance criteria:_

- Tests written first and watched fail — the `channel_binding` rule against `validateDatabaseUrl`, the probe's error-description and scrubbing helpers, and the workflow sweep
- The probe runs in `migrate.yml` before `Apply pending migrations` and in `deploy.yml` before `Build`, fatal in the first and advisory in the second, asserted apart
- Its output names the driver's error code and message and **never** the URL — asserted against a realistic connection string rather than intended, including errors that quote the URL, the password and the userinfo back at it. The hostname is deliberately kept: `ENOTFOUND` without the name it failed to resolve is the same silence this task exists to end
- Client-only parameters are removed from the URL where a connection opens, with a green case for a Neon pooled URL carrying `sslmode=require` alone — postgres.js consumes that one, and removing it would break every working string in the project. (Originally a `validateDatabaseUrl` rejection; see above.)
- The resolved `DATABASE_URL` is validated whatever its source, secret or pulled `POSTGRES_URL`, pinned by a guard — the point is that the gap cannot reopen a second time
- Docs corrected: `../ci/README.md` and `../db/README.md` on what a failed migration now tells you, `secrets.md` on `channel_binding` in what the Neon console hands you
- **Not done when CI is green** — done when a live staging push either migrates, or fails with a named cause somebody can act on

**MB.50 — Make code comments concise; move the arguments into `claude-docs/`** · 6h

**MB.51 — Deduplicate the db-test harness, seed logic and image-build workflows** · 6h

**MB.52 — Admin user list page** · 2h

**MB.53 — Impersonate a user outside production** · 3h

**MB.54 — Set the account's email: prefilled from the provider, editable, verified before it counts** · 3h

**MB.55 — Scan both provider availability states in the e2e accessibility run** · 2h

**MB.56 — Rebuild the Asana board mechanism for the free Personal plan** · 6h

**MB.57 — Build the public entry page at `/`** · 2h

**MB.58 — The admin role ledger (schema)** · 1h

**MB.59 — Grant and revoke admin** · 3h

**MB.60 — Promote the primary admin at sign-in, from Google or Discord only** · 2h

**MB.61 — Scope first-party email verification and email invitations** · 3h

**MB.62 — The admin-role-change pause ledger (schema)** · 1h

**MB.63 — Pause admin role changes** · 2h

**MB.64 — Reduce root-folder clutter** · 2h

**MB.65 — Mail transport: Resend, the Mailtrap Sandbox and Mailpit over HTTP** · 2h

**MB.66 — Turn on Better Auth email verification, audited and session-bound** · 3h

**MB.67 — Provisional accounts: expire unverified rows and sweep them at the next callback** · 2h

**MB.68 — Promote the primary admin at first-party verification** · 1h

**MB.69 — `admin_invitations` schema** · 1h

**MB.70 — Invite an admin by email** · 4h

**MB.71 — Link a second sign-in method from the account page** · 3h

**MB.72 — Scope the mail's light-mode rules beneath the page cell** · 1h

**MB.73 — Serve Altair at `/api/graphql` in local development** · 1h

**MB.74 — Review Better Auth's plugin roster: what lands before launch, what waits** · 2h

**MB.75 — `rate_limits` schema for Better Auth's rate limiter** · 1h

**MB.76 — Pin Better Auth's rate limiter, OAuth token encryption and session lifetimes** · 2h

**MB.77 — Mark the last-used provider on the sign-in page** · 2h

**MB.78 — OAuth proxy, so a hotfix preview can complete a real sign-in** · 3h

_Story:_ As a developer, I want to sign in to a hotfix preview, so that a fix to anything behind sign-in can be checked where it will ship, and MB.53's impersonation works there.

**Post-launch, the owner's call.** It was minted into Wave 8 ahead of MB.53, but hotfixes are not needed until after launch, and the hotfix path needs infrastructure fixes before its branches work properly. It sits unscheduled at the end of Wave 15, and its trigger is the first hotfix after launch that needs a sign-in to check ([`waves/wave-15.md`](../waves/wave-15.md)).

Every provider needs its redirect URI registered in advance, and a hotfix preview's `hotfix-<slug>.sorrelandsalt.com` does not exist until its PR does, so no hotfix preview can finish a sign-in today (`secrets.md`). Better Auth's `oAuthProxy` sends the provider's callback to a fixed `productionURL` whose URI is registered, where the code is exchanged and the profile encrypted, then redirects to the preview's own `/callback/:id/oauth-proxy`, which creates the user and session there. The redirect target must be a trusted origin, and `baseURL.allowedHosts` already names `hotfix-*.sorrelandsalt.com`. `productionURL` is staging's origin, which shares the Preview secret with every hotfix preview. The plugin is registered only at `VERCEL_ENV=preview`, the gate MB.53 uses, so at production and locally it is never constructed and its endpoint is absent rather than refusing. Two things to answer from running code: the preview completes on `/callback/:id/oauth-proxy`, which `src/lib/auth.ts`'s hooks do not match, so the provisional-account sweep and the promotion at sign-in do not run there; and staging's own callback also runs its hooks against a request it did not start. The record says what each means and whether either hook should also match the proxy path.

_Acceptance criteria:_

- Registered only when `VERCEL_ENV=preview`, asserted in both directions, with the endpoint absent, not refusing, at `production` and with `VERCEL_ENV` unset
- `productionURL` is staging's origin, pinned by test
- A real sign-in completes on a hotfix preview, and a recording or screenshot is linked from the PR
- Which of `src/lib/auth.ts`'s callback hooks run on each side is asserted, and the decision on whether they should also match the proxy path is written into the MB.74 record
- `secrets.md` and `../auth/README.md` drop "hotfix previews can't complete a real sign-in" and say how they do; MB.53's entry names MB.78 as what makes it usable on a hotfix preview

**MB.79 — Record subscription billing as a v2 feature and the Stripe plugin's fit** · 1h

**MB.80 — Re-scope the compendium as public and search-indexable** · 2h

**MB.81 — `ingredients.slug`, the pending-slug columns and the `retired_ingredient_slugs` table** · 2h

**MB.82 — Ingredient slugs: set on create, follow a rename, retire with a 308, hand over once confirmed** · 4h

**MB.83 — Public compendium chrome and proxy entries** · 4h

**MB.84 — robots, sitemap, page metadata and noindex off production** · 7h

**MB.85 — Story 63: a visitor reads the compendium without signing in** · 2h

**MB.86 — Restructure `src/` into domain modules with a guarded boundary** · 5h

**MB.87 — Split `src/db/repository.ts` into a `src/db/repository/` folder** · 2h

**MB.88 — One account page: name, email and sign-in methods** · 3h

**MB.89 — Move task tracking from Asana to GitHub Issues and Projects** · 11h

**MB.90 — Day 1 new developer guide, root `.env.example` and `npm run setup`** · 5h

_Story:_ As an engineer new to this codebase, I want one guide that orders what to read and a single command that sets up my environment, so that my first day goes on understanding the system rather than reconstructing how to start it.

A new engineer has no starting point. `README.md`'s "Local setup" is stale — it still says M0 is complete, that `npm run codegen` exits non-zero, and that the `standard` and `demo` seeds have not landed — and the eighteen subsystem summaries under `claude-docs/` have no reading order. The per-subsystem docs are strong; what is missing is the glue and a first-hour walkthrough.

**The deliverable is `claude-docs/day-1.md`**, readable in two to three hours including the doc sections it links to. Twelve sections in reading order — before you start, the first hour, how the site works, the repo map, dev tooling, tests, PR checks, deploys and branches, task tracking and skills, the rules you will trip over, and where to look next — each ending in a "Read next" line naming a verified section heading. It links out and holds nothing the other summaries do not, except the reading order and a request-flow diagram.

**Three structural changes ride in the same PR, because each shortens the guide:**

- A root `.env.example` naming every variable `src/` and `scripts/` read, with safe local values. `.gitignore`'s `.env*` line under `# Scratch` re-ignores it after the earlier `!.env.example` carve-out, so that line goes.
- `scripts/setup.ts`, wired as `npm run setup` and `make setup`: copy-if-absent of `.env.example` to `.env.local`, `Docker/.env.example` to `Docker/.env`, and the two `.vscode/*.example.json` files. It never overwrites.
- `tests/guards/env-example.test.ts`: every variable the code reads is a key in `.env.example` and every key is read somewhere, so the file cannot drift; `setup()` is proven on a temporary tree.

`README.md` loses its status block, and "Local setup" becomes `npm ci`, `npm run setup`, then `make docker-up` or "Reopen in Container", linking the guide. `claude-docs/README.md` gains a row, and CLAUDE.md's Commands table, `secrets.md`, `../testing/debugging.md` and `docker.md` each a line. The scoped plan — section budgets, verified heading names, the `.env.example` contents, the guard's design and the README fix table — is committed on the task's branch as its design-decisions record.

_Acceptance criteria:_

- `claude-docs/day-1.md` exists in twelve sections in reading order, each ending in a "Read next" line whose heading resolves; the guide is 2,500–3,500 words
- The guide links nothing under `claude-docs/archive/`, and does not use the word "catalog"
- `.env.example` names every variable the code reads and nothing it does not, enforced by `tests/guards/env-example.test.ts`; `.gitignore` no longer re-ignores it
- `npm run setup` in a fresh worktree copies four files, and a second run reports all four kept
- `README.md`'s setup section is current and links the guide; `claude-docs/README.md`, CLAUDE.md's Commands table, `secrets.md`, `../testing/debugging.md` and `docker.md` are updated
- `npm run pre-commit` and `npm run test:coverage` pass

**MB.91 — Make the planet and zodiac suggestion lists admin-curated vocabularies** · 2h

**MB.92 — `planets` and `zodiac_signs` schema** · 1.5h

**MB.93 — Seed the planet and zodiac vocabularies** · 1.5h

**MB.94 — Scoped suggestion fields for planet and zodiac** · 4h

**MB.95 — Admin planet and zodiac CRUD** · 2h

**MB.97 — A node Vitest project for the unit files that need no DOM** · 3h

**MB.98 — Gate runs stop when their PR is closed** · 1.5h

**MB.99 — Docker layer cache to the registry** · 1.5h

**MB.96 — Run the vitest job on Blacksmith** · 1h

**MB.100 — Raw SQL only where a rule or the planner needs it** · 3h

**MB.101 — One inserter for an ingredient and its children in tests** · 2h

**MB.102 — Board calls that defer to the Project's workflows and fit the rate limit** · 1h

**MB.103 — Reorder the Project's items into execution order** · 3h

**MB.104 — Rank the compendium search by word similarity, with the score on each edge** · 7h

**MB.105 — Page numbers on the compendium connection** · 4h

**MB.106 — Mark compendium entries New or Updated for 30 days** · 4h

**MB.107 — Drop the pending-slug columns MB.82 stopped declaring** · 1h

**MB.108 — Move type declarations into type-only files** · 8h

**MB.109 — Move the tests' type declarations into type-only files** · 5h

**MB.110 — Make spell layers soft-deletable** · 3h

**MB.111 — Carry the return path through the verification link** · 2h

**MB.112 — Give each Playwright worker its own server and database** · 2h

**MB.113 — Land an admin on the admin area after a sign-in with no return path** · 2h

**MB.114 — Design review: foundations** · 3h

**MB.115 — Design review: the admin area** · 30h

**MB.116 — Design review: the sign-in and account pages** · 8h

**MB.117 — [RETIRED] Design review: sign-in methods** · **RETIRED 2026-10-10, merged into MB.116**

**MB.118 — Design review: the site's mail** · 6h

**MB.119 — Design review: the coven and invitations** · 10h

**MB.120 — Design review: the public compendium and shared ingredient components** · 10h

**MB.121 — Design review: the workspace ingredients page** · 6h

**MB.122 — ~~Design review: the navigation~~** · **RETIRED 2026-10-12, folded into MB.7**

**MB.123 — Design review: the grimoire** · 11h

**MB.124 — Design review: error, loading and empty states, and the whole site** · 7h

_Story:_ As a user, I want errors, loading and empty pages to look as finished as the rest, and the whole site to feel like one thing, so that nothing looks broken.

Minted during M5.4, the last design review, once M11.10's error pages land (M11.16's images come after it, at the end of Wave 15, and check their own accessibility): the 403, 404 and 500 pages (M5.4, M11.10), which need one design whether Next draws them in the browser, as it does a thrown error, or on the server, as it does an unmatched URL (`../auth/README.md`, "The admin guard"); the empty states across sections; and a read of the whole site end to end for anything the section reviews left inconsistent.

A section review designs what the section's building tasks left at the tokens and mixins. It looks at every page and component in the section as built — in the workshop and the running app, in both themes, at desktop and at phone width (375px) — proposes the design as workshop stories and screenshots, and builds what the owner signs off, within the tokens, mixins and primitives MB.114 settles: a value that is not there becomes a token, never a raw hue or size (`styling.md`). Behaviour does not change; a defect found on the way is fixed if it is sub-hour and minted if not.

_Left by MB.116:_ `Notice` is the one way to show an error, a warning or a success sentence (`components/notice.md`), and `GENERIC_FAILURE`, "That didn't work. Please try again.", is the one sentence for a request that got no usable answer. The whole-site read checks against MB.116's copy register (`styling.md`, "Designing a section") and the browser baseline (`styling.md`, "Binding rules"). The not-authorized page already sits in `.page-frame`, the frame the 404 and 500 pages can share.

_Left by MB.115:_ `BusyButton` is the one busy state for a button. The `.data-table`, `.pager` and `.filter-row` primitives are on the Foundations story. Stacking order is still written as raw `z-index` values, one per component; a `$layers` map of them is this review's to make. Each admin table's first cell is still a `td`: making it a row header, `th scope="row"`, was held back from MB.115 because it changes what the tables' tests count as cells.

_Left by MB.119:_ Floating panels open at three widths: the coven switcher at 12rem with its list at 15rem (`$switcher-min-width` and `$switcher-list-min-width` in `WorkspaceSwitcher/index.scss`), and the account menu at 13rem. Settling on one width for a floating panel is this review’s to decide. `ConfirmedAction` still lives inside `UserList/`. Moving it into its own directory, with its CSS split out and its own story and doc, is this review’s too. So is one shared row of confirm and safe buttons for `ConfirmedAction`'s inner `Answers`, the modal's `ConfirmQuestion` and its `DiscardQuestion`, which each draw their own today. That row also replaces the five hand-written confirms the grimoire review found, each a `Modal` with a bold-name question, a `BusyButton` and a quiet Cancel: `SpellRecipe/delete-spell.tsx`, `SpellWorkings/delete-working.tsx`, `IngredientEntry/delete-entry.tsx`, and Make It Ours and Remove from Cupboard in `IngredientEntry/cupboard-writes.tsx`; they become one `ConfirmDialog` beside `ConfirmQuestion` ([`design-decisions/mb.123-design-review-the-grimoire.md`](../design-decisions/mb.123-design-review-the-grimoire.md)).

_Acceptance criteria:_

- The owner signs off the section's design, in both themes and at phone width, recorded as a comment on this issue
- No page in the section scrolls sideways at 375px, and its body copy keeps to the reading measure
- Contrast holds at 4.5:1 in both themes, and no raw hue or size is added outside `_variables.scss`
- Every page in the section is axe clean with visible keyboard focus, and its e2e specs and stories pass
- Accessibility: the 403, 404 and 500 pages, the skeletons and the empty states, and a read of the whole site pass an axe check in Playwright (`@axe-core/playwright`) in both themes. Each page also gets a keyboard-only and a screen-reader pass against WCAG 2.2 AA, and every failure found is fixed or filed as a task
- UX, with research: the review is backed by published UX guidance for error pages, skeletons, empty states and floating panels (for example Nielsen Norman Group, the GOV.UK Design System, the WAI-ARIA Authoring Practices and Baymard). Each change it makes or rejects names its source, in Chicago form. Wikipedia is acceptable; academic or practitioner sources are preferred
- Storybook and /design-sync: a separate agent, not the one doing the design review, updates every Storybook story that the review's changes affect, covering new states, changed props and removed variants (the stories follow the `States`-first convention). That same separate agent then runs `/design-sync`, so the Claude Design project matches, and every changed story grades `match` or `close`
- Each component's doc updates its Styling section, and its stories show the reviewed design
- The 403, 404 and 500 pages share one design, and a thrown one looks the same drawn by the browser as the unmatched 404 drawn by the server
- Every skeleton matches the layout it stands in for
- In the dark theme, the two-factor set-up QR code (drawn light-on-dark) scans in common authenticator apps (for example Google Authenticator, Microsoft Authenticator, 1Password)
- Every finding of the whole-site read is fixed or minted

**MB.125 — Categories on the ingredient writes** · 2h

**MB.126 — Grouped category picker in IngredientForm** · 3h

**MB.127 — Make deities an admin-curated vocabulary** · 2.5h

**MB.128 — `deities` schema** · 1.5h

**MB.129 — Seed the deity vocabulary** · 2h

**MB.130 — Scoped suggestion field for deities** · 2.5h

**MB.131 — Deity, planet, zodiac and substitute lookups in IngredientForm** · 3h

**MB.132 — Admin deity CRUD** · 2.5h

**MB.133 — Long list entries in IngredientForm** · 1h

**MB.134 — Make planet, zodiac sign and colour lists** · 1.5h

**MB.135 — List columns for planet, zodiac sign and colour** · 1h

**MB.136 — Read and write planet, zodiac sign and colour as lists** · 3h

**MB.137 — Drop the single planet, zodiac and colour columns** · 1h

**MB.138 — Let a substitute link an existing ingredient** · 3h

**MB.139 — `ingredient_substitutes` table, filled from the list** · 1.5h

**MB.140 — Read and write substitutes as links or text** · 3h

**MB.141 — Drop `ingredients.substitutes`** · 1h

**MB.142 — Cut the per-turn context: plugin, reporters, stale MCP** · 1h

**MB.143 — Split TASKS.md by milestone and wave** · 3h

**MB.144 — Slim CLAUDE.md into path-scoped rules** · 3h

**MB.145 — Split ../db/README.md by section** · 4h

**MB.146 — Split ../auth/README.md, ../ci/README.md, ../testing/README.md and ../graphql/README.md by section** · 3h

**MB.147 — One home per fact across the docs** · 3h

**MB.148 — A read inside a write runs on the write's transaction** · 3h

_Story:_ As a steward, I want every statement of one save to run on one connection, so that a save cannot deadlock against a migration, and a read inside a write sees the rows and the actor that write has already put down.

Minted during MB.140, which found the cycle. `withAudit` opens a transaction and hands its callback a writer bound to it, but a finder called inside the callback runs through `selectFrom` on the bare client, on a second pool connection. Three reads do so today, all in `src/modules/ingredients/services/ingredient-rows.ts`: the current rows `replaceFolkNames` and `replaceSubstitutes` diff against, and `refuseUnlinkable`'s link check. With such a read in flight, an `ALTER TABLE` queued behind the open transaction blocks the read, which blocks the commit the `ALTER` waits for — a cycle Postgres cannot detect, since one leg is the application waiting rather than a lock, and nothing here sets a timeout. The same cycle is what hangs a test's `truncate` behind an unfinished write. It is also the failure MB.24 names for the deferred policies: a read on a fresh connection finds `app.current_user_id` unset, so under RLS every read inside a write would answer nothing — the re-audit of write paths that publishing the GUC early (M1.19) was meant to spare.

The fix is the unit-of-work half of rule 3 that was never finished. `withAudit` publishes its transaction through an `AsyncLocalStorage`, and `selectFrom` runs on it when one is present and on the bare client otherwise. No finder's signature changes, `existsIn` needs nothing since it only builds SQL, and the service still holds no handle to the transaction, so no write can skip `applyAudit`. A similarity read inside a write takes a savepoint (`tx.transaction`) for its thresholds rather than a transaction of its own. Context-bound rather than an explicit reader on the writer, because the explicit form either grows every finder by a parameter or duplicates the finder surface on `AuditWriter`, for three call sites; the argument and the alternative go in `claude-docs/design-decisions/mb.148-reads-on-the-write-transaction.md`. The rule's long form is corrected rather than changed: "reads open no transaction" came from MB.29 retiring the read-side `withViewer`, and means a read carries identity in the proof and opens no transaction _of its own_ — DESIGN.md §14's row says "to carry identity" — not that a read never joins one. Reading the current rows before the transaction opens, the repo's convention elsewhere with the unique index arbitrating a race, was the cheaper fix and is not taken: it loses read-your-own-writes and keeps the diff racy.

_Acceptance criteria:_

- A finder called inside a `withAudit` callback runs on the callback's transaction: it sees a row the callback inserted and not yet committed, and `pg_backend_pid()` agrees, asserted in `tests/db/repository/write.test.ts`
- A finder called outside one still runs on the bare client, and a connection outside any `withAudit` still sees the GUC unset
- A similarity read inside a write runs under its thresholds in a savepoint, and a write holding one still rolls back whole
- A guard pins that `selectFrom` consults the store and that nothing but `withAudit` writes to it
- CLAUDE.md rule 3 reads "Reads open no transaction of their own"; `.claude/rules/database.md`, `claude-docs/db/write-path.md` and `claude-docs/db/soft-delete.md` state where a read inside a write runs and why; the decision record carries the argument and MB.29's row as read

**MB.149 — Migrations give up a lock they cannot take** · 2h

_Story:_ As a steward, I want a migration that meets a busy table to fail and be rerun, so that a deploy can never hold the site's reads behind a queued `ALTER`.

Minted during MB.140, beside MB.148, which removes the one cycle found; this is the general guard, the standard practice for migrating a live database (Rails' `strong_migrations`, GitLab's migration guidelines), and launch prep rather than a fix, since nothing is live to stall. An `ALTER TABLE` queues behind any open transaction on its table, and while it waits every later statement on that table queues behind it — the public compendium read included — so a long transaction of any kind turns a deploy into an outage for as long as it lasts, and nothing in the migrate job, `drizzle-kit migrate` or `src/db/connection.ts` sets `lock_timeout`, `statement_timeout` or `idle_in_transaction_session_timeout`. The migrate job (`.github/workflows/migrate.yml`) runs before the deploy with the old version still serving, which is expand/contract's premise (rule 10). The task sets a `lock_timeout` of a few seconds on the migration's connection — on the URL as a startup option if Neon's endpoint takes one, which likely means the direct rather than the pooled URL, else a line each migration opens with and a guard that none forgets — and retries the job a bounded number of times with backoff, since `drizzle-kit migrate` has none of its own; `deploy` needs `migrate`, so an exhausted retry is a failed deploy to rerun, not a hang. Confirm first that drizzle-kit applies a batch in one transaction, so an abort rolls back whole and a rerun starts clean; a migration that cannot run in one (`CREATE INDEX CONCURRENTLY`, none today) is a case the doc names. Whether the application's own connections take a `statement_timeout` is a separate decision, noted and not taken here. The seed runs inside the migrate job but opens its own connection through `src/db/connection.ts`, so it does not inherit the timeout, which is harmless since a seed takes no lock a read waits for.

_Acceptance criteria:_

- A migration run against a database where another connection holds a conflicting lock fails within the timeout rather than queueing, asserted against local Postgres
- The migrate job retries a failed migration a bounded number of times with backoff, and a final failure fails the deploy
- The timeout is set somewhere both the job and `npm run db:migrate` go through, or the doc says why the two differ
- `claude-docs/db/expand-contract.md` states the timeout, where it is set and why, and the retry

**MB.150 — Combobox's × buttons move as a button does** · 0.5h

**MB.151 — Record the references model** · 2h

**MB.152 — `references` and `reference_links` tables** · 1.5h

**MB.153 — Read and write references on an ingredient** · 2.5h

**MB.154 — IngredientForm — References field** · 9h

**MB.155 — References section on the ingredient page** · 4h

**MB.156 — Seed the curated vocabularies' sources** · 6h

**MB.157 — Make element a list** · 1h

**MB.158 — List column for element** · 1h

**MB.159 — Read and write element as a list** · 3h

**MB.160 — Drop the single element column** · 0.5h

**MB.161 — Let an unknown classification carry a formal name** · 2.5h

**MB.162 — Hold compendium entries to the curated vocabularies** · 2.5h

**MB.163 — Rewrite a renamed curated value in a background job** · 4h

_Story:_ As a site keeper, I want renaming a celestial body, zodiac sign, form or deity to return at once however many compendium entries hold it, so that fixing a typo in a list the whole compendium uses is not a request that times out.

Minted during MB.162's scoping, on the owner's call ([`design-decisions/mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)); placed on Wave 17 (Fast follow) on the owner's call of 2026-11-03. **Post-launch, and unscheduled by design as M7.A.1 is:** it is not built now, it sits last in Wave 17's row, and only its trigger starts it. The trigger is a _measured_ rewrite time near the function's time limit, not a guess. Until it fires, the rewrite in the rename's own transaction is v1's behaviour. The trigger is unlikely to fire at the compendium's expected size: each rename's rewrite is one set-based `UPDATE` in the rename's transaction (`carryAstrologyRename`, `carryFormRename` and `carryDeityRename` in `src/db/repository/write.ts`). A form or a deity is matched through an index on `form_id` or `deity_id`. A celestial body or zodiac sign rename scans every live compendium entry's list, with no index. The cost is an estimate, not a measurement: under 50 ms at 5,000 compendium entries.

MB.162 holds a compendium entry's forms, celestial bodies, zodiac signs and deities to the live curated rows, and M5.6a, MB.95 and MB.132 keep that so by carrying a rename onto every live compendium entry holding the old spelling, in the rename's own transaction. MB.290 extends that rewrite and the delete check to each compendium variant's own `celestial_bodies` and `zodiac_signs` lists, so this task builds on MB.290 as well as on M5.6a, MB.95 and MB.132, and its job must cover the variants' lists too. A form rename moves no slug: since MB.215 a slug comes from the name and the formal name alone (DESIGN.md §5; `claude-docs/db/ingredient-slugs.md`), and a form is a variant's `form` text plus its `form_id` pick, so there is nothing to re-key or re-slug.

Background jobs exist now. The site runs durable jobs on Vercel Workflows ([`design-decisions/m15.49-job-mechanism.md`](../design-decisions/m15.49-job-mechanism.md)) and daily Vercel Cron routes ([`design-decisions/m15.46-daily-jobs-from-vercel-cron.md`](../design-decisions/m15.46-daily-jobs-from-vercel-cron.md)). The expected job is a Workflow run started after the rename commits. The task still records the alternatives it weighed: that, a cron draining a record of owed rewrites, and `after()` on the response.

A job started after the commit can fail to start, and then nothing would record that a rewrite is owed. For a celestial body or sign, the old spelling must be recorded in the rename's own transaction. The expected shape is a column on the curated row, cleared by the job's last step, as M15.50 keeps `former_email` ([`design-decisions/m15.50-mail-through-a-retried-job.md`](../design-decisions/m15.50-mail-through-a-retried-job.md)), not a new table, so the table-task and behaviour-task split does not apply. A form or a deity needs no record: a sweep can find stored text that differs from the row its `form_id` or `deity_id` points at. If starting the job throws, the rename can carry in the request as today, the fallback `src/modules/support/services/retention-start.ts` uses.

The task decides how the window between the rename and the rewrite keeps MB.162's rule. Forms and deities are picked by id (MB.167), so a form's or deity's stored text would only lag beside a correct id. Celestial bodies and zodiac signs are still matched by spelling (`curatedSpellings` in `src/modules/ingredients/services/compendium.ts`), so only those two can misread in the window, since an entry then holds a spelling no live row has. Ways to keep the rule include matching the old spelling as curated until its rewrite lands, refusing a second rename or a delete of the row while one is pending, or making the window short enough to name rather than close. The task also decides what an entry edited during the window writes.

It also decides the writer's proof. The carry writers take a `Curator` proof minted by `assertCurator(session)`, and a job step runs as the seeded System account and has none. Either the renaming curator's id is passed into the run, or a proof-less writer is added and guarded as `rotateInvitationToken` is (CLAUDE.md, rule 5). A failed rewrite must be retried or surfaced, never dropped: a lost one leaves entries holding a value no list has, which MB.131's headings and MB.162's write check would then misread.

_Acceptance criteria:_

- The mechanism is recorded in a `design-decisions/` record with the alternatives weighed (a Workflow run started after commit, a cron draining a record, `after()`), and DESIGN.md §14 gains its row
- The trigger is met first: a measured rewrite time near the function's time limit, recorded in the record
- A rename returns without rewriting the compendium in its request, and once the job has run every live compendium entry's own lists, each live variant's `form`, `celestial_bodies` and `zodiac_signs`, and each `ingredient_deities.name` hold the new spelling, asserted by row; no slug moves
- The old spelling of a renamed celestial body or sign is recorded in the rename's own transaction, so a job that fails to start is recovered, asserted by forcing the start to fail
- How the window keeps MB.162's rule is decided and asserted: an entry saved, a second rename and a delete of the row during it each behave as the record says
- The job step writes as the renaming curator or through a proof-less writer guarded as `rotateInvitationToken` is, and the record says which
- A rewrite that fails is retried or surfaced to a keeper, never dropped, asserted by forcing one to fail
- A coven's ingredients and variants are still never rewritten

**MB.164 — Show what a picked substitute is** · 2h

**MB.165 — Record the picked form and deities beside their text** · 2.5h

**MB.166 — Fill `ingredient_deities` from the list** · 1h

**MB.167 — Read and write the picked form and deities** · 6.5h

**MB.168 — Drop `ingredients.deities`** · 1h

**MB.169 — Show what a picked form and deity are** · 3h

**MB.170 — Reorder the ordered list fields** · 3h

**MB.171 — `seed_key` on the seeded tables** · 1.5h

**MB.172 — The vocabulary seeds key on `seed_key`** · 2h

**MB.173 — Refuse a migration older than its base's newest** · 2h

**MB.174 — Stop the list fields offering or adding a repeat** · 3h

**MB.175 — Scope Help and FAQ Articles: the Model, the Glossary, Sub Pages and Their Build Tasks** · 1h

_Story:_ As the owner, I want the help and FAQ articles, the glossary and the sub pages designed, recorded and broken into build tasks, so that visitors and members can later find their way and look up what a word means without asking someone, and the build is transcription.

**Amended 2026-11-03, the owner's call:** the help articles gain a glossary. A glossary entry is a third `kind` of help article, `term`: one row per term, its `title` the term and its `body` a short Markdown definition, so a keeper adds or edits a term as they would an article. `/help/glossary` lists every term from A to Z, each with an anchor from its `slug`, so a page or an article can link to one term (`/help/glossary#steward`). `position` is not used for a term. The slug `glossary` is reserved, so no article can take that address. The `help` seed ships the site's own terms, each defined the way `CLAUDE.md`'s Vocabulary and domain invariants use it: at least Compendium, Ingredients, Grimoire, Coven, Steward, Practitioner, and Observer (M15.79), Keeper (M15.79), Curator, Spell, Working, Variant, and Form.

Minted during MB.154 on the owner's request. **It was v1 scope by the owner's decision of 2026-11-03, in Wave 15, and moved to Wave 17 (Fast follow), before M17.6, on the owner's call of 2026-11-06.** The help pages ship after launch, so the Wave 15 axe sweep does not cover them and the Wave 17 accessibility audit (M17.9) does. The shape was decided at minting so the build is transcription, recorded in DESIGN.md §10 ("Help and FAQ articles"): the articles are rows a keeper edits, not files in the repo, so one changes without a deploy — a `help_articles` table (`id`, `kind` of `faq`, `article` or `term`, `title`, `slug` from `slugify`, `summary`, `body` as Markdown, `position` for the FAQ's order, `seedKey`, a nullable `parent_id`, + audit; `slug` unique among live rows on a partial index), written under `assertSiteAdmin` alone through `withAudit`, read by a finder taking no session and cached under a tag of its own, as the compendium is; `/keepers/help` on M5.6a's page shape with a body field and a preview; `/help`, the FAQ and the article index, and `/help/[slug]`, an article rendered through the standard sanitising Markdown renderer, both public and indexable on MB.83's frame with its signed-in island, in `PUBLIC_ROUTES` and the sitemap as MB.84 has them, linked from `Welcome`, the public frame, `AppShell` and M11.10's 404; the articles themselves shipped as a `help` seed target keyed on `seed_key` (MB.171), in `migrate.yml`'s step and `deploy.yml`'s paths; and a story, numbered next free when it runs (MB.176 took 65), with its acceptance file. Two CLAUDE.md lines widen for it, each an architecture decision to record rather than route around: "Admins curate the compendium … and nothing else" gains the help articles, and "The compendium is the one public surface" gains `/help`, which carries no workspace data. An eighth module `help` (`src/modules/help/`) owns the table (claude-docs/modules.md, "Adding a module"). This task is the scoping record and the minting: the build follows as five PRs, one per task — M17.13 the table, M17.14 the services and GraphQL, M17.15 the keepers' page, M17.16 the public pages with the glossary and sub pages, M17.17 the seed — under the table-then-behaviour rule, and each sits in Wave 17 after this task and before M17.6.

**Amended 2026-11-06, the owner's call (from M17.2):** a help article may have a parent article, for sub pages. A nullable `parent_id` on `help_articles` points at another article of kind `article`, one level deep, and `/help/[slug]` lists its children. M19.8's closed-practice help pages need it: one general page and one per practice, `/help/closed-practices/<practice>`.

_Acceptance criteria:_

- The model is recorded in DESIGN.md §5, §7, §9 and §10, and in a `design-decisions/mb.175-help-articles.md` weighing rows against files in the repo, with the two invariants it widens
- CLAUDE.md's two lines are amended in the same PR; the out-of-scope list already no longer names it (the owner's decision of 2026-11-03)
- The glossary is recorded in the same places: the `term` kind, the A-to-Z `/help/glossary` page with an anchor per term, the reserved `glossary` slug, and the seeded list of terms
- The five build tasks, M17.13 → M17.17, are minted with estimates, placed after this one in Wave 17 and before M17.6, and each names its prerequisite; the public-pages task builds `/help/glossary` and the seed task ships the terms
- The parent article is recorded in the same places: a nullable `parent_id`, one level deep, a child's address under its parent's, and the five build tasks carry it (the table task the column, the public-pages task the nested route and the children list)
- Nothing is built in this task

**MB.176 — ~~Bug reports~~** · **RETIRED 2026-10-31, not done**

**MB.177 — Every admin holds `canCreateWorkspace`** · 2h

**MB.178 — Search and filter the admin categories list** · 1.5h

**MB.179 — Keep the test suite inside Postgres's connection limit** · 2h

**MB.180 — Test-layer ownership, and a per-file time budget in the PR comment** · 1.5h

**MB.181 — `IngredientForm`'s list field and closed sets tested as components** · 5h

**MB.182 — The reference panel and compendium mode on their own harness** · 1.5h

**MB.183 — Seeds: one reseed per file, the shared shape once** · 2h

**MB.184 — Guards share one scan; plan tests share one seed** · 1.5h

**MB.185 — The ingredients GraphQL files hold the transport's half** · 2.5h

**MB.186 — The vocabulary, identity and coven GraphQL files, the same way** · 1.5h

**MB.187 — Services own the rules; repositories own the mechanism** · 2h

**MB.188 — Catalogue sweeps once, and the auth module imported once per file** · 2h

**MB.189 — Config moves, the admin pages' half, and the closing measurement** · 1.5h

**MB.190 — ~~Release and main-sync PRs skip the gate's checks~~** · **RETIRED 2026-10-09, not done**

**MB.191 — The coverage provider chosen by measurement, istanbul against v8** · 1.5h

**MB.192 — A reseed of `standard` puts a deleted deity pick back at the end of its list** · 1h

**MB.193 — The workspace creation ledger (schema)** · 1.5h

**MB.194 — `user_privilege_changes`, the one privilege ledger (schema)** · 2h

**MB.195 — Privilege changes record themselves, with their route** · 3h

**MB.196 — Nothing declares the two old privilege ledgers** · 1.5h

**MB.197 — Drop `admin_role_changes` and `workspace_creation_changes`** · 1h

**MB.198 — One table mark replaces the state-ledger markers** · 2h

**MB.199 — Read the privilege ledger** · 2h

**MB.200 — The privilege ledger page** · 3h

**MB.201 — `invitations`, one two-tier table (schema)** · 2h

**MB.202 — Invitations are written and read by tier** · 2.5h

**MB.203 — Drop `workspace_invitations` and `admin_invitations`** · 1h

**MB.204 — The provisional-account sweep skips an account holding a privilege change** · 1h

**MB.205 — Warn before approving an unverified account for coven creation** · 1h

**MB.276 — An Admin's Compendium Edit Saves Whatever the Autosave Timing** · 4h

**MB.277 — The Unused Code Check Finds Nothing Left to Clear** · 4h

**MB.278 — The Gitflow Check Reads Pull Request Values Safely** · 1h

**MB.279 — Pages Carry Security Headers** · 3h

**MB.280 — Invitation Mail Is Limited per Sender** · 3h

**MB.281 — An Unverified Account Reaches No Workspace Data Through the API** · 3h

**MB.282 — The GraphQL Endpoint Refuses Cross-Site Requests** · 3h

**MB.283 — An Email Change Needs a Recent Sign-in and Tells the Old Address** · 4h

**MB.284 — Changing an Email Address Answers the Same Whether or Not It Is Taken** · 2h

**MB.285 — Compendium Entries Stay Pending After the Citation Wording Changed** · 4h

**MB.286 — Seven Cosmetic Faults in Loading, Spell Preview and Quick Look** · 7h

**MB.287 — A Production Deploy Rerun Fails at the Neon Snapshot** · 2h

**MB.288 — Bug Bash 2026-11-02: Ingredient Edits, the Formal Name Eyebrow and the Terms Screens** · 6.5h

**MB.289 — Crawlers Hit Blocked Links and Index Few Compendium Pages** · 6.5h

**MB.290 — Renaming or Deleting a Celestial Body or Zodiac Sign Misses Compendium Variants** · 3h
```
