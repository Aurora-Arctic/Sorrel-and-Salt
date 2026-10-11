# MB.240 to MB.249 — the approved plan

_Copied verbatim from the approved plan on 2026-10-11 (the owner's rule: a scoping plan is recorded beside the decision it led to), its headings moved down one level, and every task id one higher than the plan wrote it: the plan named these tasks MB.239 to MB.248, and MB.239 was taken on `staging` by another task ("Two tests that depend on the order of the tests in their file", PR #853) while this one was in progress. Where MB.240 built something differently, [`mb.240-compendium-seed.md`](mb.240-compendium-seed.md) says so._

## Plan: a researched, sourced compendium seed (614 ingredients)

### Context

No task researches or writes the compendium's real entries. Every compendium task so far built the machinery around it (M4, M5, M8, MB.151–MB.156), and `claude-docs/waves/wave-08.md` line 3 says the compendium "is populated by hand rather than by editing seed files". The only compendium content in the repo is the `standard` fixture: 26 deliberately awkward entries in `src/db/seed/standard.ts`, which staging and production never run (`claude-docs/db/standard-scenario.md`; `.github/workflows/migrate.yml` seeds only the five vocabularies and their sources).

The owner reversed the wave 8 line on 2026-10-11: seed the compendium with "a decently large catalog", researched and sourced, with the research handed to Opus agents. Decisions taken in this session:

| Decision    | Owner's answer                                                                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Size        | **614 ingredients**, the parent rows keyed by formal name. Forms (variants) are additional rows beneath them and do not count.                                                                                                           |
| Depth       | Cunningham depth: 100–250 words of description per entry.                                                                                                                                                                                |
| Sourcing    | "Do not make stuff up. All claims must have sources." Every field value traces to a reference the lane agent read during the task; an unsourced claim is left out. **Wikipedia is a valid source**, beside the others, never a fallback. |
| Books       | The owner provides copies of the in-copyright correspondence references in `/app/.library/` (gitignored, never committed), so a lane reads the passage and cites the page.                                                               |
| Compression | Researched below; the answer is no.                                                                                                                                                                                                      |

The seed is built on the ingredient-variants model (MB.215, merged to staging through MB.221; MB.222 in progress in worktree `iv-g`, MB.223 unstarted): one `ingredients` row per formal name holding what its forms share, and one `ingredient_variants` row per form carrying that form's own description, safety notes, lists, categories, substitutes and references.

### What the research found

Three Opus agents reported on 2026-10-11, then a fourth designed the breakdown. Numbers are theirs; provenance is as they gave it. Anything marked "estimate" is one.

#### Comparable references (entry counts)

| Reference                                                         | Entries                                                     | Provenance                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Cunningham, _Encyclopedia of Magical Herbs_ (1985; 2nd ed. 2000)  | 400+ herbs                                                  | publisher blurb via LibraryThing, MIT Press Bookstore |
| Cunningham, _Encyclopedia of Crystal, Gem & Metal Magic_ (1988)   | 100+                                                        | blurb via Apple Books                                 |
| Beyerl, _A Compendium of Herbal Magick_ (1998)                    | 330                                                         | bookseller blurb                                      |
| Kynes, _The Witches' Encyclopedia of Magical Plants_ (2021)       | 550+                                                        | kynes.net                                             |
| Hall, _The Crystal Bible_ vols 1–3                                | 200+ / 200+ / 250+                                          | Hachette AU, Penguin Random House                     |
| Melody, _Love Is in the Earth_                                    | 1,400+ minerals                                             | listing via eBay                                      |
| Grieve, _A Modern Herbal_ (1931)                                  | 800+ (blurb); ~980 entry pages on botanical.com             | agent's own count of the A–Z index                    |
| Culpeper, _Complete Herbal_ (1653)                                | 314 "Government and Virtues" headings in the Gutenberg text | agent's own count                                     |
| sacredwicca.com herbs                                             | ~380–395 one-line headwords                                 | agent's own count                                     |
| Wikipedia, "List of plants used in herbalism"                     | 164 rows                                                    | agent's own count                                     |
| Ceilings: IMA mineral species 6,226; accepted plant species ~358k | —                                                           | Wikipedia IMA list; worldplants.de                    |

No open dataset of magical correspondences of any size exists on GitHub or Hugging Face (agent's search).

614 sits between the standard single-volume herbals (330–400) and Kynes plus a crystal book (550+ and 100+). Split, scaled from the agent's 1,000-tier proportions (estimate): plants ~400, minerals and metals ~135, resins, woods and incense ~50, animal, salts, waters and other ~30.

#### Licensing

- Public domain, quotable and adaptable: Culpeper (1653, Gutenberg #49513); Grieve in the UK (d. 1941), in the US from 2027-01-01 by the agent's reading of the 95-year term (not legal advice); Duke's databases (CC0); Wikidata (CC0). Wikipedia is CC BY-SA: cite and attribute it.
- In copyright, facts and correspondences citeable, prose written fresh: Cunningham, Beyerl, Kynes, Illes, Hall, Melody. **Read from the owner's copies, cited with the page of that edition.**

#### Size, and why no compression (measured in this repo)

| Measurement                                       | Value                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `COMPENDIUM_INGREDIENTS` as written today         | 345 B per entry (26 entries, comments included)                                                                  |
| Deity seed doc with sources                       | 1,113 B per row                                                                                                  |
| Git's own packing of this repo's seed text        | 9.5× (deity doc, 5 versions), 11.8× (`standard.ts`, 26 versions)                                                 |
| gzip of the deity doc, then deflated again by git | 54,267 → 54,293 B: nothing gained                                                                                |
| `.git` today                                      | 23 MB; pack 13.46 MiB                                                                                            |
| GitHub limits (docs.github.com)                   | 500 KB diff per file; 1 MB / 20,000 lines / 300 files per PR; 1 MB recommended per object; 50/100 MiB warn/block |

Projection at 614 ingredients, Cunningham depth (estimate: ~2 KB per ingredient for literal plus fields plus citation keys, from the sizing agent; extra variants on top): roughly 1.2 MB of TypeScript literals plus the docs, packing to about 0.5 MB in git, about 2% of today's `.git`. A single file of that size would not render in a PR, which is the only real limit. **Decision: no compression; shard the seed into files of ~100–135 ingredients each, one shard per PR.** A compressed blob is unreviewable, gains nothing over git's packing, and loses delta storage on every edit. Git LFS would spend the free bandwidth quota on a problem a hundred times smaller than it solves.

#### Constraints in the codebase (verified against `origin/staging`)

- `ingredients` and `ingredient_variants` carry **no `seed_key`** (MB.171 put it on the nine tables `migrate.yml` seeds; `claude-docs/design-decisions/mb.171-seed-keys.md`). Without it an admin's relabel or formal-name edit would make the next reseed re-insert the original.
- **Nothing seeds an ingredient's references, substitutes or colours**: `SourceTargetTable` in `src/db/seed/types.ts` excludes `ingredientId` and `ingredientVariantId`; `SeedIngredient` has no `colors`, substitutes or references.
- The admin's unsourced filter is `citesNothing('ingredientId')` (`src/db/repository/ingredients.ts:420`): it counts **entry-level** links only, so every entry needs at least one ingredient-level reference.
- `pickedIdByName` in `standard.ts` throws when two live curated rows share a name. "Curio" is a group and a form in different tables, so nothing collides today, but picks by `seed_key` survive an admin's rename where picks by name do not.
- The curated lists the seed may name: 78 forms in 6 groups (`src/db/seed/forms.ts`), 63 categories, 216 deities in 35 traditions, 19 planets and points, 13 signs including Ophiuchus, five elements.
- The repo cites Wikipedia as kind **`entry`** (64 rows in `sources.ts`, rendered `Wikipedia, s.v. "…"`), so the compendium does the same, with `url` the revision permalink (`?oldid=`) and `accessed` the fetch date.
- The `standard` scenario is cloned for every db test (`tests/support/seeded-database.ts`), so the production seed is its own `db:seed:compendium` target, never folded into `standard`. `standard` uses real names (Mugwort, Rosemary, Amethyst…), so a local database always overlaps the production seed.
- `ingredient_categories` is hard-deleted (MB.34): a reseed that re-added missing children would put back every category an admin unfiled.
- `deploy.yml`'s `seed-changed` job decides a reseed from an explicit file list (lines ~82–135); it omits `idempotent.ts` today and still lists two seed docs no test reads. `migrate.yml` runs: categories, forms, astrology, deities, sources.
- `tests/db/seed/index.test.ts`'s `SEED_ENTRIES` sweep runs three tests over every production seed (fills from empty with bootstrap stamps; a second run is byte-identical; soft-deleting one row per tombstoned table and re-running adds nothing). MB.225's acceptance says "five production seeds"; this makes six.
- No test parses the seed docs any more (MB.225); comments in `deities.ts` and `sources.ts` saying otherwise are stale. Coverage excludes `src/db/seed/**`. Lint is oxlint with no `max-lines`; prettier formats seed TS and `claude-docs` markdown at printWidth 100 and never breaks strings. TypeScript ^7 (native) makes 10k lines of annotated literals cheap to check.
- Seeds are never in the app bundle: only `scripts/db-seed.ts` (tsx) and tests import them.
- The container has `unzip` and `node`, no `pdftotext`, `pandoc` or calibre. The Read tool reads PDFs page by page (20 pages per request); an EPUB is unpacked with `unzip` to HTML chapters.
- **Next free task id is MB.240**: MB.235–MB.238 are claimed by branches `feature/mb.235…238` (not yet in any `mb.md`). Re-check at minting.

### Design decisions

1. **Write-once per entry.** The run that inserts an entry writes everything beneath it (variants, folk names, deities, categories, substitutes, reference links). A present entry is skipped with all its children. This keeps the three `SEED_ENTRIES` sweeps true without per-child keys and never re-files a category an admin removed. The cost: a correction to a landed shard's literal does not reach staging or production; corrections are made in the admin UI and the literal updated to match. The README says so.
2. **`seed_key` on `ingredients` only.** The key is `lower(coalesce(canonical_name, name))`, the identity key as the seed wrote it. "Present" is any of: a row with that `seed_key`, live or deleted; a live compendium row with that `identity_key` (an admin's or the `standard` fixture's); a live compendium row holding the derived slug (MB.172's live-slug rule, so an index violation never aborts the CI transaction). Rows found by identity or slug are left untouched and not stamped. `standard` keeps keying on identity and writes no `seed_key`. Variants need no key under write-once.
3. **Picks go through `seed_key`, never the name.** Forms, deities and categories map `slugify(literal name)` to the curated row's seed key, then to its id and current spelling. Planets and signs are stored as the live row's current name (MB.162). A soft-deleted pick is skipped; a name no seed wrote throws, as `sources.ts`'s `linksOf` does.
4. **References reuse the sources mechanism.** `insertMissingReferences` is extracted from `sources.ts` into `src/db/seed/reference-rows.ts` with no behaviour change; both seeds key references on `citationText`, so a work the sources seed already wrote is linked, not twinned. Works shared across shards (Cunningham ×2, Kynes ×2, Hall, Beyerl, Culpeper, Grieve, Kunz, Folkard, POWO, Mindat) are declared once in `src/db/seed/compendium/works.ts`; per-entry pages (Wikipedia, botanical.com) in each shard's `SOURCES` under short handles.
5. **The literal is the source of truth; the doc records the sources.** Duplicating rows in markdown at the deity precedent's ~1.1 KB per row would add ~700 KB nothing checks. Each shard doc holds: scope; a Chicago bibliography; **one source line per entry** naming which source supports which fields; and "What is left out, and why" (the deity doc's section). CLAUDE.md's "records its sources in its seed doc" is met by the per-entry line. The owner's rule is enforced in the literal: every citation carries `supports: Field[]`, and the guard fails any populated field no citation covers.
6. **The guard is a pure function**, `checkCompendium(entries, sources) → issues[]` in `src/db/seed/compendium/guard.ts`, run in a DB-free test and again inside `seedCompendium` before its transaction opens, so an invalid literal never reaches production. It checks: identities and slugs unique across shards; the nomenclature⇔canonical-name rule, and binomial shape for botanical, fungal and zoological names (`Genus species`, optional `subsp.`, `var.`, quoted cultivar); every form, category, deity, planet, sign in the curated seeds (by slug); every colour in a closed lower-case British list; **every entry cites ≥1 entry-level reference and every variant ≥1 of its own**; every populated field covered by some citation's `supports`; every handle resolves; `book` and `chapter` citations carry a locator; citation texts pairwise distinct; substitutes resolve to a seeded identity and are never self-referential; entry descriptions 100–250 words, variant descriptions ≤120 (a default for the owner to adjust).
7. **The owner's book library.** `/app/.library/` (absolute, so a worktree lane finds it) is gitignored; a guard test (`tests/guards/`) fails if any tracked file ends `.pdf` or `.epub`. The README names the expected files and their editions. A lane reads a PDF with the Read tool by page range (the page is the locator) or an EPUB unpacked by `unzip` into a scratch folder (the entry heading is the locator). A citation names the edition in hand. No prose is copied from any source, public domain or not.
8. **Order in `migrate.yml`:** a sixth line, `db:seed:compendium`, after `sources`. Like `sources`, it throws if the curated seeds have not run. Inserts are chunked at 1,000 rows inside the shared helper, under Postgres's 65,535-parameter statement limit.
9. **Formal-name rules (README).** Plants by POWO's accepted name, genus alone where practice does not split species. Minerals as `<Species> var. <variety>` as `standard` does (`Quartz var. amethyst`), so amethyst, citrine and rose quartz stay three identities. Metals and salts as `chemical`. Animal products as variants under the animal's binomial (honey and beeswax are both _Apis mellifera_). Preparations no system names (black salt, moon water) as `none`.
10. **A substitute whose target is in a later shard** is recorded as a typed `name`, which the table allows, never as a link the seed cannot yet make; a lane may link only identities in its own or an earlier shard, and the guard checks it.
11. **A pilot before the lanes.** MB.242 seeds 14 real ingredients, one of each kind (botanical, fungal, zoological with two variants, mineral variety, chemical metal, salt, resin, wood, a `none` water…), researched to the full rule with their own doc, so the shape, the guard and the CI path are proven on real data before six lanes depend on them. They count toward the 614.

### Tasks (execution order)

Every entry follows `.claude/rules/task-tracking.md` "Minting a task": heading `**MB.N — title** · Nh`, `_Story:_`, "Minted on 2026-10-11 …" prose, "Tests are written first:", `_Acceptance criteria:_` ending with the per-file coverage line, then mb.md's summary table, TASKS.md's wave 8 row, a wave-08 paragraph, the milestone description line, `task-board.mjs estimate/sync/reorder`. Hours are estimates of agent execution, calibrated as stated.

#### MB.240 — The compendium seed: scope, sourcing rules, the candidate list and the library · 3h

- **Story:** As a site admin, I want the compendium's starting entries decided and their sourcing rules written down, so that six research lanes fill one list without overlapping or inventing anything.
- **Builds (docs and minting only; can start now on staging):**
  - `claude-docs/db/compendium-seed/README.md`: the entry template with a worked invented example; the field-to-`supports` names; the closed lists by reference to their seed files; the sourcing rules (below); write-once and the correction rule; mineral naming in `standard`'s form (`Quartz var. amethyst`); the library layout and reading method; the 26 `standard` names so lanes spell their formal names the same way.
  - **The candidate list** (`claude-docs/db/compendium-seed/candidates.md`): ~614 rows of label, formal name, nomenclature and shard, drawn from several works (the owner's books' indexes, Grieve's and Culpeper's indexes, Wikipedia lists), each list source a Chicago row, so the seed mirrors no single book's selection.
  - This plan copied to `claude-docs/design-decisions/mb.240-plan.md`.
  - `.gitignore` gains `.library/` **in the branch's first commit**; `tests/guards/` gains the no-tracked-books test.
  - `pdfjs-dist` devDependency and `scripts/library-text.mts` (extract PDFs page by page, unpack EPUBs), with a `library:text` npm script; the README lists each file's exact edition read from its title page.
  - Corrections: `wave-08.md:3` reversed; DESIGN.md §11 gains a sentence (the production compendium is seeded as reference data, not a scenario); §14 gains a row ("Is the compendium seeded? Yes, sharded, write-once, MB.240"); `claude-docs/db/seed-module.md` names the target.
  - Mints MB.240–MB.249.
- **Acceptance:** no two candidate rows share an identity, every row names its shard, every list source is a Chicago row; DESIGN, the wave file and §14 agree; the guard refuses a tracked `.pdf`/`.epub`.
- **Calibrated against:** MB.127 (2.5h, a 216-row researched list with sources), MB.215 (2h, a model record).

#### MB.241 — `seed_key` on `ingredients` · 1h

- **Story:** As a maintainer, I want a seeded compendium entry to carry the key the seed gave it, so that an entry an admin renames is not seeded again beside itself.
- **Builds:** `seedKey: seedKeyColumn()` and `seedKeyUnique('ingredients_seed_key_unique', table)` in `src/modules/ingredients/schema/ingredients.ts` (builders in `src/db/schema-parts.ts`); `db:generate` → migration 0065, additive, no sidecar.
- **Tests first:** `tests/db/partial-unique-indexes.test.ts` gains the index row; the drift test picks the column up.
- **Acceptance:** exactly one column and one partial unique index; drift test green; nothing reads or writes the column yet.
- **Waits for:** MB.223 (0064). **Calibrated against:** MB.171 (1.5h, nine tables), MB.223 (1h).

#### MB.242 — `db:seed:compendium`, the guard, CI and a 14-ingredient pilot · 6h

- **Story:** As a site admin, I want the compendium seeded on staging and production the way the curated vocabularies are, so that every entry arrives sourced and nothing an admin changed is undone.
- **Builds:**
  - Types in `src/db/seed/types.ts`: `SeedCompendiumEntry` (ingredient fields + `colors`, `folkNames`, `deities`, `categories`, `substitutes: { identity, form?, substituteForm? }[]`, `references: { source: handle, locator?, supports: Field[] }[]`, `variants[]` each with description, safety notes, the four lists, categories, substitutes, references).
  - `src/db/seed/compendium.ts` (`seedCompendium(db, entries = COMPENDIUM)`), `src/db/seed/compendium/{index.ts, works.ts, colours.ts, guard.ts}` with `COMPENDIUM = []` until the first shard; `reference-rows.ts` extracted from `sources.ts`; `identityOf` and the variant insert reused from `standard.ts` as MB.222 leaves them.
  - Wiring: `scripts/db-seed.ts` target, usage and error text; `package.json` `db:seed:compendium`; `migrate.yml` sixth line, input description and summary text; `deploy.yml` list gains `src/db/seed/compendium.ts`, `src/db/seed/compendium/`, `reference-rows.ts` and `idempotent.ts`.
  - Docs: `claude-docs/ci/deploy.md` ("all six"); `claude-docs/db/references.md` (how the compendium links its sources); MB.225's "five" corrected; the stale comments in `sources.ts` and `deities.ts` fixed.
  - The pilot: `src/db/seed/compendium/pilot.ts` and `claude-docs/db/compendium-seed/pilot.md`, 14 ingredients researched to the full rule from the library and the online sources, which also calibrates the lanes' hours.
- **Tests first:** guard rules each fail once on an invented fixture and `COMPENDIUM` yields `[]` (`tests/db/seed/compendium-literals.test.ts`, DB-free); `tests/db/seed/compendium.test.ts` on an invented two-entry fixture shard: seeds whole (variants with picks, children, entry- and variant-level links); a reference `sources.ts` wrote is linked not twinned; an entry present by `seed_key` (live or deleted), live identity or live slug is untouched with nothing beneath it written and no key stamped; a soft-deleted pick is skipped; an unknown form throws; the seed runs cleanly after `standard`. `SEED_ENTRIES` gains a sixth entry over the fixture shard owning `ingredients`, `ingredient_variants`, the four child tables, `references` and `reference_links`.
- **Acceptance:** the guard fails any entry or variant citing no reference, any field no citation supports, any value outside the closed lists, in the test and before the transaction; a reseed adds, moves and resurrects nothing; bootstrap stamps on every row; `migrate.yml` runs the target after `sources` and `deploy.yml` reseeds when the folder changes; the sources seed's tests unchanged and green.
- **Waits for:** MB.222 and MB.241. **Calibrated against:** MB.156 (6h), MB.172 (2h), MB.129 (2h).

#### MB.243–MB.248 — Content shards, one PR each, one Opus lane each, in parallel across worktrees

| Id     | Shard (`src/db/seed/compendium/<shard>.ts` + `claude-docs/db/compendium-seed/<shard>.md`) | Ingredients (target) | Hours |
| ------ | ----------------------------------------------------------------------------------------- | -------------------- | ----- |
| MB.243 | `plants-a-c`                                                                              | ~100                 | 6     |
| MB.244 | `plants-d-k`                                                                              | ~100                 | 6     |
| MB.245 | `plants-l-r`                                                                              | ~100                 | 6     |
| MB.246 | `plants-s-z`                                                                              | ~100                 | 6     |
| MB.247 | `resins-woods-and-other` (resins, woods, incense; animal, salts, waters)                  | ~80                  | 5     |
| MB.248 | `stones-and-metals`                                                                       | ~135                 | 8     |

_Note added by MB.240 when it committed the candidate list: the list moved the plant split points to Co, L and R for balance, so the shards are `plants-a-cn` (112 rows), `plants-co-k` (116), `plants-l-q` (104) and `plants-r-z` (98), with `resins-woods-and-other` at 48 and `stones-and-metals` at 136. The resins, woods and other ingredients came in under this table's ~80 because few of the sources read name them, and no row was added without a source. The table above is left as the plan wrote it._

Split points come from MB.240's list, balanced by count. Each shard is ~200–300 KB and 2,500–3,500 lines (estimate), inside every GitHub limit. Each lane conflicts with the others on one line of `compendium/index.ts`; MB.243 merges first because it switches `SEED_ENTRIES` to `COMPENDIUM` and adds the precondition `COMPENDIUM.length > 0`.

- **Story (per shard):** As a reader, I want [shard] in the compendium with its forms, correspondences and safety notes, each traced to a source, so that the reference I consult says nothing it cannot back.
- **Tests first:** none new; the guard and the `SEED_ENTRIES` sweeps run over the real list.
- **Acceptance (per shard):** seeded entries plus "What is left out" rows equal the shard's candidate rows, and a lane that would leave out more than a tenth of its roster stops and raises it with the owner before opening its PR; every entry cites ≥1 entry-level reference and every variant ≥1 of its own; every populated field is covered by `supports`; the doc has a per-entry source line; the guard is green; `db:seed:compendium` is idempotent from empty and after `standard`; prettier and oxlint green; the PR body states that every cited page or URL was read during the task; the variant count is recorded in the doc without a target.
- **The lane brief** (in every content task): the README's closed vocabularies by curated spelling; the entry template; 100–250 words, British spelling, written fresh. Hard rules: every field value traces to a source **read during the task** (the owner's book by page, or a fetched URL); a claim with no source is left out, never filled from memory; never invent a page, URL, edition or year; locators only from what was read; `accessed` is the real fetch date; an entry that cannot be sourced at depth goes to "What is left out, and why". Source standing: academic preferred (POWO for plant names, Mindat for minerals, NCBI LiverTox and NCCIH for safety); Wikipedia (as `entry`, revision permalink), Grieve, Culpeper, Kunz, Folkard, Dyer and the owner's books are all first-class. No prose copied from any source. Shared works by handle from `works.ts`. Substitutes link only to identities in the same or an earlier shard. Every seeded entry carries at least its primary form as a variant; further variants only where a read source attaches something to that form.
- **Calibrated against:** MB.127's rate (216 deity rows plus sources in 2.5h, ~96 KB/h); a 100-entry shard is ~270 KB of literal and doc, ~3h at that rate, doubled for read-before-cite and per-field sourcing. The pilot's actual time re-calibrates the six before they are briefed.

#### MB.249 — Close the compendium seed · 1h

- **Builds:** reconcile seeded totals against the candidate list; consolidate "left out" across shards; DESIGN §14 and the wave file gain the final count; confirm on staging the admin's unsourced filter lists no seeded entry; a `SEED_SCENARIO`/`db:reset` note ("run `db:seed:compendium` for a populated local compendium").
- **Acceptance:** counts recorded; a test proves every seeded entry has ≥1 `ingredient_id` link.
- **Calibrated against:** MB.223 (1h).

### Sequencing and hours

| Task       | Starts                    | Hours (estimate) |
| ---------- | ------------------------- | ---------------- |
| MB.240     | now, on staging           | 3                |
| MB.241     | after MB.223 merges       | 1                |
| MB.242     | after MB.222 and MB.241   | 6                |
| MB.243–245 | after MB.242, in parallel | 24               |
| MB.247     | after MB.242, in parallel | 5                |
| MB.248     | after MB.242, in parallel | 8                |
| MB.249     | after all six shards      | 1                |
| **Total**  |                           | **48**           |

### Risks

| Risk                                                                               | Mitigation                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overlap with `standard`/`demo` on a local database                                 | Present-by-identity and present-by-slug skip cleanly; the reverse order (fixture after compendium) adds fixture children to production entries, harmless locally and documented. |
| 614 not reached under the leave-out rule                                           | Acceptance counts seeded plus left out against the candidate list, not 614.                                                                                                      |
| Compilation copyright (mirroring one book's selection)                             | Candidates drawn from several works; correspondences cited per entry, never transcribed as a table.                                                                              |
| The books leak into the public repo                                                | `.library/` gitignored and a guard test refusing tracked `.pdf`/`.epub`.                                                                                                         |
| Write-once hides a later literal correction                                        | Stated in the README; corrections through the admin UI.                                                                                                                          |
| MB.162's curated-value rule, bypassed by the seed                                  | The guard plus `seed_key` picks; a soft-deleted curated row is skipped.                                                                                                          |
| Spelling drift in colours and signs                                                | Closed lists in the guard.                                                                                                                                                       |
| Citation drift across lanes                                                        | Shared works in `works.ts`; the guard requires distinct citation texts.                                                                                                          |
| Reseed cost in CI and the db test (the full list seeded three times by the sweeps) | Batched inserts in one transaction; MB.243 records the run time.                                                                                                                 |

### Execution: worktrees and parallel Opus agents (the owner's call)

Every task runs in its own worktree under `/home/node/worktrees/` with its own `feature/*` branch, driven by an Opus agent briefed with the task entry, the README and the lane rules; `/app` (clean, on `feature/mb.116…`) may host one lane. A rebuild deletes `/home/node/worktrees`, so each lane commits every green step after `npm run pre-commit`, runs the full verification once at task end, and gets its PR agent unasked when verified (the PR body ends with the progress tally). Parallel Vitest runs take the `flock` the devcontainer notes describe; e2e serialises on `/tmp/sorrel-e2e.lock`. Lanes read the library by absolute path, `/app/.library/`, since a worktree holds no copy of an untracked folder; the extractor writes `/app/.library/text/`.

| Stage | Worktree, branch                                                                     | Task                                                                                           | Starts                                                                   | Base                                                                                              |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1     | `cs-scope`, `feature/mb.240-compendium-seed-scope`                                   | MB.240: `.gitignore` first commit, extractor, README, roster, mint MB.240–248, doc corrections | now                                                                      | `origin/staging`                                                                                  |
| 1     | `cs-schema`, `feature/mb.241-ingredients-seed-key`                                   | MB.241 (and MB.223 before it if still unstarted when the lane opens, as its own PR)            | now, stacked                                                             | MB.222's branch until it merges (the stacking rule: ask once, this plan's approval is the answer) |
| 2     | `cs-seed`, `feature/mb.242-compendium-seed`                                          | MB.242: mechanism, guard, CI, pilot                                                            | when MB.241 is green                                                     | MB.241's branch until it merges                                                                   |
| 3     | `cs-plants-a`, `cs-plants-b`, `cs-plants-c`, `cs-plants-d`, `cs-others`, `cs-stones` | MB.243–MB.248, six Opus lanes in parallel                                                      | when MB.242's pilot is green and its hours have re-calibrated the briefs | MB.242's branch until it merges; MB.243 merges first                                              |
| 4     | `cs-close`                                                                           | MB.249                                                                                         | after the last shard merges                                              | `origin/staging`                                                                                  |

Board writes: auto mode blocks `gh` label, issue and project writes, so the minting lane prepares the issue bodies and hands the owner the `task-board.mjs` commands to apply, or asks for a permission rule once.

### Verification

- MB.240: `npm run pre-commit`; `node scripts/task-board.mjs find MB.240 … MB.249` each match one issue; the guard test fails on a staged `.pdf` and passes without.
- MB.241: `npm run db:migrate` applies 0065; `npm run test:coverage` (db project: partial-unique-indexes, schema-drift).
- MB.242: `npm run test:coverage`; `npm run db:reset` then `npm run db:seed:compendium` twice with the fixture shard, the second run writing nothing; `npm run build`.
- Each shard: the guard test; `npm run db:seed:compendium` from empty and after `SEED_SCENARIO=standard npm run db:reset`; `npm run test:coverage`; `npm run e2e` once per lane, since the compendium pages read the seeded tier; a spot check on the dev server at `/compendium`.
- MB.249: on staging, the admin compendium page's unsourced filter is empty.

### The library the owner provides (`/app/.library/`)

**Warning, to act on first:** `/app/.library/` exists with nine in-copyright files (85 MB) and is **not yet in `.gitignore`**; `git status` shows it untracked. Until MB.240's first commit adds the ignore line, nothing may run `git add -A` or `git add .` in `/app`. (Plan mode forbade editing `.gitignore` in this session.)

**What is in the folder on 2026-10-11** (identified from EPUB metadata; PDFs from their filenames until the extractor below reads their title pages):

| File                                                                      | Identified as                                                                                                                                  | Status                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `dokumen.pub_cunninghams-encyclopedia-of-magical-herbs-…epub`             | Cunningham, _Encyclopedia of Magical Herbs_, Llewellyn ebook 2012-03-01, ISBN 9780738717135 (the 2nd-edition text)                             | priority 1, present                 |
| `Encyclopedia of Crystal Gem And Metal Magic - READ - fb - READ.pdf`      | Cunningham, _Encyclopedia of Crystal, Gem & Metal Magic_ (edition from title page)                                                             | priority 1, present                 |
| `dokumen.pub_the-witches-encyclopedia-of-magical-plants-…epub`            | Kynes, _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_, Llewellyn ebook 2024, ISBN 9780738775647 | priority 1, present                 |
| `9780738732534.pdf`                                                       | Kynes, _Llewellyn's Complete Book of Correspondences_, 2013                                                                                    | priority 1, present                 |
| `dokumen.pub_the-crystal-bible-volume-1-…epub`                            | Hall, _The Crystal Bible Volume 1: The Definitive Guide to Over 200 Crystals_, ebook ISBN 9781841814131                                        | priority 2, present                 |
| `American Herbal Products Associations Botanical Safety Handbook (…).pdf` | Gardner and McGuffin, eds., _AHPA Botanical Safety Handbook_, 2nd ed., CRC 2013                                                                | priority 3, present                 |
| `Master Book Of Herbalism PDF.pdf`                                        | Beyerl, _The Master Book of Herbalism_ (Phoenix, 1984; confirm from title page)                                                                | extra, in place of the _Compendium_ |
| `dokumen.pub_herbal-remedies-for-beginners-…epub`                         | Kynes, _Herbal Remedies for Beginners_, Llewellyn ebook 2020, ISBN 9780738761961                                                               | extra; uses and cautions            |
| `the_book_of_herbs_1903.pdf`                                              | _The Book of Herbs_ (1903), public domain; author from title page                                                                              | extra; lore                         |
| —                                                                         | Beyerl, _A Compendium of Herbal Magick_ (1998); Melody, _Love Is in the Earth_                                                                 | absent                              |

**Reading method.** The container has no poppler, so the Read tool cannot open a PDF here (confirmed 2026-10-11). MB.240 adds `pdfjs-dist` as a devDependency (pure JavaScript, no native build, the standard Mozilla extractor) and `scripts/library-text.mts`, which writes one text file per page into `.library/text/<book>/<page>.txt` (inside the ignored folder) for every PDF, and unpacks each EPUB with `unzip` into `.library/text/<book>/` as HTML chapters. A lane then reads with `grep` and the Read tool: a PDF page's number is its locator, an EPUB entry's heading is. The README records each file's exact edition once the title pages are read.

The editions below were verified against bookseller or publisher pages on 2026-10-11; the README names whichever edition is actually supplied.

| Priority | Title                                                                               | Author                     | Publisher, year                 | ISBN-13                 |
| -------- | ----------------------------------------------------------------------------------- | -------------------------- | ------------------------------- | ----------------------- |
| 1        | _Cunningham's Encyclopedia of Magical Herbs_, expanded and revised 2nd ed.          | Scott Cunningham           | Llewellyn, 2000                 | 978-0-87542-122-3       |
| 1        | _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_                           | Scott Cunningham           | Llewellyn, 1988 (printing 2002) | 978-0-87542-126-1       |
| 1        | _The Witches' Encyclopedia of Magical Plants: Your Ultimate Acacia-to-Zinnia Guide_ | Sandra Kynes               | Llewellyn, March 2024           | 978-0-7387-7548-7       |
| 1        | _Llewellyn's Complete Book of Correspondences_                                      | Sandra Kynes               | Llewellyn, 2013                 | 978-0-7387-3253-4       |
| 2        | _The Crystal Bible, Volume 1_                                                       | Judy Hall                  | Godsfield, 2003                 | 978-1-84181-175-8       |
| 2        | _A Compendium of Herbal Magick_                                                     | Paul Beyerl                | Phoenix, 1998                   | 0-919345-45-X (ISBN-10) |
| 3        | _Love Is in the Earth: A Kaleidoscope of Crystals_, updated ed.                     | Melody                     | Earth-Love                      | 978-0-9628190-3-2       |
| 3        | _AHPA Botanical Safety Handbook_, 2nd ed.                                           | Gardner and McGuffin, eds. | CRC Press, 2013                 | 978-1-4665-1694-6       |

Grieve (botanical.com) and Culpeper (Gutenberg #49513) are online and need no copy.

### Open items for the owner

- Whether Beyerl's _Compendium_ or Melody will be added later (the lanes work without them).
- The variant description ceiling (120 words proposed).
- Whether MB.249 stays separate or folds into MB.248.
