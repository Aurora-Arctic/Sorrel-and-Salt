# 0069_drop-planet-columns — destructive DDL

Destructive DDL acknowledged: this is the contract step of renaming `planets` to `celestial_bodies` (MB.254). MB.252 renamed the table behind a `planets` view and added the new columns, and MB.253 moved every reader and writer onto `ingredients.celestial_bodies`, `ingredient_variants.celestial_bodies` and `reference_links.celestial_body_id`, so no deploy that meets this migration reads or writes the old columns or the view. The one-row CHECK is dropped and re-added in the same transaction, counting `celestial_body_id` alone.

## Findings this covers

| Rule              | Statement                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row"`                          |
| DROP (any object) | `ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_planet_id_celestial_bodies_id_fk"` |
| DROP (any object) | `DROP INDEX "reference_links_planet_unique"`                                                       |
| DROP (any object) | `ALTER TABLE "ingredient_variants" DROP COLUMN "planets"`                                          |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "planets"`                                                  |
| DROP (any object) | `ALTER TABLE "reference_links" DROP COLUMN "planet_id"`                                            |
| DROP (any object) | `DROP VIEW "planets"`                                                                              |

`DROP VIEW` is written by hand: Drizzle does not track the view, so `generate` never emits it.

## Why no deploy breaks

`migrate.yml` runs before `deploy.yml` promotes, so the risk in a drop is the deploy still serving while the migration runs. This task merges into `staging` only after a release carrying MB.253 has reached production (its task entry, and `claude-docs/db/expand-contract.md`), so on staging and on production that deploy is MB.253's or later. MB.253 removed the three columns from the Drizzle schema, which names every declared column in a `SELECT`, and no file under `src/` outside migrations names the old columns or the view. The tests named the five old objects in `PENDING_DROPS` until now, and that list is empty here.

The re-added CHECK admits every link MB.253's code writes, since that code names a body by `celestial_body_id` alone. A link the deploy before MB.253 wrote by `planet_id` alone is filled first, so the CHECK holds over every row when it is added.

## What is lost

Nothing a reader still sees. Before the drops the migration copies `planet_id` into `celestial_body_id` on every link, live or removed, that holds the first alone. One such live link can repeat a live link MB.253 wrote for the same body and reference, and copying it would break `reference_links_celestial_body_unique`; it is removed instead, as the app removes a link, and the reference stays linked by the other. Its locator, if it had one, stays on the removed row.

The two list columns are not copied, as `0036` gave MB.137's single columns no last copy: MB.253 edits the new lists and stores a cleared one as NULL, so an old list beside a NULL new one may be a member's clear, and copying it would undo the clear. Anything the deploy before MB.253 wrote to an old list after `0068`'s refill is dropped with it.
