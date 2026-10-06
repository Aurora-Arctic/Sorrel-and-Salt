# 0048_drop-deities-list — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.167 moved every reader and writer of `ingredients.deities` to `ingredient_deities` and took the column out of the Drizzle schema, and that code is what staging serves, so no staging deploy that meets this migration reads or writes it. The migration first copies across, as unlinked names, any entry written to the list after 0041's fill, so the table holds every deity the list did.

## Findings this covers

| Rule              | Statement                                         |
| ----------------- | ------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "deities"` |

The `INSERT` before it is not a finding.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. On staging that deploy is MB.167's or later, and none of them declares the column: MB.167 removed it from `src/modules/ingredients/schema/ingredients.ts`, and no file under `src/` reads or writes it outside migrations 0005, which added it, 0041, which filled the table from it, and this one.

Production does not hold the same way, and that is the owner's call rather than an oversight. Its deploy, v0.5.0, still declares the column, and no release has carried MB.167, so the release that carries this migration will carry MB.167 with it and drop the column under v0.5.0 for the length of the rollout: v0.5.0's `ingredients` reads fail between `migrate.yml` and the promotion. MB.137 and MB.141 waited for a release for exactly this reason. MB.168 waits on staging alone because production is not live yet: no member is reading or writing under v0.5.0, so the window costs nothing (MB.168's task text; `claude-docs/design-decisions/mb.165-plan.md`, "Execution order"). Were production live before that release, MB.168 would wait for a release carrying MB.167 first, as MB.141 waited for MB.140's.

## What is lost

Nothing. Every entry is in `ingredient_deities` before the drop: 0041 copied the list as it stood, and this migration copies whatever the deploy before MB.167 added after that, each after the rows its ingredient already holds, in the list's order. It adds only. A name the table already holds, in any case, linked or not, is left as it is. So is a name a member removed after MB.167, whose soft-deleted row is newer than the list. An entry removed from the list between 0041 and MB.167 stays in the table, because the list cannot say which of its absences were removals. A rollback to a deploy that predates MB.167 would find the column gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
