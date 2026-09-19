# 0002_solid_marauders — destructive DDL

Destructive DDL acknowledged: the dropped `users_email_unique` constraint is re-expressed as a partial unique index on the last line of the same migration, so uniqueness is narrowed to live rows rather than given up; and `created_by`/`updated_by` land `NOT NULL` on a `users` table that was provably empty, because `ADD COLUMN ... NOT NULL` without a `DEFAULT` cannot succeed on a table with rows.

## Findings this covers

| Rule                                      | Statement                                                   |
| ----------------------------------------- | ----------------------------------------------------------- |
| DROP (any object)                         | `ALTER TABLE "users" DROP CONSTRAINT "users_email_unique"`  |
| ADD COLUMN ... NOT NULL without a DEFAULT | `ALTER TABLE "users" ADD COLUMN "created_by" uuid NOT NULL` |
| ADD COLUMN ... NOT NULL without a DEFAULT | `ALTER TABLE "users" ADD COLUMN "updated_by" uuid NOT NULL` |

## Why the dropped constraint is safe

The constraint and its replacement are in the same file:

```sql
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";
...
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE "users"."deleted_at" is null;
```

This is CLAUDE.md rule 4 arriving at `users`: every unique index is partial (`WHERE deleted_at IS NULL`), because without it a soft-deleted record permanently reserves its email. The guarantee is not withdrawn, it is narrowed to the rows the application can still see — and a migration is applied in one transaction, so no window exists in which the column is unconstrained. A rollback to pre-`0002` code is unaffected: that code inserts live rows, which the partial index constrains exactly as the table constraint did.

## Why the two NOT NULL columns are safe

`ADD COLUMN ... NOT NULL` without a `DEFAULT` is refused outright by Postgres on a table that already has rows. That this migration applied — in every environment, including production — is therefore not an argument that `users` was empty; it is proof of it. `0002` is part of the auth wave that created the first user rows, and it ran before any existed.

The risk the rule exists to catch is the other half, and it does not arise either: older application code rolled back against this schema would have to `INSERT` into `users` without supplying `created_by`/`updated_by`. Nothing inserts into `users` except Better Auth's sign-up hook in `src/lib/auth.ts`, which is the code that introduced these columns (CLAUDE.md rule 3's first identity bootstrap — it stamps the row as its own creator). There is no deployed release in which a `users` insert omits them.

## Provenance — written retroactively

This sidecar is new, not a port. [PR #73](https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/73) carries **no** acknowledgement line and never did: it merged during the window MB.32 opened and MB.37 closed, when `destructive-ddl` had been dropped from `pr-gate.yml` and ran on nothing. So this migration was never asked for a line, and the reasoning above was reconstructed from the migration and the schema rather than recovered from the PR.

`claude-docs/db.md` previously stated that these statements "were acknowledged when they landed". That was false, and MB.48 corrects it there. Recording the correction here too, because this file is where someone checking the claim will look.
