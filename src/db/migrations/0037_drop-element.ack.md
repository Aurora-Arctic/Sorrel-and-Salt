# 0037_drop-element — destructive DDL

Destructive DDL acknowledged: this is the contract step of MB.157's expand/contract move from `element` to `elements`. MB.158 added the list and filled it (0034), MB.159 stopped declaring the single and filled the list again (0035), and that code is what any deploy meeting this migration serves, so none of them reads or writes the column.

## Findings this covers

| Rule              | Statement                                         |
| ----------------- | ------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "element"` |

Nothing else is in the migration. The `ingredient_element` type stays, because `elements` is an array of it.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. Here that deploy is MB.159's or later, which no longer declares `element`: MB.159 removed it from `src/modules/ingredients/schema/ingredients.ts`, and no file under `src/` names it outside migrations 0035 and earlier. This merges only after MB.159 has deployed to staging.

Production is not live yet, so a release carrying MB.159 and this migration together would break reads only on a deploy nobody uses, for the length of the rollout.

## What is lost

Writes to `element` made after MB.159's refill ran and before MB.159's deploy promoted, while the old deploy was the only one writing the single. 0035 copied everything written before it. A last fill here cannot recover that window without harming other rows. Once MB.159 promoted, members edit `elements` and nothing rewrites `element`. So a row whose single disagrees with its list is either a write from that window or a list edited since, and nothing in the row says which. Copying the single in would bring back an element a member removed at any time since MB.159 promoted, while leaving the list alone loses only that window, which lasts minutes.

A rollback to a deploy that predates MB.159 would find the column gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
