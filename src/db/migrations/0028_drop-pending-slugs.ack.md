# 0028_drop-pending-slugs — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.82 took `pending_slug`, `pending_slug_effective_at` and their two partial unique indexes out of the Drizzle schema, and that code is what staging now serves, so no deploy that meets this migration reads or writes any of the four. Every row holds null in both columns, because nothing ever wrote them, and production has never had them.

## Findings this covers

| Rule              | Statement                                                           |
| ----------------- | ------------------------------------------------------------------- |
| DROP (any object) | `DROP INDEX "ingredients_compendium_pending_slug_unique"`           |
| DROP (any object) | `DROP INDEX "ingredients_workspace_pending_slug_unique"`            |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "pending_slug"`              |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "pending_slug_effective_at"` |

Nothing else is in the migration.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. Here that deploy is MB.82's or later, and none of them declares the columns: MB.82 removed them from `src/modules/ingredients/schema/ingredients.ts`, and no file under `src/` names them outside migration 0025, which added them. The same holds for the two indexes, which only the dropped columns fed.

Production's last release stops at migration 0022, before MB.81's 0025 added the columns. The release that carries this migration therefore runs 0025 and 0028 together: production gains and loses the columns in one `drizzle-kit migrate`, and no production deploy ever declared them.

## What is lost

Nothing. The columns held MB.81's pending slug claims, and MB.82 replaced those claims with a confirmed takeover before any service wrote one (`claude-docs/design-decisions/mb.82-slug-takeover.md`). Every row on staging holds null in both. A rollback to a deploy that predates MB.82 would find the columns gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
