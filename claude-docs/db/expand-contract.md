## Expand/contract and the destructive-DDL check (M1.5)

Drizzle generates no down migrations, and hand-writing them is a reliable way
to lose data — so none exist in this repo, and none should ever be added.
The only rollback path for a bad release is a **deploy rollback**: redeploy
the previous app version against the database as it stands. That only works
if every migration leaves the schema compatible with both the app version
that shipped it _and_ the one before it — the expand/contract pattern:

1. **Expand** — a migration that only adds (a column, a table, an index) is
   always safe: old code that doesn't know about the new column simply
   ignores it.
2. **Migrate the app** — ship code that uses the new shape, typically
   alongside the old one for a transition period (dual-write, read-with-fallback).
3. **Contract** — once nothing depends on the old shape any more (usually one
   release later, after the transition period has had a chance to run in
   production), a later migration removes it.

**A drop is the contract step alone, split across two tasks** — code
references out first, the migration `drizzle-kit generate` then produces in a
second PR, with its sidecar (CLAUDE.md rule 10; the procedure is
`.claude/rules/database.md`'s). `migrate.yml` runs
before `deploy.yml` promotes, and Drizzle names every declared column in a
`SELECT`, so dropping a column the live deploy still declares breaks its reads
for the length of the rollout, and a rollback past the migration for good.
That holds on production as on staging, and a drop task waits only for its
switch to reach staging: the release that carries a drop must follow one that
carried its switch, unless production never declared the column, as with
`0028`.
MB.82 and MB.107 are the worked case: MB.82 stopped declaring `pending_slug`
and its date, and MB.107 dropped them. Between the two, `db:generate` on any branch emits the drop; it belongs to
the second task, and the destructive-DDL check refuses it unacknowledged. A
data migration may still ride in the first, written with `generate --custom`,
which copies the last snapshot rather than diffing the schema, so the
undeclared columns stay in it: MB.136's `0031_refill-ingredient-lists` is
the worked case.

**A table added while a drop is pending is `generate --custom` too**, with the
DDL taken from a `generate` run into a scratch copy of `src/db/migrations`
(`--config` naming a copy of `drizzle.config.ts` whose `out` is the copy), and
the drop it also emits left out. drizzle-kit prefixes `out` with `./`, so the
copy's path is written relative to the repository: an absolute one resolves
to nothing. The new snapshot is the copied one plus that run's entries for
the new tables, so the undeclared columns stay in it and the drop is still
the second task's to generate; a second scratch `generate` from it should
emit the pending drops and nothing else. MB.139's
`0032_ingredient-substitutes` is the worked case, made while MB.137's drop of
the planet, zodiac and colour singles was pending, and MB.128's
`0033_deities` the second, made while MB.141's was pending too.

**A drop made while another is pending is `generate --custom` as well**, its
`DROP` taken from the same scratch run and the other task's left out. The
snapshot is the copied one less the dropped column, so a second scratch
`generate` still emits the other drop and nothing else. MB.141's
`0034_drop-substitutes-list` is the worked case, made while MB.137's was
pending. It also fills before it drops, for whatever the deploy before the
switch wrote after the first fill. Unlike `0031`, that refill only adds: by
the drop the switch has been writing the table, so a row there, live or
removed, is newer than the list.

Renaming a column is the canonical case that goes wrong if done directly —
`ALTER TABLE ... RENAME COLUMN` is atomic in Postgres, but it isn't atomic
across a _deploy_: for the seconds-to-minutes it takes Vercel to roll traffic
from the old app version to the new one, both are reading and writing the
same row, and the old version's query for the old column name starts erroring
mid-rollout. Never do it in one step. Instead:

**Worked example: renaming `spells.name` to `spells.title` across two releases**

- **Release N — expand.** A migration adds the new column and backfills it;
  the app writes both and reads with a fallback.

  ```sql
  -- src/db/migrations/00NN_add-spells-title.sql
  ALTER TABLE spells ADD COLUMN title text;
  UPDATE spells SET title = name WHERE title IS NULL;
  ```

  In the schema file (Drizzle), both columns exist on the table for this
  release:

  ```ts
  export const spells = pgTable('spells', {
    // ...
    name: text('name'), // deprecated — still written, read as a fallback only
    title: text('title'), // canonical as of Release N
    // ...
  });
  ```

  And the write path (inside `withAudit`, in the module's `services/`) writes both;
  the read path prefers `title`, falling back to `name` for any row a
  same-release backfill or an in-flight write hasn't caught yet:

  ```ts
  // write
  await tx.update(spells).set({ name: input.title, title: input.title }).where(...);

  // read
  const displayTitle = row.title ?? row.name;
  ```

  This is safe to deploy and, just as importantly, safe to **roll back** —
  the previous app version (Release N-1, which only knows `name`) still
  works fine against this schema, since `name` is still present and still
  kept up to date.

- **Release N+1 — contract.** Once Release N has been running in production
  long enough that nothing reads `name` any more (every row has been
  written under Release N's dual-write, and no older app version is still
  deployed anywhere), a later migration drops it:

  ```sql
  -- src/db/migrations/00MM_drop-spells-name.sql
  ALTER TABLE spells DROP COLUMN name;
  ```

  and the schema/service code drops the fallback and the dual-write, reading
  and writing `title` only. **This migration is destructive** — it needs an
  acknowledgement sidecar beside it — `src/db/migrations/00MM_drop-spells-name.ack.md`,
  in the form described below — precisely because a same-release
  rollback of Release N+1 back to Release N would otherwise break (Release
  N's dual-write still tries to write `name`, which no longer exists). That
  tradeoff — Release N+1 can no longer safely roll back to Release N, only
  forward-fixed — is exactly what the acknowledgement line is for: a human
  has to say out loud "yes, this is the point where we give up the old
  column," not have it happen silently.

**The CI check (`checks / destructive-ddl` / `scripts/check-destructive-ddl.ts`,
M1.5; a `checks.yml` leg since MB.37)** scans migration files new or changed in
a PR for five forms:

- **any `DROP`** — column, table, type, constraint, index, function, trigger,
  view. Rule 10 says "DROP", and a dropped type or constraint breaks a
  rolled-back release as readily as a dropped column. The two exceptions
  **widen** rather than narrow and pass: `DROP NOT NULL` and `DROP DEFAULT`
  only admit values the old code was already writing. `DROP INDEX` is
  deliberately inside the rule, which means a changed index predicate — Drizzle
  emits `DROP INDEX` + `CREATE INDEX` for one — costs an acknowledgement line
  saying the rebuild is intentional.
- **`RENAME`** (column or table). An index rename is caught too, though it
  cannot break a rollback; Drizzle never emits one.
- **`ALTER COLUMN ... TYPE`**, flagged whenever present — telling narrowing
  apart from widening reliably needs a real SQL parser and the column's
  previous definition, not just regexes over the new migration's text.
- **a `NOT NULL` addition** — `SET NOT NULL`, or `ADD COLUMN ... NOT NULL` with
  no `DEFAULT`.

Comments and string literals are stripped before any rule runs, so a column
comment reading `'never drop this'` is prose rather than DDL. Statements are
split on `;` with no awareness of dollar-quoted bodies, so a PL/pgSQL function
is judged as several fragments rather than one statement — harmless while no
rule spans a `BEGIN … END`, and the first thing to fix if one ever must. Only `*.sql` is
ever scanned: the `meta/*.json` files Drizzle writes beside each migration are
excluded by the paths filter in `pr-gate.yml` **and** by the script, which
ignores anything else it is handed.

It passes automatically when none of those forms appear. When one does, that
migration must carry an **acknowledgement sidecar** beside it (MB.48), named
for the migration it covers:

```
src/db/migrations/0002_solid_marauders.sql
  → src/db/migrations/0002_solid_marauders.ack.md
```

containing, anywhere in the file, a line of the exact form:

```
Destructive DDL acknowledged: <reason>
```

(case-insensitive, a non-empty reason required) — see the script's own header
comment for the regex and the reasoning. There's no such line format elsewhere
in the repo to stay consistent with; this is the one place it's defined, so
`claude-docs/ci/reusable-checks.md` and the script both point back here.

**It used to live in the PR body, and that was wrong twice over.** A PR body is
visible from one branch base and gone on merge, so a release PR — which
`resolveDefaultBase` sends at `origin/main`, rescanning every migration since
the last release — sees none of the acknowledgements that let those migrations
land; release 0.2.0's PR failed this check for exactly that reason and was
merged past it. And one line in a body blessed **every** finding in the diff,
whatever file it was in, so a release carrying an acknowledged `0017` and an
unacknowledged `0002` would have passed on `0017`'s line alone. The sidecar
fixes both: it travels with the file, and it covers only the file beside it.
The PR-body path is retired rather than OR-ed with the sidecar — an `OR` would
keep the uncorrelated hole open — so the check now reads nothing from GitHub
at all, which is what lets `make act-check CHECK=destructive-ddl` prove the
scan rather than the wiring.

A `.md` sidecar rather than a comment inside the `.sql`: the regex anchors at
the start of a line, so Markdown matches it unchanged where
`-- Destructive DDL acknowledged: …` would not. And every file list here is
scoped to `*.sql`, so a sidecar is never itself scanned.

**Locally, `npm run check:destructive-ddl` scans what this branch adds** —
every migration new or changed against its Gitflow base (`origin/staging`, or
`origin/main` for a `hotfix/*` or `release/*` branch), including one
`db:generate` has just written and not yet committed. `--base <ref>` picks
another base. `--all` scans every committed migration instead, which is an
audit rather than a gate — and since MB.48 it is a **usable** one: both
migrations carrying destructive DDL ship their sidecars, so `--all` is green
and goes red on a real omission. It was permanently red before, first because
the bare command _was_ that full scan (fixed in MB.37) and then because the
acknowledgements it needed only ever existed in PR bodies.

Six migrations carry findings today, and each has its sidecar:

| Migration                           | Findings                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `0002_solid_marauders.sql`          | `DROP CONSTRAINT users_email_unique`, and `created_by` / `updated_by` added `NOT NULL`                                               |
| `0017_custom-spell-ingredients.sql` | the `(spell_id, ingredient_id)` primary key and the `(spell_id, layer_order)` unique index dropped                                   |
| `0025_ingredient-slugs.sql`         | `ingredients.slug` set `NOT NULL` with no backfill between, the seed standing in for one (["Ingredient slugs"](ingredient-slugs.md)) |
| `0028_drop-pending-slugs.sql`       | the two pending-slug indexes and columns dropped, the contract half of MB.82's change ("Expand/contract")                            |
| `0029_spell-layers-soft-delete.sql` | `spell_ingredients`' `(spell_id, layer_order)` primary key and its two unique indexes dropped, each re-created first as partial      |
| `0034_drop-substitutes-list.sql`    | `ingredients.substitutes` dropped, the contract half of MB.140's switch, after a refill into `ingredient_substitutes`                |

**`0002`'s sidecar was written retroactively, and says so.** This document
previously claimed its `DROP CONSTRAINT` and two `NOT NULL` columns "were
acknowledged when they landed". That was false: [PR #73][pr73] carries no
acknowledgement line and never did, because it merged during the window MB.32
opened and MB.37 closed, when `destructive-ddl` had been dropped from
`pr-gate.yml` and ran on nothing. The migration was never asked for a line, so
the reasoning in its sidecar is reconstructed from the migration and the schema
rather than recovered. `0017`'s ports [PR #126][pr126]'s wording verbatim,
which was correct and argued at the time.

[pr73]: https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/73
[pr126]: https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/126
