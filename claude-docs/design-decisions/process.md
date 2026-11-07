# Process decisions

How the project is tracked, documented and kept cheap to work in, with the plans kept beside their decisions.

## Dependency audit and its follow-on tasks

**Status:** decided. Live home: `claude-docs/dependencies.md`.

### Decision

- **The audit is a standing record, `claude-docs/dependencies.md`.** Four follow-on tasks do the moves: an in-range refresh (`npm update` to the wanted column), React Email 6 (`@react-email/components` to `react-email`), msw 3, and dropping `graphql-request` (`design-decisions/graphql.md`, "`graphql-request` replaced by a fetch wrapper").
- **Order:** the record first (it mints the other tasks), the in-range refresh next so the later three diff against fresh ranges. The msw and `graphql-request` moves are independent of each other and can run in parallel worktrees.
- **Not minted, each with a written trigger in the record:** `graphql` 17 (waits on `@escape.tech/graphql-armor`) and the drizzle 1.0 line.

### Why

Each move is its own task and PR (one task per PR) and each needs its own verification: `pre-commit` and `test:coverage` always, plus the build check and `workshop:build` for the mail move, and `test:stories`, the full `e2e` and the build check for the refresh.

### Rules out

- One omnibus upgrade PR.
- Minting a task for a move whose blocker is upstream.

## Token-efficiency rules

**Status:** decided. Live home: `claude-docs/token-efficiency.md`; the short form is `CLAUDE.md`, "Spending tokens".

### Decision

- **`CLAUDE.md` carries a short "Spending tokens" section** that applies to any contributor's session and to subagents: cap tool output (a pass prints only its verdict; on a failure read the failing part with `tail`, `grep` or `jq`; read a file over about 300 lines by section); never mask an exit code (log to `.reports/<name>.log`, `echo "exit $?"`, then tail the log, and never pipe a build straight into `tail`); verify once (run the specs a change touches, the full suites only when the owner says so); suggest `/clear` at a task boundary.
- **A rule Claude cannot carry out itself becomes "suggest it to the owner".** `/clear`, `/compact` and `/usage` are commands only the owner can type.
- **Every rule yields** when the owner asks for the opposite, or when following it would thin a test.
- **The long form is `claude-docs/token-efficiency.md`**: why a long session costs more per turn, why agents start cold (about 35–40k tokens of startup context each, an estimate) and the build-log recipe. It cites `claude-docs/testing/where-tests-live.md` for `env -u CLAUDECODE` rather than restating it.
- **Personal defaults live in the owner's own `~/.claude/CLAUDE.md`, not the repo**: few agents (brief once, follow-on steps by `SendMessage`), Sonnet by default, no polling, suggest `/usage` when spend looks high.

### Why

Each always-loaded line and each cold agent start is paid on every turn, so a default with an exception is cheaper than a reminder. Tests are the guardrails, so no token rule may thin one.

### Rules out

- Repo rules that assume Claude can run `/clear` or `/compact`.
- Piping a build into `tail`, which masks the exit code.

## Comments say how the code works, and nothing else

Decided from a survey of every comment under `src/` and `tests/`. The plan that was approved follows below as "Comment guidelines and the cleanup that applies them (plan)".

### What was measured

`*.ts` and `*.tsx` only; the generated `src/gql/` excluded. Counts are from grep and awk over whole-line comments, so trailing `//` comments are missed, and every count is an estimate.

| Measure                           | src               | tests          |
| --------------------------------- | ----------------- | -------------- |
| Comment share of all lines        | 22% (25,411)      | 10% (12,730)   |
| Comment lines naming a task id    | 2,349             | 1,418          |
| Files with such a line            | 695               | 530            |
| Lines with "the owner's call"     | 291               | 166            |
| Lines with an ISO date            | 234               | 134            |
| Comment runs longer than 12 lines | 126 (2,085 lines) | 11 (170 lines) |

`types.ts` files were 47% comment (121 files, 4,629 comment lines against 5,249 of code). The longest run was 39 lines, a display specification in a component file's header.

The kinds the old rule (`claude-docs/README.md`, "Comments in code", as written by MB.50) banned by name were rare: restating the code under 10 lines, name-repeating JSDoc about 24, caller lists about 23, postmortems about 8, commented-out code none. The rule aimed at the wrong targets, and it allowed the single largest kind, a task id as provenance for a constraint.

### What was decided

1. **A comment describes the code as it is.** What this is and, where the obvious alternative would be wrong, why it is built this way instead, in one present-tense clause.
2. **History lives in the docs.** No task ids, with no provenance exception; no Story or Wave references, decision attributions, dates or forward-looking notes. A constraint that looks arbitrary cites a doc section, which carries the provenance.
3. **One to three lines**, one per field, with the old rule's protected facts (behaviour invisible from the code, tool and runtime facts, the Testing rules' reasoning, tool-read comments) kept whatever their length.
4. **Say a thing once**: repeated boilerplate collapses to one place.
5. **The writing rules apply** to comments (`.claude/rules/writing.md`, "Code comments").
6. **No lint guard.** A rule refusing task ids, dates and "the owner's call" in comments was proposed and declined; review holds it, as it holds density.
7. **The rule and the cleanup land in one PR**, so the codebase never carries two rules at once.

### Why not the alternatives

- **Keep a provenance exception for task ids.** It was the largest kind of clutter, and a doc citation gives the same lead with a copy that can be corrected in one place.
- **"How only", with every why in the docs.** A one-clause why stops the obvious refactor being attempted and reverted; it is a fact about the code now, not history.
- **A lint guard with a file allowlist, then area cleanup tasks.** Declined by the owner: one task, one PR, review-held.

### What changed

- `CLAUDE.md`, Conventions: the comment line.
- `claude-docs/README.md`, "Comments in code": rewritten to the six points.
- `.claude/rules/writing.md`: a "Code comments" section on wording, and the comment bullet under "What this does not change".
- Every comment under `src/` (bar `src/gql/` and the frozen migrations), `tests/`, `lint/`, `scripts/`, `.storybook/` and the root configs, rewritten in seven lanes plus a citation lane: `src/db` with `src/lib`, `lint` and `scripts`; `src/modules` with `src/graphql`; `src/components` without its stories; the stories with `src/emails` and `.storybook`; `src/app` with `src/scss`; `tests/e2e` with `tests/support`; the rest of `tests/`. Each lane ran twice: a history-marker pass, then a length pass, because the first pass left most long runs alone.
- Facts that left a comment went into topic sections of the area's doc. A first attempt pasted comment text under headings such as "Comments in full" and "Notes from code comments"; those were rewritten as prose that stands on its own before the merge.
- Every `claude-docs` citation in code now resolves to a file and a heading, including about forty that were broken before this task; most were bold leads promoted to headings or citations repointed to the heading that holds the fact.

### Result

Measured the same way as above, on the merged branch against the staging base:

| Tree  | Before                      | After                       |
| ----- | --------------------------- | --------------------------- |
| src   | 24,927 comment lines, 20.7% | 16,977 comment lines, 15.1% |
| tests | 12,666 comment lines, 8.5%  | 10,044 comment lines, 6.9%  |

No comment line under those trees carries a task id, a Story or Wave reference, "the owner's call" or a decision date. The dates that remain are Baseline availability dates inside `stylelint-disable` reasons and `@supports` notes, which the browser-floor rule asks for, and one fixture example in a column's doc comment. Runs over three lines that remain are the protected kinds: `@throws` blocks, "why it could have passed" reasoning, tool and runtime facts, and usage text at the head of a script. Task ids were removed from test titles as well; story numbers in titles stay.

## Comment guidelines and the cleanup that applies them (plan)

### Context

The owner says comments clutter the codebase. Measured 2026-10-29 (`*.ts`/`*.tsx`, generated `src/gql/` excluded):

| Tree  | Comment share      | Comment lines naming a task id | Files with one |
| ----- | ------------------ | ------------------------------ | -------------- |
| src   | 22% (25,411 lines) | 2,349                          | 695            |
| tests | 10% (12,730 lines) | 1,418                          | 530            |

`types.ts` files are 47% comment (121 files). Comment runs over 6 lines hold 34% of all src comment lines; 126 runs exceed 12 lines.

What the clutter is (survey, estimates):

| Kind                                                | Est. lines                               | Example                                                             |
| --------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Essays and behaviour specs in file/type headers     | ~2,100 in runs >12 lines                 | `src/components/IngredientEntry/cupboard-actions.tsx:26` (39 lines) |
| Task-id citations, mostly `(MB.115)` form           | ~1,600 src, ~1,400 tests                 | `src/app/(shell)/admin/types.ts:19`                                 |
| Task-id narrative ("M12.2 added…", "until M13.3's") | ~150 src, ~120 tests                     | `src/db/repository/slugs.ts:74`                                     |
| "the owner's call" and ISO dates                    | 291 + 234 src, 166 + 134 tests           | `src/app/plus-covens.ts:9`                                          |
| Boilerplate repeated across files                   | 19 distinct lines in 4+ files, one in 57 | `src/emails/*.stories.tsx`                                          |
| Story/Wave/"design F" references                    | ~15 src, ~63 tests                       | `tests/e2e/stories/coven-ingredients.ts:9`                          |
| "not built yet" notes                               | ~13 src, ~10 tests                       | `src/db/repository/write.ts:277`                                    |

The kinds the current rule (claude-docs/README.md, "Comments in code") bans by name are rare: restating code <10, name-repeating JSDoc ~24, caller lists ~23, postmortems ~8, commented-out code 0. The rule aims at the wrong targets and explicitly allows task-id provenance, the single largest kind.

Owner's decisions (2026-10-29, this session):

- A comment details how the code functions. Historical context goes to the docs.
- Every task id leaves code comments. No provenance exception.
- A present-tense why ("X rather than the obvious Y because Z") stays, kept brief; the rest of the detail goes to a doc the comment points at.
- Comments follow `.claude/rules/writing.md`.
- No lint guard. The rule is held by review, as the density rule already is.
- Guideline and cleanup land together, as one task and one PR.

### The guideline (what the docs will say)

Replace the MB.50 line in `CLAUDE.md` Conventions; rewrite claude-docs/README.md "Comments in code"; replace the comment bullet in `.claude/rules/writing.md` "Where precision still wins" and add a short "Comments" paragraph there. Record the change in `claude-docs/design-decisions/process.md`, "Comments say how the code works, and nothing else" with this plan beside it as the section "Comment guidelines and the cleanup that applies them (plan)".

1. **A comment describes the code as it is.** What this is, and, where the obvious alternative would be wrong, why it is built this way instead, in one clause and the present tense. Nothing about when it was built, which task built it, who decided, or what will replace it.
2. **History lives in the docs, never in code.** No task ids, no `Story N` or `Wave N`, no "the owner's call", no dates, no "added by", "until X lands", "not built yet". A constraint that would look arbitrary gets a doc pointer in the existing citation form: `(claude-docs/db/keyset-pages.md, "Keyset pages")`. The doc carries the provenance and the argument.
3. **Length: one to three lines.** A field or prop doc is one line. A header is one or two sentences saying what the file holds. More than that is a defect in the docs: write the section there and point to it. Protected whatever their length, as now: behaviour not visible from the code, hard-won tool and runtime facts, the Testing rules' "why it could have passed" reasoning, and every comment a tool reads (`oxlint-disable`, `@ts-expect-error`, `@supports` and Baseline notes, `eslint-disable` in generated files).
4. **Say a thing once.** A sentence that would be pasted into a second file belongs on the shared helper, type or doc; the copies become a pointer or nothing.
5. **Plain writing applies**: everyday words, describe a thing before naming it, one idea per sentence.
6. **Review holds it.** No mechanical guard on density or on history markers (owner's decision); the README's existing "no mechanical guard" paragraph is extended to say so.

### Cleanup (same task, same PR)

One task, one branch `feature/m14.32-comment-guidelines`, one PR. The ~1,200 files split into five lanes, each a Sonnet agent in its own worktree on a lane branch off the task branch; the main session merges each lane into the task branch as it lands (owner's standing practice: lane commits merged into the review branch as they land).

| Lane | Scope                                     | Files with history (approx) |
| ---- | ----------------------------------------- | --------------------------- |
| A    | `src/db/`, `src/lib/`                     | ~150                        |
| B    | `src/modules/`, `src/graphql/`            | ~200                        |
| C    | `src/components/`, `src/emails/`, stories | ~250                        |
| D    | `src/app/`                                | ~95                         |
| E    | `tests/`                                  | ~530                        |

Lane brief, per file:

- Strip every history marker (task ids, Story/Wave, "the owner's call", dates, forward-looking notes). Grep for `\b(M[0-9]+\.[0-9]+[a-z]?|MB\.[0-9]+|MW\.[0-9]+)\b`, `Story [0-9]`, `Wave [0-9]`, `owner's call`, `20[0-9]{2}-[0-9]{2}-[0-9]{2}` across the lane's scope; the lane is done when the scope has zero hits.
- Cut a header or field doc to the rule's length. A fact the reader cannot recover from the code moves to the doc the comment should point at; it is never dropped. Where no doc section exists, add one to the nearest claude-docs file for that area (`claude-docs/db/`, `modules.md`, `components/`, etc.) and cite it.
- Collapse boilerplate repeated across files (the 57-file stories note, the 42-file workshop note, the 12-file Next 16 promise note, the 8-file `@throws`) into one place and point or delete.
- Keep tool-read comments and the test "why it could have passed" blocks verbatim.
- Rewrite what remains to `.claude/rules/writing.md`.
- No behaviour change; no new tests. `npm run pre-commit` and commit per green step. One `npm run test:coverage` per lane at its end to prove nothing broke; `npm run lint` and `npm run format:check` on the docs.
- Agents commit as they go and message the main session with hashes.

Guideline docs (CLAUDE.md, README, writing.md, decision record) are written first by the main session on the task branch, so every lane reads the final rule before touching a file.

### Files

- `CLAUDE.md` — MB.50 line in Conventions
- `claude-docs/README.md` — "Comments in code"
- `.claude/rules/writing.md` — comment bullet and new paragraph
- `claude-docs/design-decisions/process.md`, "Comments say how the code works, and nothing else", the section "Comment guidelines and the cleanup that applies them (plan)"
- `claude-docs/tasks/<wave>.md`, `claude-docs/TASKS.md` — the minted task, then `node scripts/task-board.mjs sync <id>`; id under the current wave per the Execution order (check the board and TASKS.md for the next free id first)
- ~1,200 files under `src/` and `tests/`, comment lines only

### Verification

1. The grep above returns zero hits across `src/` (excluding `src/gql/`) and `tests/`.
2. Re-run the comment-line count: report the before/after share for src and tests in the PR body.
3. `npm run lint`, `npm run format:check` green.
4. `npm run test:coverage` green once per lane and once on the merged task branch; `npm run test:stories` once on the merged branch, since stories files are in scope.
5. Spot-check ten rewritten headers against the six rules by reading them.

## Compendium seed as markdown files, with a hash-gated update path, a formal-name rule and curator review (plan)

### Context

Today the compendium seed is seven TypeScript shards under `src/db/seed/compendium/` (~628 entries). The seed is write-once: `presentEntries` (`src/db/seed/compendium.ts:287-304`) skips every entry already present, so a correction to a landed literal changes nothing on production. There is no "reviewed by a curator" state anywhere in the schema.

The Aspen entry (`plants-a-cn.ts:3165-3277`, live since PR #872) carries European lore under the American _Populus tremuloides_. (Grieve's "Poplar, Trembling" is headed _P. tremuloides_; the European lore came from Kynes's joint "Aspen" entry, which heads both species.) The common name "aspen" was taken to mean one species. The owner's rule from this: **a formal name is a unique identifier; a common name never is.** A source is attributed to an entry only when it prints that formal name, or its common name maps to exactly one formal name by a cited authority. Anything else goes to the owner for review before it is seeded.

The owner wants:

1. Every seed entry as one markdown file (frontmatter + `# Title` + description + `#### Edit Notes for Claude`), like the samples in `compendium/ingredients/`.
2. A content hash per entry so the seed knows when a file changed, applied **only when the file is explicitly marked for update**, so editor content on production is never overwritten silently.
3. The formal-name rule enforced, with an in-file review process for uncertain attributions.
4. A way to mark an ingredient as reviewed by a curator.

#### Owner decisions already taken (this session)

| #   | Decision                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Convert all seven shards to markdown; delete the shards; one mechanism and one guard.                                                                                                                                                                       |
| 2   | One-shot approved hash: frontmatter `seedUpdate: <sha256>`; update only when the file hash equals it and differs from the stored row hash. `npm run seed:mark <file>` writes it.                                                                            |
| 3   | Editor-touched or curator-reviewed rows refuse the update, print the differing fields and fail the run; only `overwriteEditor: true` beside `seedUpdate` overrides.                                                                                         |
| 4   | Curator mark: `curator_reviewed_at` / `curator_reviewed_by` columns, set from the admin entry page, badge + list filter; a reviewed row blocks seed updates like an editor row.                                                                             |
| 5   | Attribution review in-file, status-gated: `status: draft \| needs-review \| approved`; only `approved` seeds; `#### Questions for the Curator` section.                                                                                                     |
| 6   | Folder = nomenclature (the seven enum values); file = `ingredientSlug(name, canonicalName).md`; guard checks path vs frontmatter. Agate moves from `element/` to `mineral/`. `chemical` stays the enum value (DESIGN.md:545).                               |
| 7   | A targeted audit task over the ~627 other live entries for common-name misattribution.                                                                                                                                                                      |
| 8   | `#### Edit Notes for Claude` kept, excluded from the hash, never seeded; Claude acts on it and clears it.                                                                                                                                                   |
| 9   | Hash covers the **seeded projection only**: scalars, lists, substitutes, title, description, variants, each citation's `source` handle and `locator`. Not `status`, `seedUpdate`, `overwriteEditor`, `supports`, provenance notes, Edit Notes or Questions. |
| 10  | Per-entry sources live as `compendium/sources/<handle>.yaml`, one file per handle; shared works stay in `works.ts`.                                                                                                                                         |
| 11  | `colours` everywhere in files (key and `supports` values); the loader maps to `colors`.                                                                                                                                                                     |
| 12  | Split status gate: the seed writes `approved` only; CI fails a `draft` file on staging/main and any `approved` file breaking a rule; `needs-review` is allowed anywhere and is the owner's queue.                                                           |
| 13  | A refused entry is skipped and the rest of the run applies; the run exits 1 at the end **and a dev is told** (see D, "Reporting").                                                                                                                          |
| 14  | **A keeper or curator editing an entry on the site marks it reviewed**; they can switch it back to "needs review" with the control.                                                                                                                         |
| 15  | Converted citations carry `nameBasis: unaudited` under a shrink-only ratchet list.                                                                                                                                                                          |
| 16  | The seven per-shard docs move to `claude-docs/archive/` in the cutover PR.                                                                                                                                                                                  |

**Assumption stated for the owner (from 14):** an `overwriteEditor` seed update that lands **clears** the curator mark, because the seed is not a curator and the content is no longer what was reviewed. Correct me at review if you want it kept.

### A. File format

#### Path

`compendium/ingredients/<nomenclature>/<ingredientSlug(name, canonicalName)>.md` using `ingredientSlug` from `src/lib/slugify.ts:25` (gives `aspen-populus-tremuloides`, `agate-quartz-var-agate`, `graveyard-dirt`). `compendium/ingredients/base.md` is the template and is skipped by name; any other file directly under `ingredients/` is a guard issue.

#### Body

- One `# <name>` H1 → `name`.
- Free text up to the first `####` heading → `description`. Paragraphs split on a blank line; single newlines inside a paragraph fold to a space.
- No other H1/H2/H3.
- Optional trailing sections, each at most once, in this order: `#### Questions for the Curator`, then `#### Edit Notes for Claude`. Neither is hashed or seeded.

#### Frontmatter (zod `.strict()`, unknown key = issue)

| Key                                                     | Type                                                                                                                                         | Required           | Maps to                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| `status`                                                | `draft` \| `needs-review` \| `approved`                                                                                                      | yes                | not stored, not hashed                                    |
| `nomenclature`                                          | the seven `NOMENCLATURE_KINDS`                                                                                                               | yes                | `ingredients.nomenclature`                                |
| `canonicalName`                                         | string matching the guard's `TAXON` for botanical/fungal/zoological                                                                          | no                 | `canonical_name`                                          |
| `seedUpdate`                                            | 64 hex                                                                                                                                       | no                 | not stored, not hashed                                    |
| `overwriteEditor`                                       | literal `true`, only beside `seedUpdate`                                                                                                     | no                 | not stored                                                |
| `toxic`                                                 | boolean                                                                                                                                      | no                 | `toxic` (M14.1)                                           |
| `safetyNotes`                                           | string                                                                                                                                       | no                 | `safety_notes`                                            |
| `elements`, `celestialBodies`, `zodiacSigns`, `colours` | `string[]`                                                                                                                                   | no                 | `elements`, `celestial_bodies`, `zodiac_signs`, `colors`  |
| `folkNames`, `deities`, `categories`                    | `string[]`                                                                                                                                   | no                 | child tables, resolved by seed_key slug as today          |
| `substitutes`                                           | `[{identity, form?} \| {name}]`                                                                                                              | no                 | `ingredient_substitutes` (same shape as `SeedSubstitute`) |
| `references`                                            | `[{source, locator?, supports[], nameBasis, headedAs?, resolvedBy?}]`                                                                        | yes (may be empty) | `reference_links`; `supports` and provenance not stored   |
| `variants`                                              | `[{form, description?, toxic?, safetyNotes?, elements?, celestialBodies?, zodiacSigns?, colours?, categories?, substitutes?, references[]}]` | no                 | `ingredient_variants` + children                          |

- Blank values (`key:`, `- `, `[null]`, `[""]`) normalise to absent, so the template's and agate's `deities:\n  -` are fine.
- Key order in a file is free; the converter writes one fixed order with `status` first.
- `supports` vocabulary = `CompendiumEntryField` / `CompendiumVariantField` with `colours` in place of `colors`; `name` is the H1.
- **Citation provenance (the formal-name rule, per citation):**
  - `nameBasis: stated | resolved | unresolved | unaudited`.
  - `stated`: the source prints this entry's formal name under the cited heading.
  - `resolved`: the source heads a common name; `headedAs` (required) is that heading and `resolvedBy` (required, a registered source handle other than the citing one) is the authority that maps the heading to exactly this formal name.
  - `unresolved`: doubt remains; blocks `approved`, and the doubt is written under `#### Questions for the Curator`.
  - `unaudited`: conversion only (F, ratchet).
  - Required on every citation of an entry that has a `canonicalName`; entries without one are exempt.

#### Sources

`compendium/sources/<handle>.yaml`, one file per handle, holding `CitationFields` (today's per-shard `sources` map values). `works.ts` keeps the nine shared works. The converter merges identical-text duplicates across shards and fails on a same-handle/different-text collision. The hash covers the handle and locator only, never the resolved citation text, so editing a source file never flips entries' hashes (`insertMissingReferences` is insert-if-missing anyway).

#### Substitutes

The "same-or-earlier shard" rule goes. `{identity}` must resolve to a file; `{name}` is allowed only when no file has that identity. The seed already inserts every entry before resolving `substituteTargets`, so order is free. Bidirectional seeding (owner decision 2026-10-11, `NEXT-BURST.md`) is unchanged by this plan and stays its own item.

### B. Canonicalisation and hash

`src/db/seed/compendium/content-hash.ts`, pure, imports only `node:crypto` and types; exports `canonicalEntry(entry)` and `contentHash(entry)`.

1. Build the projection with DB-style keys (`colors`), keys in fixed alphabetical order.
2. Drop null/empty/absent values.
3. Strings: NFC, trim, collapse internal whitespace; description paragraphs joined with `\n\n`.
4. Arrays keep file order (deities have `position`).
5. Stable key-sorted `JSON.stringify`, prefixed `compendium-hash-v1\n`.
6. `sha256` hex. The version prefix makes a future algorithm change an explicit, reviewed event.

`scripts/seed-mark.ts <file>`: loads via the loader, refuses a non-`approved` file, writes `seedUpdate` with `yaml`'s `parseDocument` so comments and order survive. `yaml` ^2.9.1 is already a devDependency and `migrate.yml` runs `npm ci`, so it is present at seed time; no dependency change. Add `npm run seed:mark` and `npm run seed:queue` (lists `needs-review` files) to `package.json` and `claude-docs/commands.md`.

### C. Loader

New files under `src/db/seed/compendium/`:

| File              | Purpose                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `file-schema.ts`  | zod schemas; `colours`→`colors`; blank normalisation                                                                                                                                                                                                               |
| `parse-entry.ts`  | `parseEntryFile(path, text)` → `{ entry, hash, status, seedUpdate, overwriteEditor, citationMeta, sections, issues }`; frontmatter split on `---`, `yaml` with `uniqueKeys`, body split at `####`                                                                  |
| `load.ts`         | `loadCompendium(root = 'compendium')`, synchronous; reads `ingredients/<nomenclature>/*.md` sorted, `sources/*.yaml`, merges `WORKS`; returns `{ files: LoadedEntry[], sources, shards }` where `shards` is one synthetic `SeedCompendiumShard` named `compendium` |
| `content-hash.ts` | as B                                                                                                                                                                                                                                                               |

`index.ts` exports `COMPENDIUM = loadCompendium().shards` so the `SEED_ENTRIES` sweep in `tests/db/seed/index.test.ts` keeps working; `checkCompendium(shards)` keeps its signature; `seedCompendium(db, loaded = loadCompendium())`. `SeedCitation` in `src/db/seed/types.ts` gains the optional provenance fields; the shard type gains optional `file`, `hash`, `status` (type-only).

### D. Seed update path (`src/db/seed/compendium.ts`)

**Refactor first, no behaviour change:** extract pure row builders (`entryRow`, `variantRows`, `childRows`, `referenceRows`) from `seedCompendiumContent` so insert and update share them. Do not reuse `writeChildren` (`src/modules/ingredients/services/ingredient-rows.ts:126`): it is a `server-only` service writer needing a `withAudit` session. Read it first and mirror how it keeps variant ids stable.

**Per approved file:**

| State                                          | Action                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Absent (no seed_key / identity / slug match)   | insert as today, set `seed_content_hash`                                                                                                                                                                                                                                                    |
| Present, soft-deleted                          | `RETIRED`, exit 0 (a curator removed it; the seed never revives)                                                                                                                                                                                                                            |
| Stored hash = file hash                        | skip                                                                                                                                                                                                                                                                                        |
| Stored hash null                               | adopt if the conversion manifest names it and the row and all children are bootstrap-stamped (E); else `REFUSED: no baseline`                                                                                                                                                               |
| Hash differs, `seedUpdate` ≠ file hash         | `PENDING`, exit 0, counted in the summary                                                                                                                                                                                                                                                   |
| Hash differs, `seedUpdate` = file hash         | **refuse** unless `overwriteEditor: true` when: `curator_reviewed_at` set; `updated_by ≠ BOOTSTRAP_USER_ID`; or any child row (variant, folk name, deity link, category link, substitute, reference link) has a non-bootstrap `created_by`/`updated_by` or a `deleted_at`. Otherwise apply. |
| Update changes `name`, `canonicalName` or slug | `REFUSED: identity change: use the admin` (slug retirement belongs to the admin service)                                                                                                                                                                                                    |

**Applying** (inside the seed's one transaction, `updated_by = BOOTSTRAP_USER_ID`): `UPDATE ingredients` scalars + hash; variants upsert by folded form, never delete-and-recreate (stock and spell layers hold variant ids), a removed form soft-deletes only if unused else `REFUSED: form in use`; folk names and deities diff with soft-delete and `position`; categories diff with hard delete (no tombstone); substitutes diff with soft-delete; reference links diff by `(referenceId, owner, locator)`, reference rows never deleted. An `overwriteEditor` update clears `curator_reviewed_at/by` in the same statement.

**Reporting (decision 13).** The run prints one line per `UPDATED`/`REFUSED`/`PENDING`/`RETIRED` entry, a `REFUSED` line followed by the differing fields, then a totals line; it exits 1 if anything was refused. In `.github/workflows/migrate.yml` (seed step ~line 245): the existing `job-summary` action already lifts `seed.log` into the Actions summary, so the failed step is visible there. Add a step after it that, when the seed step failed, finds the PR the deploying commit came from (`gh api repos/{owner}/{repo}/commits/{sha}/pulls`) and posts the `REFUSED` block on it through `.github/actions/pr-comment` (marker `seed-compendium`, fail-only). `deploy.yml` runs on push to `staging`/`main`, so the merged PR is the one a dev reads. Add `compendium/**` to the `seed-changed` watch list (`deploy.yml:117-134`).

**Cache:** `src/lib/compendium-cache.ts` revalidates every hour (`COMPENDIUM_REVALIDATE_SECONDS = 3600`), so a seed update shows on production within the hour; nothing in CI can call `expireCompendium()`. Document this in the README; no code.

### E. Migration and backfill (table task)

`src/db/migrations/0081_compendium-seed-state-expand.sql` (additive, nullable; no `.ack.md`; schema-drift test needs no `PENDING_DROPS`):

- `ingredients.seed_content_hash text CHECK (seed_content_hash IS NULL OR seed_content_hash ~ '^[0-9a-f]{64}$')`
- `ingredients.curator_reviewed_at timestamptz`, `curator_reviewed_by uuid REFERENCES users(id)`, `CHECK ((curator_reviewed_at IS NULL) = (curator_reviewed_by IS NULL))`
- Re-create `set_updated_at()` (same name and signature as migration 0079) with the three new columns in its `ignored` set, so a hash backfill or a review mark never bumps `updated_at`/`updated_by` and the "Updated" marker stays honest. No index: ~630 rows.
- Drizzle schema in `src/modules/ingredients/schema/`.

**Backfill = adoption step, not SQL.** The converter writes `compendium/.converted-hashes.json` (identity → hash of the converted file), committed in the conversion PR. While it exists, a seed run sets `seed_content_hash = manifest[identity]` where the stored hash is null and the row and all children are bootstrap-stamped and undeleted, using the manifest hash and never the current file's, so a file edited after conversion (Aspen) still reads as changed. Everything else stays null and is refused until `overwriteEditor`. A later task deletes the manifest once production has adopted.

**Known gap, surfaced not hidden:** write-once means a bootstrap-stamped row may carry content older than a later literal correction. `db:seed:compendium -- --adopt --dry-run` lists adoptable rows, refused rows and scalar divergences, so the owner sees them before adoption makes them the baseline.

Staging proof: dry run → record `max(updated_at)` and the null-hash count → real run → null count = refused count and no `updated_at` later than recorded → second run prints `N unchanged, 0 inserted`.

### F. Guard (`src/db/seed/compendium/guard.ts`)

Carried over: unique identity and slug; `TAXON`; description 100–250 words, form ≤120; curated values by seed_key slug; `supports` covers every populated field; citation names a registered work or source; toxic/caution rules from M14.1 and 2026-10-21.

Replaced: shard-order substitutes → "resolves to a file".

New:

- **Path:** filename = `ingredientSlug(name, canonicalName) + '.md'`; folder = `nomenclature`; `base.md` skipped.
- **Sections:** at most one Questions and one Edit Notes, in that order, no other headings; a `needs-review` file must have a non-empty Questions section.
- **Status gate (decision 12):** seed writes `approved` only; CI guard test fails `draft` on staging/main (branch from `GITHUB_BASE_REF`/`GITHUB_REF`), fails any rule-breaking `approved` file, allows `needs-review`.
- **`seedUpdate`:** if present it must equal the current hash (stale = CI failure: re-run `seed:mark` or remove it). `overwriteEditor` only beside `seedUpdate`, only `true`.
- **`nameBasis`:** required on every citation when `canonicalName` is set; `resolved` needs `headedAs` and a registered `resolvedBy` ≠ the citing source; `unresolved` forbids `approved`.
- **Legacy ratchet (decision 15):** `unaudited` accepted only for files listed in `compendium/unaudited.txt`, written once by the converter; a listed file with no `unaudited` citation fails (stale list); the list may only shrink. A test asserts the count never rises (sweep-task rule: impossible for new files, absent for legacy).

### G. Curator review

- **Service** (`src/modules/ingredients/services/compendium.ts`): `setCompendiumEntryReviewed(session, id, reviewed)` → `assertCurator`, `withAudit`, `write.updateByIdInCompendium`. **Every curator write to an entry sets the mark** (decision 14): `createCompendiumEntry`, `updateCompendiumEntry`, `promoteCompendiumFolkName`, and any child writer reachable from the admin entry page (list them from `src/graphql/` mutations touching compendium entries before building). The mark is set in the service, not the repository writer, so a no-op resave through the trigger does not matter either way.
- **GraphQL:** one mutation `setCompendiumEntryReviewed(id: ID!, reviewed: Boolean!): Ingredient`. `curatorReviewedAt` is exposed only on the admin read path; the reviewer's id never reaches the public `Ingredient` type (rule 6, viewer-keyed data in a cached read). Add `curatorReviewedAt` to the public strip list at `src/app/(public)/compendium/page.tsx:~58-70`. Check how the admin entry page fetches before choosing a nullable `curatorReview` object vs a field.
- **UI:** badge + "Reviewed by Curator / Needs Review" toggle on the admin entry page (`src/app/(shell)/admin/compendium/`, `components/IngredientEntry/`); tri-state list filter `reviewed=1|0` in `components/CompendiumList/params.ts` and `admin/compendium/types.ts`, added to `compendiumFacets` and `live-facets.ts` so counts work. Title case labels.
- **Tests:** params parse; DB: F (curator) and E (admin) set it by direct id, D refused with the precondition asserted; an edit sets it; the seed refuses a reviewed row and `overwriteEditor` clears it; component tests by role/label; gate spec under `tests/e2e/gates/` only if no story walks admin curation (check first).

### H. Conversion (one-off)

`scripts/compendium-convert.ts`, deleted in the cutover PR. Inputs: seven shards, `WORKS`, per-shard `sources`. Outputs: entry files with `status: approved` and every citation `nameBasis: unaudited`; `compendium/sources/<handle>.yaml`; `compendium/unaudited.txt`; `compendium/.converted-hashes.json`. `--dry-run` prints counts and collisions.

Fidelity proof, a test that lives until the shards go: exactly the shards' entry count of files; every file parses `toEqual` its TS literal (normalisation on both sides, `colours` mapped); recomputed TS-literal hash = manifest; `checkCompendium` issue lists equal on both corpora; handles resolve to identical citation text. Aspen converts as-is; its correction is its own task so the conversion proves fidelity before any content changes.

Per-shard docs → `claude-docs/archive/` (decision 16); README candidate list stays; "TS literal" wording in the README rewritten.

**Freeze:** no shard-lane commits to the TS files between the conversion PR and cutover; ship both within a day or two.

### I. Attribution audit generator

`scripts/compendium-audit.ts`, `--report` (default) and `--apply`. Inputs: the files, sources and works, prefetched wikitext at `/home/node/.claude/projects/-app/seed-scratch/shards/*/SP/wiki/<Title>.wikitext`; each citation's `headedAs` derived from its locator (`under "Aspen"`) or the source title.

Heuristics, each a candidate per `(entry, citation)`:

- **Corpus collision:** the same heading or folk name maps to two or more `canonicalName`s across files (Aspen is the first catch; needs no wikitext).
- **Hatnote:** the wikitext of the common-name page has `{{about}}`, `{{for}}`, `{{redirect}}`, `{{distinguish}}`, `{{disambiguation}}` or "may refer to" naming two or more taxa other than the entry's.
- **No binomial:** `headedAs` contains no `TAXON` string and the citation is not `stated`/`resolved`.
- **Own-taxon check:** a cited Wikipedia article whose `{{Speciesbox}}`/`{{Automatic taxobox}}` matches `canonicalName` becomes `stated`.

Output: a ranked report table (entry, source, heading, candidate formal names, evidence, score). `--apply`, run only after the owner reads the report, flips `status` to `needs-review` and appends one Questions block per flagged citation, each starting `<!-- audit:<source>:<headedAs> -->` for idempotence. Books are not available as text, so the audit finds candidates; a lane or the owner asserts `stated`/`resolved` from the page.

### J. Aspen correction

A lane must read each source and assert `nameBasis`; anything doubtful is not cited, its doubt goes under Questions, and fields only it supported are dropped (the guard requires `supports` coverage).

- **`botanical/aspen-populus-tremuloides.md`:** keep `wikipedia-populus-tremuloides` and `grieve-poplar-trembling` (headed _P. tremuloides_); cite Cunningham; no Kynes (the owner cites it on the European aspen only); no European lore (Irish glossary rod, Russian witch grave, northern England hair cure); keep Pando, North American range, salicin, quinine-substitute bark; 100–250 words; clear Edit Notes; `seed:mark`.
- **`botanical/aspen-populus-tremula.md`:** fill the stub: `status`, description, folk names (incl. European Aspen), `Bark` form with Grieve, citations `grieve-poplar-trembling`, a new `wikipedia-populus-tremula` source file, the European lore sources; Cunningham/Kynes only if shown to name _P. tremula_.
- Fix the stub's Edit Notes typo reference (`apsen-`) by clearing it once acted on. Set `needs-review` if any doubt remains.

### K. Tasks (one PR each; ids M14.4 onward, placed after Done/In Review wave-14 items; mint via `node scripts/task-board.mjs`)

| Id     | Task                                                                                                                                                                                                                                                                                                                                                                                                     | Est. | Depends on     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------- |
| M14.4  | Decision record, CLAUDE.md invariant, README rewrite, lane briefs, `claude-docs/design-decisions/process.md`, "Compendium seed as markdown files, with a hash-gated update path, a formal-name rule and curator review (plan)" (this plan). **Done in a worktree** (`/home/node/worktrees/m14.4`, branch `feature/m14.4-compendium-markdown-docs` off staging), not in `/app` (owner's call 2026-10-23). | 2h   | —              |
| M14.5  | Table: migration 0081, trigger exclusion, Drizzle schema                                                                                                                                                                                                                                                                                                                                                 | 2h   | M14.4          |
| M14.6  | Loader, hash, file schema, guard rules, fixture-file tests                                                                                                                                                                                                                                                                                                                                               | 7h   | M14.4          |
| M14.7  | Seed behaviour: builders refactor, hash on insert, update path, refusals, adoption, `seed:mark`/`seed:queue`, migrate.yml PR comment                                                                                                                                                                                                                                                                     | 9h   | M14.5, M14.6   |
| M14.8  | Curator review: service, GraphQL, UI, filter, tests                                                                                                                                                                                                                                                                                                                                                      | 8h   | M14.5          |
| M14.9  | Conversion script, generated corpus, fidelity proof (TS still the seed source)                                                                                                                                                                                                                                                                                                                           | 6h   | M14.6          |
| M14.10 | Cutover: seed reads files, delete shards + converter, archive shard docs, deploy watch list, adoption on staging then production                                                                                                                                                                                                                                                                         | 3h   | M14.7, M14.9   |
| M14.11 | Attribution audit generator + ratchet test                                                                                                                                                                                                                                                                                                                                                               | 5h   | M14.9          |
| M14.12 | Aspen correction (both files)                                                                                                                                                                                                                                                                                                                                                                            | 3h   | M14.10         |
| M14.13 | Audit run and owner review queue                                                                                                                                                                                                                                                                                                                                                                         | 2h   | M14.10, M14.11 |

~47h. Parallel: M14.5 ∥ M14.6 after M14.4; M14.7 ∥ M14.8 ∥ M14.9 ∥ M14.11 as dependencies allow. Open shard lanes (MB.243–246, 248) and MB.249 are amended to write markdown files from M14.10 on; `TASKS.md` Execution order, `waves/wave-14.md`, `tasks/m14.md` updated and synced.

### L. Docs

- New `claude-docs/design-decisions/ingredients.md`, "The compendium seed as markdown files, a formal-name rule and curator review" superseding the two rows `design-decisions/ingredients.md`, "A researched, sourced compendium seed" rejected ("One file per entry", "The entries repeated in markdown"), with the reasons (provenance review, owner edit channel) and decisions 9–16.
- `CLAUDE.md`, "What the compendium says, it sources": add that a formal name is a unique identifier and a source is cited on an entry only if it prints that formal name or its common name maps to exactly one formal name by a cited authority; a common name alone is never a match, and doubt goes to `needs-review`.
- `claude-docs/compendium/compendium-seed/README.md`: rewrite "An entry field by field", "How an entry is sourced", "Write-once" for files, hash, refusals, the review queue and the one-hour cache lag.
- `claude-docs/commands.md`: `seed:mark`, `seed:queue`, the audit script.
- Lane briefs (`seed-scratch/shards/*/BRIEF.md`, `NEXT-BURST.md`): file format, formal-name rule, `nameBasis`, Edit Notes convention.
- `.github/workflows/deploy.yml` watch list gains `compendium/**`.

### M. Verification

- Replace `tests/db/seed/compendium-literals.test.ts` with `compendium-files.test.ts` (guard over the real corpus, status gate by branch).
- New `tests/db/seed/compendium/{parse-entry,content-hash,load,guard-files}.test.ts`: key order, Edit Notes, `status`, `seedUpdate` and provenance notes do not change the hash; a description edit does; path/folder mismatch, stale `seedUpdate`, `unresolved`+`approved`, ratchet growth each fail.
- Extend `compendium.test.ts` / `compendium-fixture.ts`: skip, insert, pending, update, retired, and each refusal (reviewed, editor parent, editor child, null baseline, form in use, identity change); each refusal test also proves the update applies with the guard condition absent.
- `tests/db/seed/index.test.ts` stays green including second-run idempotence.
- Curator review tests from G.
- `npm run test:coverage` at each task end; `npm run pre-commit` per commit.
- Staging proofs from E (adoption rewrites nothing) and for Aspen: run prints `1 inserted` (tremula) and `1 updated` (tremuloides) or a `REFUSED` diff; tremuloides' hash equals the file hash and it carries no Kynes citation and no European lore; a second run prints no changes.

### Critical files

- `src/db/seed/compendium.ts`, `src/db/seed/compendium/{index,guard,works}.ts`, `src/db/seed/types.ts:231-319`
- `src/lib/slugify.ts:25` (`ingredientSlug`), `src/lib/compendium-cache.ts`
- `src/db/migrations/0079_updated-at-skips-no-op.sql` (model for 0081), `src/db/audit.ts` (`BOOTSTRAP_USER_ID`)
- `src/modules/ingredients/services/compendium.ts`, `ingredient-rows.ts` (`writeChildren`, read not reused)
- `src/app/(shell)/admin/compendium/`, `components/CompendiumList/params.ts`, `components/IngredientEntry/`
- `.github/workflows/{deploy,migrate}.yml`, `.github/actions/{job-summary,pr-comment}`
- `compendium/ingredients/**`, `compendium/sources/**`

## The demo coven: every account is seated as an observer at sign-up (plan)

### Context

Today a new account can see only the compendium. `canCreateWorkspace` is `false`, no invitation has arrived, and `/coven/[slug]` is a 404 to a non-member. A person who signs in sees nothing of what a coven is for, and staging has no demo data at all (CI runs only the six reference seeds; the local `demo` scenario depends on the `standard` test fixtures and never leaves a dev or test database).

The owner decided on 2026-10-30:

- One demo coven, named **Sorrel & Salt Demo** (slug `sorrel-and-salt-demo`), exists on every environment.
- Every account is added to it as a **viewer** when the account is created. Existing accounts are backfilled by the seed.
- The bootstrap system user holds a steward seat and every site **admin** holds one too, so keepers can edit the demo by hand. This amends M6.6 for this one coven.
- Its contents are new content written against the real compendium, resolved by formal name, seeded as reference data (additive, like the vocabularies).
- A user may leave it, through the existing Leave action, and is never re-added.
- The UI says clearly that it is a demo.

What does **not** change: the compendium stays the only public surface; `/coven/[slug]` stays a 404 to a non-member; `canCreateWorkspace` stays `false` until an invitation or a keeper grant; observers write nothing; keepers reach no other workspace.

### Established facts (from the exploration)

- The sign-up hook is `databaseHooks.user.create.before` in [src/lib/auth.ts:479-494](src/lib/auth.ts#L479-L494). It writes nothing but the self-stamp and is already rule 3's named exemption to `withAudit`. There is no `after` hook.
- `workspaces` ([src/modules/coven/schema/workspaces.ts](src/modules/coven/schema/workspaces.ts)) has `id`, `name`, `slug`, audit columns, and no flag. `workspace_members` is keyed on `(workspace_id, user_id)`; a left seat is a soft-deleted row.
- Membership writes: `insertMembership` / `reviveMembership` / `softDeleteMembership` in [src/db/repository/memberships.ts](src/db/repository/memberships.ts). Seeds write through `insertMissing` / `insertMissingBy` in [src/db/seed/idempotent.ts](src/db/seed/idempotent.ts), inside `beginSeedTransaction`.
- `leaveWorkspace` ([member-removal.ts:48-59](src/modules/coven/services/member-removal.ts#L48-L59)) lets every role leave; `assertNotLastOwner` only blocks the last steward.
- The system user is `BOOTSTRAP_USER_ID` ([src/db/bootstrap.ts:3](src/db/bootstrap.ts#L3)), "Seed System User", no OAuth account, so no sign-in reaches it. It is a real `users` row and can hold a membership.
- Site-role writes: [user-role.ts:36](src/modules/identity/services/user-role.ts#L36) (a keeper promotes or demotes) and [admin-role.ts:68](src/modules/identity/services/admin-role.ts#L68) (the first keeper's self-promotion).
- Reference seeds: `seedReferenceData` in [src/db/seed/reference-data.ts](src/db/seed/reference-data.ts); `scripts/db-seed.ts` dispatches `npm run db:seed:<target>`; [migrate.yml:247-257](.github/workflows/migrate.yml#L247-L257) runs them one by one; [deploy.yml:117-137](.github/workflows/deploy.yml#L117-L137) lists the paths whose change triggers a seed; `seed-environment.yml` runs `db:seed:reference`.
- The local demo scenario's helpers in [src/db/seed/demo.ts](src/db/seed/demo.ts) (`insertMissingCupboardEntries`, `seedDemoSpells`, `insertMissingStock`, `insertMissingWorkings`) are bound to `WORKSPACE_W_ID` and author `MEMBER_B`.
- UI: the coven name is read by [layout.tsx](<src/app/(shell)/coven/[slug]/layout.tsx>) (switcher, title), the `<h1>` and role lede by [page.tsx:58-66](<src/app/(shell)/coven/[slug]/page.tsx#L58-L66>), the switcher choices by [WorkspaceSwitcher/index.tsx:39](src/components/WorkspaceSwitcher/index.tsx#L39), the `/coven` cards by `src/components/CovenCards`, all fed by `viewerOf()` in [src/lib/viewer.ts](src/lib/viewer.ts). `src/components/Notice` exists for the banner. `signedInLanding` sends a new sign-in to their first coven, which will now be the demo.
- The last story number in use is 86; the next is 87.

### Design

#### Schema

`workspaces.demo boolean NOT NULL DEFAULT false`, plus a partial unique index on `demo WHERE demo AND deleted_at IS NULL`, so at most one live demo coven exists. A boolean is not a `kind`: the row is still a workspace that takes members. The row's id is the constant `DEMO_WORKSPACE_ID` in `src/db/bootstrap.ts`, beside `BOOTSTRAP_USER_ID`, so the seed is idempotent by id the way the system user is; code reads the column, never the constant.

The migration is its own task (table task, then behaviour task).

#### Seed: `src/db/seed/demo-coven.ts`, `npm run db:seed:demo-coven`

Seventh reference seed, after the compendium in `seedReferenceData`, in migrate.yml and in deploy.yml's path list (the new file and its content file). In one `beginSeedTransaction`:

1. The workspace row, inserted if no live `demo` row exists, with `slugify('Sorrel & Salt Demo')`. If a human coven already holds that slug the seed refuses with a message naming it, rather than taking `-2` (a keeper renames one of them). Compare `freeSlug` in [workspace-creation.ts](src/modules/coven/services/workspace-creation.ts): the seed cannot import a `server-only` service.
2. Steward seat for `BOOTSTRAP_USER_ID`, and for every live user with `role = 'admin'` (insert if no row exists for the pair, deleted rows included — a keeper who left stays out until another steward invites and promotes them).
3. Viewer seat for every other live user with no row for the pair, deleted rows included: a user who left is never re-added. `invited_by` is null.
4. The contents (below), additive: missing rows are inserted by identity, nothing present is updated. Keepers edit the live rows by hand; the seed never overwrites a hand edit.

The seed also runs in the local `demo` scenario (`seedDemo`) after the curated compendium, so `npm run db:reset:demo` shows it. It does **not** join `standard`: fixture users A–G would gain a membership and every memberships test would shift. Tests that need the demo coven seed it themselves.

#### Contents

Written in `src/db/seed/demo-coven-content.ts` against the real compendium, each ingredient named by its formal name (`identity_key`) and form. An ingredient the environment's compendium lacks is skipped and listed in the seed's report, as the compendium seed reports, so a missing entry is a line in the job summary, never a failed deploy.

Shape: six to eight cupboard rows in `workspace_compendium_entries`, one or two own entries (a coven-made thing like a house blend, to show the local tier), jars of stock on most of them, four to six spells with steps, assigned categories and a mix of `private`/`workspace` visibility and draft/complete status, and one or two workings against the stock.

**The spells must make sense.** The lane writing them reads each ingredient's compendium file under `compendium/` first and picks ingredients whose recorded correspondences (categories, planets, elements, deities) support the spell's stated purpose: a protection jar is built from entries the compendium lists under protection. At most one or two spells carry one ingredient whose correspondences do not match the spell's intent, chosen on purpose and named in the content file's comment, so the demo shows an assigned category differing from a derived one (the "two kinds of spell category" invariant) without reading as mistakes. Nothing the compendium does not say is claimed in a step's text (the all-claims-sourced rule applies to demo prose too).

Author of every row: `BOOTSTRAP_USER_ID`. The lane uses the existing helpers, parameterised (next section).

#### Refactor: parameterise the local demo scenario's helpers

`demo.ts`'s workspace-bound helpers (`insertMissingCupboardEntries`, `insertMissingSpells`, `insertMissingSteps`, `insertMissingSpellCategories`, `insertMissingStock`, `insertMissingWorkings`, `insertMissingWorkspaceIngredients`, `insertMissingVariants`) move to `src/db/seed/coven-content.ts` and take `{ workspaceId, authorId }` and the data arrays as arguments. `demo.ts` calls them with W and B; `demo-coven.ts` calls them with the demo coven and the system user. No behaviour change; `tests/db/seed/demo.test.ts` stays green unchanged.

#### The sign-up seat

A `databaseHooks.user.create.after` hook in `src/lib/auth.ts`, beside the `before` hook, using the same raw client and extending rule 3's existing exemption: find the live `demo` workspace through a proofless repository finder (`findDemoWorkspace` in `src/db/repository/workspaces.ts`, like `findWorkspaceRole`); if none (the `minimal` scenario), do nothing; else insert `workspace_members (demo, user.id, 'viewer')`, stamped by the user as their own row is. The hook never throws: a failed insert is logged and the next seed run's backfill repairs it, because Better Auth cannot roll the user row back and a sign-up that half-fails is worse than a missing seat. The seat does not touch `canCreateWorkspace`.

#### Admin seats and the refusals

- `user-role.ts` and `admin-role.ts`: in the same `withAudit` that sets `role = 'admin'`, insert or revive the demo steward seat (or promote an existing observer/practitioner row to `owner`). Demotion from admin, in the same write, sets the seat back to `viewer`. Making a curator changes nothing. No demo coven in the database: nothing to do.
- `deleteWorkspace` refuses a `demo` row with an explaining error ("The demo coven can't be deleted"), not a bare `Forbidden`. Renaming is left as is.
- `removeMember` and `updateMemberRole` (member-role.ts) refuse a target of `BOOTSTRAP_USER_ID` with an explaining error: the system user is never a person, and its steward seat is what keeps the last-owner guard from ever binding a keeper.
- `leaveWorkspace`, `assertMembership`, `membershipsOf`, invitations: unchanged. A keeper owner may invite into the demo coven; that is harmless.

#### UI

- `ShellContext.workspaces[]` gains `demo: boolean` from the workspace row (`viewer.ts`, `membershipsOf` already returns the row).
- A **Demo** badge beside the name in the switcher option, the coven card on `/coven`, and the `<h1>` on the coven page.
- In `layout.tsx`, under the `ContextRow` on every page of the demo coven, a `Notice`: "This is a demo coven, so you can see how Sorrel & Salt works. You can look at everything and change nothing. A coven of your own starts with an invitation from someone who has one." (Owner edits the copy; British spelling.) A keeper sees a different sentence: "You own this coven as a site admin: what you change here is what every new account sees."
- The coven page's lede keeps the role sentence.

#### Rule and doc changes (ride in the first task's PR)

- `CLAUDE.md` invariants: "earns an account and _nothing else_" → "earns an account and an observer seat in the demo coven, and nothing else"; "There are no personal workspaces" gains "One demo coven, flagged `workspaces.demo`, is seeded on every environment and cannot be deleted"; the admin paragraph gains "except the demo coven, where every keeper holds a steward seat".
- `DESIGN.md` lines [11](claude-docs/DESIGN.md#L11), [245](claude-docs/DESIGN.md#L245), [2054](claude-docs/DESIGN.md#L2054), the `workspaces` entry in §5, the seed section at [1587-1596](claude-docs/DESIGN.md#L1587-L1596), the `migrate.yml` row at [1788](claude-docs/DESIGN.md#L1788).
- The schema comment "No `kind` column and no automatic workspace" in `workspaces.ts`.
- New `claude-docs/db/demo-scenario.md`; `claude-docs/ci/deploy.md` "Deploy"; `claude-docs/auth/coven-guard.md` (the landing now has a coven).
- `claude-docs/design-decisions/<first-id>-demo-coven.md` with the decisions above, and this plan copied beside it as `<first-id>-plan.md`.

### Tasks, one PR each, in execution order

Minted under M15 after checking the board for the next free number (parallel sessions mint ids). Placed after the wave's Done and In Review items.

| #   | Task                                                                                                                                                                           | Builds on  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| T1  | `workspaces.demo` column, partial unique index, `DEMO_WORKSPACE_ID`; the rule and doc amendments and the decision record                                                       | —          |
| T2  | `demo-coven.ts` seed: row, owner and viewer seats, backfill; script, `seedReferenceData`, migrate.yml, deploy.yml paths, `seed-environment.yml` doc; joins the `demo` scenario | T1         |
| T3  | Sign-up `after` hook seats the viewer                                                                                                                                          | T2         |
| T4  | Admin owner seats on promotion/demotion; `deleteWorkspace`, `removeMember`, `updateMemberRole` refusals                                                                        | T2         |
| T5  | Parameterise `demo.ts`'s helpers into `coven-content.ts` (no behaviour change)                                                                                                 | —          |
| T6  | Demo coven contents, resolved against the real compendium, reported skips                                                                                                      | T2, T5     |
| T7  | Demo badge, banner, `ShellContext.demo`                                                                                                                                        | T2         |
| T8  | Story 87: a new account lands in the demo coven, sees the badge and banner, cannot add an ingredient, leaves and is not re-seated; a keeper sees the owner sentence            | T3, T4, T7 |

T3, T4, T5 and T7 run in parallel after T2.

### Lane run, in worktrees

The main session coordinates: mints, briefs, merges, reviews, updates the board. Agents do every edit. All Sonnet.

**Before the lanes start (main session):**

1. Mint T1–T8 as M15.n on the board with `scripts/task-board.mjs` (check the board and `tasks/m15.md` for the next free number; place them after M15's Done and In Review items), write their entries in `claude-docs/tasks/m15.md`, `sync` each from the checkout holding the edit.
2. /app is on `review/mb123` today. Create `review/demo-coven` off `staging` and check it out in /app, so port 8000 shows this run. The MB.123 review branch stays as a branch. **I need you to say if 8000 must keep showing MB.123 instead; then this run gets no review server.**
3. One worktree per lane: `git worktree add /home/node/worktrees/demo-coven-<lane> -b feature/m15.<n>-<slug> staging`, `cp -a /app/node_modules` in, delete `node_modules/.cache/tsc/tsconfig.tsbuildinfo`, copy `/app/.env.local` in.

**Lanes:**

| Lane | Worktree       | Tasks, in order                                   | Starts                                                                          | Database                                                                                                 |
| ---- | -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A    | `demo-coven-a` | T1 schema + rules + decision record, then T2 seed | now                                                                             | its own `sorrel_demo_coven_a`: never `db:migrate`, `db:seed` or `db:reset` on the default `DATABASE_URL` |
| B    | `demo-coven-b` | T5 helper refactor, then T6 contents              | T5 now; T6 once T2 lands (lane B merges lane A's branch in)                     | own `sorrel_demo_coven_b` once T2 is in                                                                  |
| C    | `demo-coven-c` | T3 sign-up seat, then T4 admin seats and refusals | once T2 lands, branched off lane A's branch                                     | default (no migration of its own; its tests clone their own databases)                                   |
| D    | `demo-coven-d` | T7 badge and banner, then T8 story 87             | T7 once T1 lands; T8 once T3, T4 and T7 are all merged into `review/demo-coven` | default                                                                                                  |

Four agents, each holding its lane's context across its two tasks (a follow-on brief goes to the same agent by `SendMessage`, never a fresh one).

**Every lane brief says:**

- First step after the worktree: `node scripts/task-board.mjs status <ID> "In Progress"`.
- Run everything with `cd <worktree>`; never touch /app.
- TDD: failing test, watch it fail, minimum, refactor. Tests go under `tests/`, mirroring `src/`.
- Commit each green step after `npm run pre-commit`; never `--no-verify`.
- After every commit, message `main` one line with the hash. Main merges it into `review/demo-coven` in /app and tells the owner what is viewable.
- Tests: only the files the task adds or touches, through `npm test -- <file>`; the story through `flock /tmp/sorrel-e2e.lock npm run e2e -- tests/e2e/stories/87-demo-coven.spec.ts` with `E2E_PORT_BASE` set and `.env.local` copied in. One run per spec, no repeats. No full suite, no `test:coverage`, no `test:stories`, until the owner lifts the hold.
- Never a bare `npm run build`; never install a Playwright browser.
- Comments describe the code as it is; history and task ids go in `claude-docs/`.
- Title case on every label; British spelling in prose; no "(Optional)" on labels.
- When the task's criteria are met and verified, the lane hands the task to a PR agent (Sonnet) unasked: `Closes #N`, PR body ends with the `tally.mjs` output after a `---` rule, no Claude attribution. T1's PR targets `staging`; each dependent PR targets its prerequisite's branch (T2 → T1's, T3 → T2's, T4 → T3's, T6 → T2's after T5 → `staging`, T7 → T1's, T8 → the last of T3/T4/T7 to open). No stacking tool. Status `In Review` with the PR link in the same turn.
- A lane that nears its context limit commits what is green and messages main before it is cut off.

**The run ends** with every task in a mergeable PR, worktrees listed with their state for the owner to say which to remove, and the full suites (`test:coverage`, the touched stories) run once by main at the end — only when the owner lifts the individual-tests hold. At the task boundary main suggests `/clear`.

### Tests (TDD, per task)

- T1: `tests/db/partial-unique-indexes.test.ts` gains the index; the schema-drift test covers the column.
- T2: `tests/db/seed/demo-coven.test.ts` in the `db` project: a fresh database gets one row with the slug; a second run inserts nothing; a user with a soft-deleted seat is not re-seated; a keeper gets `owner`, everyone else `viewer`; a slug collision refuses.
- T3: `tests/lib/auth.test.ts` and an end-to-end sign-up in `tests/db/email-verification.test.ts`: the new user holds an observer seat; `canCreateWorkspace` stays `false` (the precondition the authorization rule needs); with no demo coven the sign-up still succeeds.
- T4: service tests with direct ids: promoting B to admin seats them as owner; demoting returns them to viewer; the system user cannot be removed or re-roled, and the test states why it could have succeeded (another steward exists); `deleteWorkspace` on the demo row throws the explaining error, and the same call on W succeeds for A.
- T5: existing `tests/db/seed/demo.test.ts` unchanged and green.
- T6: the seed test asserts every ingredient the content names resolves against the committed `compendium/` files, and the report lists a missing one without failing.
- T7: component tests by role and label: the badge and the Notice render for `demo: true` only.
- T8: `tests/e2e/stories/87-demo-coven.spec.ts`, `{ tag: '@story-87' }`, with an axe check on the coven page.

### Verification

- Per task: `npm run pre-commit`, then the task's own test file through `npm test -- <file>`; the story through `npm run test:stories -- --grep @story-87` with `E2E_PORT_BASE` set. No full suites until the owner lifts the hold.
- Locally end to end: `npm run db:reset:demo` on a worktree's own database, sign up a fresh account through the browser (MB.115 storage-state method), and check the landing is `/coven/sorrel-and-salt-demo` with the badge and banner.
- On staging after T2 merges: the deploy's "Seed reference data (preview)" summary lists the demo coven seed's report; the admin signs in and holds a steward seat.

## Task tracking on GitHub Issues and Projects

**Status:** decided. Live home: `claude-docs/task-tracking.md`.

### Decision

- **Issues live in this public repo**, chosen on the evidence that the comments carry names and narrative but no values, and that everything else about the project is already public. Three conditions hold: a pre-publication scan of the existing comments, a "names, never values" line in every skill step that posts a comment, and the Project's auto-add filter so strangers' issues never reach the board.
- **Waves are milestones.** Sub-issues are reserved for genuine parent and child (`M7.A.*` under `M7.A`, or a task split mid-flight).
- **Old PR-body `Asana task:` links stay.** The Asana workspace is left alive and archived so they keep resolving; nothing in the repo is rewritten.
- **`Task ID` lives in the issue title only.** The title is what `gh issue list` returns and what a PR body cites; a Project text field would only help table views.

### Why

A private tracker would be kept private at the cost of a visible repo; a private code repo would take the public compendium's repo out of view for a tracker's sake.

### Rules out

- A private issue repo or a private code repo.
- A Project text field for the id.

## Docs are split so a task loads only what it touches

**Status:** decided. Live home: `CLAUDE.md` (precedence line and rules index) and `claude-docs/token-efficiency.md`.

### Decision

- **`CLAUDE.md` is slim and always loaded.** It holds the Vocabulary, a short Commands table, the ten architecture rules with their numbers (each cut to its binding sentence plus a citation), the domain invariants, the Testing bullets that apply to every test, the Conventions, Out of scope, Skills and a short task-tracking summary. Everything longer lives in a path-scoped rule file or a subsystem doc.
- **Rule files are the long form of `CLAUDE.md` lines, never a rule of their own.** `.claude/rules/<area>.md` carries a `paths:` glob and loads only when a matching file is read or edited: `database.md` (rules 2–5 and 10), `graphql.md` (6–9), `components.md`, `testing.md`, `task-tracking.md`. Precedence is `DESIGN.md`, then `CLAUDE.md`, then a rule file.
- **The long command table is `claude-docs/commands.md`.**
- **`TASKS.md` splits by milestone, read in a declared sequence, not into per-task files.** `scripts/tasks-md.mjs` defines a wave range by the file order of the `**ID — title** · Nh` headings, and `tally.mjs` reads the same headings.
- **A doc split leaves the `## ` headings in the original file as an index.** `tests/guards/doc-citation.test.ts` resolves a cite by heading prefix in the cited file, so every code citation keeps resolving with no guard change.
- **The ten architecture rule numbers stay in `CLAUDE.md`**, because tests cite them in comments (`CLAUDE.md rule 4`).
- **Moves and rewrites are separate tasks**, so each diff reviews as one thing.
- **Skills:** `create-feature` and `create-hotfix` are short wrappers over one shared reference (the base branch is the only difference); a skill does not restate `CLAUDE.md`.
- **`TASKS.md` has no "Standing rules" section**; it cites `CLAUDE.md`.
- **The Vercel plugin is disabled for this repo** (project scope). There is no project effort override.

### Why

Claude Code loads `.claude/rules/*.md` with a `paths:` glob only when a matching file is read or edited, so unmatched rules cost nothing. `@imports` in `CLAUDE.md` are eager and buy nothing. Every always-loaded byte is paid on every turn.

### Rules out

- Per-task `TASKS.md` files, which break the wave-range and tally scripts.
- `@imports` in `CLAUDE.md` to save size.
- A rule file that holds a rule `CLAUDE.md` does not.

## The v1 docs close-out, with M11.12 and MB.90 (plan)

Approved by the owner on 2026-11-07 and run overnight in one PR. The decision records this close-out produced are the `mw15-*` files beside it; this file is the plan and the owner's answers it ran under.

### Principles (the owner's)

1. The docs hold only what adding a feature needs. History that informs no future decision is archived; closed-wave task material may go.
2. One home per fact. Never drop a fact; move it.
3. Anything that would rule out an old decision is a question for the owner, not a change.
4. Two audiences: people (`README.md`, `claude-docs/day-1.md`) and agents (`CLAUDE.md`, the rules, the skills, the summaries). Both concise.
5. The layout may be reorganised for cleaner writing and cheaper parsing.
6. A code comment holds only what is strictly necessary to warn of a nuance; the details are in the docs, cited.

### Owner decisions (2026-11-07)

1. **The old `claude-docs/archive/` and `transcripts/` are kept, compressed.** History lives under `claude-docs/archive/` as one gzipped tarball per kind (closed task entries, superseded decision records, transcripts, the deity Sources citations, the old archive); several files are fine. Git history holds the plain text.
2. **`archive/compendium-seed-shards/` stays plain** until MB.249 closes.
3. **Decision records marked history are archived**, `m12.8-jar-follows-local.md` among them. A record a live doc cites as its decision record is not history and stays.
4. **Closed-wave task entries are archived whole**; the live entry keeps only the lines the scripts read (its heading). Anything crucial for future development moves into a topic doc first.
5. **DESIGN.md §14 is retired**: its binding rows become records; the rest is in git.
6. **DESIGN.md §5, §7 and §9 are split** into `claude-docs/design/`.
7. **`claude-docs/backlog.md` is the one home for deferred work**; `CLAUDE.md` keeps a one-line do-not-build pointer.
8. **No doc states a seed count**: seeded content is subject to change.
9. **A component doc exists only where it holds a binding fact the source cannot say**; a sub-part is covered by its parent's doc.
10. **The eleven components without a story owe one**: the rule stays, and M17.20 adds them.
11. **The deity Sources citations are archived**; the annotations stay in the seed doc.
12. `claude-docs/backlog.md` stays.
13. **The story-numbering rule lives in `claude-docs/testing/acceptance.md`.**
14. **M17.19 (one Drizzle snapshot) is minted and built in this PR.**
15. The stale Vercel Preview note in `secrets.md` is removed, the credentials having been reset.
16. A dev server for the owner is started only on a port the owner names, never offered.
17. A review or an audit starts in a worktree unless the owner says otherwise.

### Lanes

Each lane edited only its own paths in the shared worktree, committed with a pathspec under a lock, and wrote any fact that belonged to another lane's file to a shared facts file, which an integration pass folded in. Every doc/code disagreement a lane fixed is listed in the PR body with the side that was wrong.

| Lane       | Scope                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A          | `CLAUDE.md`, the rule files, the skills, `modules.md`, `task-tracking.md`, `commands.md`; a new `.claude/rules/domain.md`                                                        |
| B          | The subsystem summaries (`db/`, `auth/`, `ci/`, `testing/`, `graphql/`, `billing/`, `compendium/`), then the integration of every facts file and the repoint of every moved path |
| C          | `design-decisions/`: closed-wave plans read and deleted after their facts moved, records trimmed, `INDEX.md`                                                                     |
| D, D2      | `TASKS.md`, `tasks/`, `waves/`: narration out, closed waves archived, entries cut to their headings                                                                              |
| E          | `components/`: the five largest rewritten, 14 small docs folded, dated attributions out                                                                                          |
| G, G2      | `DESIGN.md` corrected against the code, then split; `README.md` setup                                                                                                            |
| M          | MB.90: `.env.example`, `scripts/setup.ts`, the env guard, `day-1.md`                                                                                                             |
| F1–F4      | Code comments in `src/modules`, `src/components` + `src/emails` + `src/app`, the `.scss` files, and `src/lib` + `src/db` + `src/graphql` + `scripts` + `tests`                   |
| M17.19     | Mint M17.19 and M17.20; build M17.19                                                                                                                                             |
| Archive    | The tarballs and `archive/README.md`                                                                                                                                             |
| Loss audit | Every removed sentence checked against the live tree; what was stated nowhere was restored                                                                                       |

### Verification

The loss audit took every line removed since `origin/staging`, kept the fact-shaped sentences, matched each against the live docs and code, and read every unmatched one: two facts were stated nowhere and were restored, the rest were history, plan steps or stated elsewhere. Then `lint`, `format:check`, `typecheck`, `test:coverage` and a production build into a separate dist dir.

## Stack choices that were weighed and rejected

**Status:** decided. These rows came from the DESIGN.md decision log, which was retired when the log moved into records.

**Decided:** the project does not use any of the following. Each line gives the reason that still holds.

- **Gatsby, as `resume-2026` uses.** Static site generation has no server runtime for sessions or audit stamping.
- **A Vite single-page app.** Neon has no browser-facing API, and a `created_by` set by the client is forgeable.
- **Supabase.** The free tier pauses after 7 days and needs a manual restore.
- **Render Postgres.** The free instance expires 30 days after creation.
- **Netlify.** Vercel Hobby gives 6,000 build minutes against 300, and native Next.js.
- **Apollo Client.** It duplicates TanStack Query's cache and adds about 40 kB.
- **SQLite for tests.** It cannot run PL/pgSQL triggers, `pg_trgm`, `num_nonnulls`, generated columns or array columns (`celestial_bodies[]`, `elements[]`).
- **Neon branches for CI.** Local Postgres is faster and removes the branch limit and the API key.
- **Server functions instead of GraphQL.** Only about 14 hours of the original plan existed purely for the transport; the rest is services, validation, pagination and batching. One typed contract, an SDL that makes schema changes visible in a PR, and introspection while building were judged worth that. The accepted cost: `updateTag` works only in Server Actions, so it is unreachable behind the route handler.
- **Trunk-based development instead of Gitflow.** Trunk with per-PR previews would remove `gitflow.yml`, three skills, the `staging` branch and its Neon branch-scoped override, but it would also remove the staging soak. Revisit if the promotion pipeline starts costing more than it catches.
- **Better Auth's `anonymous` plugin for signed-out visitors.** It would create a `users` row and a cookie per visit and per crawl, add a third identity bootstrap outside `withAudit`, and make static pages dynamic for nothing a public read needs. A signed-out reader is `null`.
