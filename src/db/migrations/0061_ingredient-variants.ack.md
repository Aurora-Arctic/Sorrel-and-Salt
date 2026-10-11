# 0061_ingredient-variants — destructive DDL

Destructive DDL acknowledged: a false positive. `0061` adds `ingredients.identity_key` as a stored generated column, `lower(coalesce(canonical_name, name))`, declared `NOT NULL` with no `DEFAULT`. Postgres computes the column for every existing row as it adds it, and the expression is never null because `name` is `NOT NULL`, so no row can fail the constraint and nothing is backfilled by hand (MB.216).

## Findings this covers

| Rule                                      | Statement                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ADD COLUMN ... NOT NULL` without DEFAULT | `ALTER TABLE "ingredients" ADD COLUMN "identity_key" text GENERATED ALWAYS AS (lower(coalesce(canonical_name, name))) STORED NOT NULL` |

Nothing else in the migration is flagged: the new table's `NOT NULL` columns are created with it, and every other statement adds a constraint, an index or a trigger.

## Why the finding is safe

- **No row can fail it.** The check flags a `NOT NULL` column added with no `DEFAULT` because an existing row would have nothing to hold. A generated column is its own default: Postgres rewrites the table filling it from the expression, and `coalesce(canonical_name, name)` is null only when `name` is, which `name`'s own `NOT NULL` already refuses.
- **No writer can set it.** `GENERATED ALWAYS` refuses a direct write, and Drizzle leaves the column out of the insert type, so the deploy still serving cannot write a wrong value either.

## Why this is one PR, not two

CLAUDE.md rule 10 splits a column or index drop across two PRs because the deploy still serving when `migrate.yml` runs must not lose anything it reads. Nothing here is dropped or narrowed: the column is new, the deploy still serving does not name it, and its inserts succeed because it never could write the column. The identity-key indexes `0062` adds refuse a second live entry of one formal name in a tier, which that deploy could try to write as a second form of an existing entry; that refusal is the model MB.215 records, and until MB.220 maps the index's name it reaches the admin as an unmapped error, a short window on an admin-only write (`claude-docs/design-decisions/mb.215-plan.md`, "Risks"). The precedent for a finding that loses nothing standing in one PR is `0029` and `0038`.

## What is lost

Nothing. No row changes but by gaining a computed value, and no column, index or constraint is removed.
