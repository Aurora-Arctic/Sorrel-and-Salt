# MB.156, with two new tasks before it: seed keys

## Context

MB.156 seeds the curated vocabularies' sources as compendium-tier `references` rows, idempotent by the rendered citation.

**The problem.** The owner asked what happens when an admin edits a seeded reference. After the edit, the next reseed no longer recognises the row and inserts the original again as a twin. The vocabulary seeds have the same gap today:

- They key by slug, and a slug is derived from the name.
- The admin CRUD tasks (M5.6, M5.6a, M5.6b, MB.95, MB.132) all rename and re-slug a row.
- So a reseed after a rename brings the original back.

**The owner's call (option C):** every seeded row records a stable key the seed recognises whatever an admin later does to the row, for every data type this can happen to.

**Which types those are.** Only the reference data `migrate.yml` seeds on every deploy that changes a seed file:

- the eight vocabulary tables: `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`, `planets`, `zodiac_signs`, `deity_traditions`, `deities`
- `references`, from MB.156

**Not covered, and why:**

- The scenarios (`minimal`, `standard`, `demo`) run only on fresh local and test databases, never on a deployed one, and key by fixed id.
- `reference_links` is keyed by `(row, reference)` ids, which no edit changes.

No admin rename writer exists yet, so every vocabulary row now deployed still carries the slug the seed gave it. That makes a backfill exact.

**Board convention:** "a table task, then a behaviour task". So this becomes three PRs, in order:

1. **MB.171** — `seed_key` on the seeded tables (DDL plus backfill)
2. **MB.172** — the vocabulary seeds key on it
3. **MB.156** — the sources seed, keyed from the start

MB.171 and MB.172 are new ids; MB.170 is the highest id minted anywhere. I re-check for the next free id, and `git log`, before minting.

## MB.171 — `seed_key` on the seeded tables · 1.5h

**The column.** Each of the nine tables gains a nullable `seed_key text` and an index on it.

- **The index:** a partial unique `<table>_seed_key_unique` on `(seed_key) WHERE seed_key IS NOT NULL AND deleted_at IS NULL`, partial under rule 4.
- **Seed-only:**
  - Nothing outside `src/db/seed/` writes the column.
  - No Zod input, GraphQL field or service names it, so an admin never sees or edits it.
  - The row types pick it up through `$inferSelect`, harmlessly.
- **What it holds:**
  - for a vocabulary row, the slug the seed derived when it inserted the row
  - for a reference, the citation `citationText` rendered at insert
  - for a row an admin or a member wrote, null

**The migration.** One `db:generate` migration, `000N_seed-keys.sql`. It is additive, so it needs no `.ack.md`.

- It backfills `UPDATE <t> SET seed_key = slug WHERE created_by = '<bootstrap id>'` for the eight vocabularies.
- `references` has no seeded rows yet, so it gets no backfill.
- MB.168 also adds a migration, and whichever merges second regenerates its number.

**Tests:**

- **A schema test per module** (`tests/modules/vocabulary/schema/…`, `tests/modules/ingredients/schema/references-schema.test.ts`):
  - The column is nullable.
  - The index refuses a second live row with the same key, and admits one beside a soft-deleted row.
- **A replay test:** following `spells-schema.test.ts`'s `0018` replay, it reads the migration's `UPDATE` off disk and applies it to rows written beforehand.
  - A bootstrap-made row takes its slug as its key.
  - A row made by another user keeps null, which proves the `created_by` guard is what decided it.

**Docs:**

- **DESIGN.md:**
  - §5 adds `seedKey` to the nine tables' column lists, with one paragraph on what it holds and why.
  - §14 adds a decision row: "How does a reseed recognise a row an admin renamed or edited?"
- **`claude-docs/db/seed-module.md`:** a "Seed keys" section.
- **The decision record:** `design-decisions/mb.171-seed-keys.md`. It covers options A to D with the owner's reasons, and C's cost: a seed-only column on domain tables, and three PRs where there was one.
- **This plan** is copied to `design-decisions/mb.171-plan.md`.

**Minting rides in this PR's branch** ([`.claude/rules/task-tracking.md`](../../.claude/rules/task-tracking.md), "Minting a task"):

- **New task entries:** the MB.171 and MB.172 entries in `tasks/mb.md`.
- **MB.156's entry amended:**
  - It is keyed by `seed_key`, after MB.172.
  - Its estimate goes from 2h to 6h. The doc normalisation below is about 250 citations, plus the astrology research.
- **Execution order:** Wave 8's row in `TASKS.md` and `waves/wave-08.md` reads `MB.154 · MB.171 · MB.172 · MB.156`.
- **Board:** the ids go into the Wave 08 milestone description's first line. Then `gh issue create`, `estimate`, `sync MB.156`, and `reorder --apply`.
- **If auto mode refuses** the `gh` writes, as it has before, I hand you the commands.

## MB.172 — The vocabulary seeds key on `seed_key` · 2h

**The seed's key.** `seedFlatVocabulary` and `seedTwoTierVocabulary` (`src/db/seed/flat-vocabulary.ts`, `two-tier-vocabulary.ts`) change in three ways:

- **What counts as present:** every row's `seed_key`, live or soft-deleted, plus every live row's slug.
- **Why both:**
  - The key recognises a seeded row an admin renamed or soft-deleted.
  - The live slug stops the seed colliding with a row an admin created under the same name, which `*_slug_unique` would otherwise refuse.
- **On insert:** each new row is written with `seedKey: slugify(name)`.
- **Unchanged:** `insertMissing` (`src/db/seed/idempotent.ts`) is reused as it is. Only `existing` and `toRow` differ.

**A latent bug this fixes.** `seedTwoTierVocabulary` resolves an item's group through `groupIdByName`, by the group's current name. If an admin renamed a group, the seed would throw. It now resolves through `seed_key`, as `slugify(groupOf(item))`.

**Tests**, in `tests/db/seed/` (the forms, categories, astrology and deities seeds share the helpers, so the deity and astrology tests carry them):

- **Rename:** rename and re-slug a seeded deity and a seeded tradition directly in SQL, as M5.6-style writers will, then reseed. Nothing is added, and the renamed rows are unchanged.
- **Soft delete:** soft-delete a seeded planet, then reseed. Nothing is resurrected.
- **An admin's row:** an admin-created live row under a seed name blocks that insert without an error.
- **The precondition:** each test first asserts that the row's slug no longer equals its key, so it would fail under slug keying.

**Docs:** these docs say "idempotent by slug" and now say "by seed key":

- `form-vocabulary-seed.md`
- `astrology-vocabulary-seed.md`
- `category-seed.md`
- `deity-vocabulary-seed.md`
- `db.md`
- `seed-module.md`

## MB.156 — Seed the curated vocabularies' sources · 6h

### The deity doc, normalised (the owner's layout choice)

**Each tradition section:**

- The top-level bullets are the tradition's sources. Each one is one full citation, exactly as `renderCitation` prints it, with italics written as `_…_`.
- `Per-deity:` bullets keep `**Deity** (gloss) — commentary` as prose. Each work the bullet relies on becomes a nested bullet: one full citation, optionally followed by `·` and a locator. `·` appears nowhere in the doc today.

**Back-references.** "Atsma, 'Pan' (above)", "Grimm …, above" and "Raglan, above" become the full citation repeated. It is the same row, deduplicated by citation.

**The fixes `db/references.md` lists:**

- The 56 inline comma-form citations become period-form nested bullets.
- "Revised" becomes "Last modified".
- "Originally published in …" and the unparenthesised "Existence confirmed at …" become notes.
- Grimm's "Vol. 1, chap. 13" and Tacitus's "Chap. 40" move onto links as locators.
- `Ovid. _Fasti_ 6.` becomes `_Fasti_` with locator "book 6", and Beckwith's chapter "Hina Myths" becomes a locator. Cases like these are resolved one by one.

**The rule:**

- The doc bends to the renderer, never the reverse; MB.151 settled the renderer.
- Information a kind's template has no slot for goes into `note` or the locator, and is never dropped.
- A work the prose cites, as "Theoi's 'Iris' page" is, becomes a nested citation. A work the prose only names in passing stays prose.

**The intro list** ("Which deities to list", five sources) becomes rows with no links, the owner's call.

### The astrology doc, recast in Chicago form

- **Fresh fetches:** each of the seven pages is fetched today for its author, title, site and dates, so it's accessed October 6, 2026.
- **The Goodreads link** is someone's reading notes, so it's replaced by the book itself: George, Demetra, with Douglas Bloch, _Asteroid Goddesses_. The book is confirmed through a publisher or Open Library record, as the deity doc confirms its books.
- **Grouping:**
  - Each group gets a `####` heading and a `Linked to:` line naming its bodies, which the test parses.
  - **The traditional seven and their rulerships:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, and the twelve signs that are not Ophiuchus.
  - **The outer planets:** Uranus, Neptune, Pluto.
  - **The asteroids:** Ceres, Pallas, Juno, Vesta. Booksie's chapter also links Lilith, if the page bears that out.
- **Unlinked bodies:** Earth, Chiron, the nodes and Ophiuchus stay unlinked, as the doc already says.

### The seed

**`src/db/seed/sources.ts`:**

- **The literal:** `SOURCES: SeedSource[]`, each one `{ reference: CitationFields, traditions?, deities?: { name, locator? }[], planets?, zodiacSigns? }`, transcribed from the docs.
- **Its comment** follows `deities.ts`'s: the doc, not this file, is where a source is argued.

**The `seedSources(db)` / `seedSourceLinks(tx)` pair** follows `seedDeities` / `seedDeityVocabulary`, inside `beginSeedTransaction`:

- **References:**
  - The seed key is `citationText(reference)`. Present means any compendium reference's `seed_key`, live or deleted.
  - Failing that, a live compendium reference with no key whose citation is identical is adopted for linking and never written to. An admin who typed the same source gets no duplicate.
  - Each new reference is inserted with `seedKey`.
- **Links:**
  - A tradition's source links to the tradition and to every deity the `DEITIES` literal files under it.
  - A per-deity citation links to its deity alone, and its locator overrides the tradition-level link for that deity. The unique `(deity_id, reference_id)` allows one link.
  - Targets resolve by `seed_key`, so renamed rows still link.
  - Present means any link for that `(target, reference)` pair, live or deleted, so nothing is resurrected.

**The wiring:**

- **`scripts/db-seed.ts`:** a `sources` target.
- **`package.json`:** `db:seed:sources`.
- **`migrate.yml`:** `npm run db:seed:sources` after `deities`, and the summary string names sources.
- **`deploy.yml`'s paths:** `src/db/seed/sources.ts` and both docs.
- **`standard`** calls `seedSourceLinks(tx)` after `seedDeityVocabulary`, so local data has references.

### The test: `tests/db/seed/sources.test.ts`

**Parse:**

- **The deity doc:** the intro sources, each tradition's sources, and each deity's nested citations and locators.
- **The astrology doc:** its groups and their `Linked to:` names.
- **The parse is checked** against stated counts (sources, tradition links, deity links, planet and sign links), and every name parsed must exist in `DEITY_TRADITIONS`, `DEITIES`, `PLANETS` or `ZODIAC_SIGNS`.

**Render:** every `SOURCES` entry's parts are joined with `_` around italic parts. The set must equal the docs' citations, string for string, and the links must equal the parsed links.

**The database**, emptied first, following `deities.test.ts`:

- **Rows and links:**
  - Every reference is a compendium-tier row.
  - A per-deity citation links its deity alone. One named case: Eostre's Grimm link carries "vol. 1, chap. 13".
  - Each tradition's source reaches every deity under it.
- **Stamps:** created by the bootstrap user, with the GUC published.
- **Reseeding:**
  - adds nothing
  - leaves a soft-deleted reference and link soft-deleted
  - after an edited title, adds no twin and leaves the edit in place (asserting first that the citation changed)
  - adopts an admin's identical reference without writing to it

### Docs

- **`db/references.md`:** "What the seed doc needs" becomes "How the seed reads the docs".
- **`seed-module.md`, `commands.md` and `db.md`** name the `sources` target.
- **The two seed docs** are normalised as above.

## How I'll run it

- **MB.171:** its own worktree off `origin/staging`.
- **MB.172:** stacked on MB.171's branch. Approving this plan is the one ask the stacking rule needs.
- **MB.156:** stays in its own worktree.
  - The doc normalisation and the literal don't depend on MB.171 or MB.172, so they start now.
  - The tradition sections can be split across subagents (allowed by your standing feedback), each returning its normalised section and literal entries.
  - The branch merges MB.172 in before the seed's keyed insert is written.
- **Board:** each task is commented and moved to In Progress as its branch is created, and nothing is committed or PR'd until you ask.

## Verification

**Per task:**

- `npm run pre-commit`.
- `npm run test:coverage` under the shared flock (a shared lock file), after checking `ps` for other vitest runs.

**MB.171 and MB.172:**

- `npm run db:reset`, then `db:seed:categories`, `forms`, `astrology`, `deities` twice; the second run writes nothing.
- `npm run check:destructive-ddl` flags nothing.

**MB.156:**

- `npm run db:seed:sources` twice on a reset database.
- A `psql` count of `references` and `reference_links` matching the test's stated counts.
- One deity's references read back through the GraphQL `Ingredient.references` path's renderer, to eyeball a page-ready citation.
