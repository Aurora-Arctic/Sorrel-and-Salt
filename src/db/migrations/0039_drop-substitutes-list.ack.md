# 0039_drop-substitutes-list — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.140 moved every reader and writer of `ingredients.substitutes` to `ingredient_substitutes` and took the column out of the Drizzle schema, and that code is what staging serves, so no staging deploy that meets this migration reads or writes it. The migration first copies across, as names, any entry written to the list after 0032's fill, so the table holds every substitute the list did.

## Findings this covers

| Rule              | Statement                                             |
| ----------------- | ----------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "substitutes"` |

The `INSERT` before it is not a finding.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. On staging that deploy is MB.140's or later, and none of them declares the column: MB.140 removed it from `src/modules/ingredients/schema/ingredients.ts`, and no file under `src/` reads or writes it outside migrations 0005, which added it, 0032, which filled the table from it, and this one.

Production holds the same way. Its deploy declared the column until v0.5.0, which carried MB.140 and stops at migration 0033, so the release that carries this migration meets a deploy that no longer declares it. Had both shipped in one release, production's old deploy would have failed every `ingredients` read between `migrate.yml` and the promotion.

## What is lost

Nothing. Every entry is in `ingredient_substitutes` before the drop: 0032 copied the list as it stood, and this migration copies whatever the deploy before MB.140 added after that. It adds only. A name the table already holds, in any case, is left as it is. So is a name a member removed after MB.140, whose soft-deleted row is newer than the list. An entry removed from the list between 0032 and MB.140 stays in the table, because the list cannot say which of its absences were removals. A rollback to a deploy that predates MB.140 would find the column gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
