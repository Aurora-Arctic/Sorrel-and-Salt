# Handoff: running `feature/seeding-continued` locally

Written at the end of M14.7, 2026-10-23. This is a session handoff, not project documentation: delete it before the branch's pull request opens, or keep it until the wave is done. It assumes a machine with Node 26.6.0, Docker (for Postgres 18) and this repo cloned.

## What the branch holds

Seven commits over `staging`, one or two per task, in the wave's execution order:

| Commit     | Task  | What it does                                                                                                                                                                                                   |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a061b506` | M14.1 | The seed's `toxic` flag on entries and forms: types, guard rule, writer, README, and the flags set on the current shards.                                                                                      |
| `f73d5733` | M14.2 | Decision record `claude-docs/design-decisions/m14.2-physical-uses.md`: how an ingredient records its physical uses. Documentation only.                                                                        |
| `b6ba9824` | M14.5 | Migration `0081_compendium-seed-state-expand.sql`: `seed_content_hash`, `curator_reviewed_at`, `curator_reviewed_by` on `ingredients`, and the `set_updated_at()` trigger that ignores them (`app.touch_row`). |
| `a5d2993d` | M14.6 | `compendium/` entry files: the parser, the renderer, the content hash, the loader (`loadCompendium`) and the file rules in the guard (`checkCompendiumFiles`).                                                 |
| `d2ca287f` | M14.7 | Refactor: the row builders the insert and the update share (`src/db/seed/compendium/rows.ts`). No behaviour change.                                                                                            |
| `19dcd658` | M14.7 | The update path (`update.ts`), the run report (`report.ts`), `seed:mark`, `seed:queue`, `--dry-run` and `--adopt`, the CI comment on refusals, and the doc updates.                                            |
| `dd50bf26` | M14.7 | The tests for the update path, the mark and the report.                                                                                                                                                        |

M14.4 (the markdown file format and its docs) was merged before this branch started; the branch builds on it.

The seed still reads the seven TypeScript shards. `COMPENDIUM` in `src/db/seed/compendium/index.ts` stays the shards until M14.10 cuts over to the files. The three files under `compendium/ingredients/` are M14.4's samples and are marked `needs-review`, so the seed never writes them.

## Nothing on this branch has been run

Per your instruction, no test suite ran in this session. Every commit passes `prettier --check`, `oxlint` and `tsc --noEmit` (the pre-commit hook ran them on each commit), and the migration passes `check:destructive-ddl`. The behaviour is unverified until you run the tests below. Expect some red: the db tests were written against the schema and the trigger as read from the code, not observed.

## Set up and run

1. Check out the branch and install:

   ```sh
   git fetch origin feature/seeding-continued
   git checkout feature/seeding-continued
   npm ci
   ```

2. Start Postgres and point `.env.local`'s `DATABASE_URL` at it. The Docker stack does this: `make docker-up` (claude-docs/docker.md). A plain local Postgres 18 works too, as long as `DATABASE_URL` reaches it.

3. Apply the migrations, which includes the new 0081:

   ```sh
   npm run db:migrate
   ```

4. Seed the vocabularies and the compendium in `migrate.yml`'s order:

   ```sh
   npm run db:seed:categories
   npm run db:seed:forms
   npm run db:seed:astrology
   npm run db:seed:deities
   npm run db:seed:sources
   npm run db:seed:compendium
   ```

   The last one prints a report ending in a counts line, `inserted 313, skipped 0, ...` on a fresh database. Run it again and every entry reads `skipped`.

   Or, for the whole thing in one go with the fixture data, `npm run db:reset:demo` (the `demo` scenario seeds the compendium as part of the scenario).

5. The new commands:

   ```sh
   npm run db:seed:compendium -- --dry-run          # decide and report, write nothing
   npm run db:seed:compendium -- --dry-run --adopt  # also list rows adopting a manifest hash
   npm run seed:mark compendium/ingredients/mineral/agate-quartz-var-agate.md   # refused: the file is needs-review
   npm run seed:queue                               # the needs-review files
   ```

   `seed:mark` takes a path from the repository root, starting `compendium/`. To see an update land you need an `approved` file the seed has inserted, which none of the three samples is yet; M14.9 and M14.10 bring the 313 entries over as files, and from then on the flow is: edit a file, `npm run seed:mark <file>`, `npm run db:seed:compendium`.

## What to run to verify

The CI gate's checks, in increasing cost:

```sh
npm run pre-commit                 # lint, format, types on the changed files
npm run check:destructive-ddl      # the 0081 migration adds columns and a trigger only
npm run test:coverage              # all five Vitest projects, 80% threshold
```

The db project needs the Docker Postgres up (claude-docs/testing/db-harness.md). To run only this branch's tests first:

```sh
npx vitest run tests/db/seed tests/db/compendium-seed-state.test.ts tests/modules/ingredients/schema/ingredients-schema.test.ts tests/components/IngredientEntry
```

The files the branch added or changed under `tests/`:

- `tests/db/seed/compendium.test.ts`: the seed on the fixture, with the new "the update path (M14.7)" describe (19 cases).
- `tests/db/seed/compendium/{content-hash,parse-entry,load,guard-files,mark,report}.test.ts`: unit tests, no database.
- `tests/db/seed/compendium-literals.test.ts`: the guard over the shards, with the toxic rule.
- `tests/db/compendium-seed-state.test.ts`: the 0081 columns and the trigger's ignore list.
- `tests/modules/ingredients/schema/ingredients-schema.test.ts`, `tests/components/IngredientEntry/index.test.tsx`, `tests/support/entry-detail.ts`: the toxic flag reaching the schema and the entry component.
- Fixtures: `tests/db/seed/compendium-fixture.ts`, `tests/db/seed/compendium/files-fixture.ts`.

The most likely failures, if any, are in the update-path cases that set up rows raw (the form-in-use case inserts a workspace and a stock row; the "touched" cases stamp `updated_by` under `asTouch`). A failure there is more likely a test's setup than the seed, but read it either way.

No story or e2e test changed: nothing on this branch has a screen yet. M14.8 adds the first (the curator's "reviewed" mark in the admin).

## Decisions I took that you should confirm

Each is stated in the code's comment or the README, and reversible:

1. **A shard literal is taken as approved and never marked.** So if a shard's literal changes before M14.10, the entry reads `PENDING` rather than updating. Harmless, and gone at the cutover.
2. **A child row the seed itself soft-deleted is not a refusal.** Refusal 3 (an editor touched or deleted a child) reads `deleted_by`: a row the seed retired on an earlier update is its own work. Without this, every second update of an entry would be refused.
3. **Adoption is automatic while the manifest exists; `--adopt` only prints the `ADOPTED` lines.** The alternative, adopting only under the flag, would make the first production run after M14.9 refuse every one of the 313 entries.
4. **`overwriteEditor` clears the curator mark** when its update lands. The README states this as an assumption for you to confirm.
5. **`app.touch_row` is set around the parent `UPDATE`**, so `updated_at` and `updated_by` move on a child-only change (a folk name added, say) even though no parent column changed.
6. **The branch must land with M14.9's manifest.** Until then production's rows have a null `seed_content_hash` and a real file edit would be `REFUSED: no baseline`, exit 1, blocking the deploy. The seed only runs when seed files change, so this is a sequencing note, not a live risk.
7. **`seedCompendiumContent` adopts nothing unless given a manifest**, so the `demo` scenario's call is unchanged.
8. **Toxic flags.** M14.1 set `toxic: true` on the entries the sources describe as poisonous. The borderline ones are listed in the M14.1 commit message and in the README's toxic section for you to review.
9. **M14.6's `SeedCompendiumFile` wrapper type**, and that the content rules run on `approved` files only, and that `toxic` may be written only as the literal `true`.

## Board moves owed

The task board script could not run from this session (`GH_TOKEN` was invalid and the GraphQL endpoint blocked), so no issue moved. When you are back:

```sh
node scripts/task-board.mjs status M14.1 "In Progress"   # then In Review when the PR opens
```

for M14.1, M14.2, M14.5, M14.6 and M14.7. The branch carries several tasks against CLAUDE.md's one-task-per-PR rule, on your instruction; the PR body should say so and open with `Refs #N` for each.

## What remains in the wave

In execution order from `claude-docs/waves/wave-14.md`:

- **M14.8** the curator-reviewed mark: service, GraphQL field and mutation, the admin entry page's control and the list filter.
- **M14.9** convert the seven shards to markdown files, write `compendium/.converted-hashes.json`, and a fidelity test that the files load to the same entries.
- **M14.10** cut the seed over to the files, delete the shards, archive the shard docs, update `deploy.yml`'s seed watch list.
- **M14.11** the attribution audit script and the `unaudited` ratchet test.
- **M14.12** correct the two Aspen sample files.
- **M14.13** run the audit report and queue the results for you (the `--apply` step needs your go-ahead).
- **MB.243 to MB.246, MB.248** the remaining shard parts as markdown files, after M14.10.
- **MB.249** the close-out.

I continue with M14.8 next unless you say otherwise.
