# 0064_drop-form-and-canonical-key — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. An ingredient's forms moved to `ingredient_variants` (MB.215), and its identity onto `identity_key`, the formal name alone. MB.220 stopped declaring `canonical_key` and its two unique indexes, and MB.222 stopped declaring `form`, `form_id`, their two CHECKs, the pick's foreign key and its index. That code is what staging serves, so no staging deploy that meets this migration reads or writes any of them.

## Findings this covers

| Rule              | Statement                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_not_blank"`                 |
| DROP (any object) | `ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_id_has_form"`               |
| DROP (any object) | `ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_id_ingredient_forms_id_fk"` |
| DROP (any object) | `DROP INDEX "ingredients_compendium_identity_unique"`                                    |
| DROP (any object) | `DROP INDEX "ingredients_workspace_identity_unique"`                                     |
| DROP (any object) | `DROP INDEX "ingredients_compendium_form_id_idx"`                                        |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "canonical_key"`                                  |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "form"`                                           |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "form_id"`                                        |

`canonical_key` is dropped before `form`, the reverse of the order `drizzle-kit generate` wrote: the column is generated from `form`, and Postgres refuses to drop a column a generated column reads.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. On staging that deploy is MB.222's or later, and none of them declares any of these objects: MB.220 removed `canonical_key` from `src/modules/ingredients/schema/ingredients.ts`, and MB.222 removed `form` and `form_id` with their CHECKs and index. No file under `src/` reads or writes the three columns outside migrations, and no error map names the two old identity indexes: MB.223 took them out of both `refuseCollision` mappers, which since MB.220 had also mapped `identity_key`'s indexes, so the deploy still serving reports an identity collision the same way whichever index refuses it.

Production does not hold the same way, and that is the owner's call rather than an oversight. Its deploy, v0.6.0, predates MB.215's wave and still declares the three columns, so the release that carries this migration drops them under it for the length of the rollout. That window waits on staging alone because production is not live yet: no member is reading or writing there, so it costs nothing (MB.197 and MB.203's ruling; MB.223's task text). Were production live before that release, this task would wait for a release carrying MB.222 first.

## What is lost

Nothing. Every form is in `ingredient_variants` before the drop: `0062` copied each row's form and its curated pick into a variant, a soft-deleted row's included, and MB.219's dual write kept the row's form and its first variant level from then until MB.222 stopped writing the row's. `canonical_key` held no value of its own: it was generated from `name`, `canonical_name` and `form`, and `identity_key` holds the formal-name part from the two columns that stay. A rollback to a deploy that predates MB.222 would find the columns gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
