# 0067_celestial-bodies-expand — destructive DDL

Destructive DDL acknowledged: this is the expand step of renaming the `planets` table to `celestial_bodies` (MB.252, after MB.251 renamed what people read). The table is renamed and a view named `planets` over it takes the old name, so the deploy still serving reads and writes the same rows through the view. The renamed indexes, CHECK and foreign keys are names no statement of that deploy relies on but one, the slug index, whose cost is set out below. The one-row CHECK is dropped and re-added in the same transaction, widened to count a body in either of its two link columns.

## Findings this covers

| Rule                     | Statement                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| RENAME (column or table) | `ALTER TABLE "planets" RENAME TO "celestial_bodies"`                                                                                              |
| RENAME (column or table) | `ALTER INDEX "planets_seed_key_unique" RENAME TO "celestial_bodies_seed_key_unique"`                                                              |
| RENAME (column or table) | `ALTER INDEX "planets_slug_unique" RENAME TO "celestial_bodies_slug_unique"`                                                                      |
| RENAME (column or table) | `ALTER INDEX "planets_trgm" RENAME TO "celestial_bodies_trgm"`                                                                                    |
| RENAME (column or table) | `ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_description_not_blank" TO "celestial_bodies_description_not_blank"`                    |
| RENAME (column or table) | `ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_created_by_users_id_fk" TO "celestial_bodies_created_by_users_id_fk"`                  |
| RENAME (column or table) | `ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_updated_by_users_id_fk" TO "celestial_bodies_updated_by_users_id_fk"`                  |
| RENAME (column or table) | `ALTER TABLE "celestial_bodies" RENAME CONSTRAINT "planets_deleted_by_users_id_fk" TO "celestial_bodies_deleted_by_users_id_fk"`                  |
| RENAME (column or table) | `ALTER TABLE "reference_links" RENAME CONSTRAINT "reference_links_planet_id_planets_id_fk" TO "reference_links_planet_id_celestial_bodies_id_fk"` |
| DROP (any object)        | `ALTER TABLE "reference_links" DROP CONSTRAINT "reference_links_one_row"`                                                                         |

## Why no deploy breaks

`migrate.yml` runs before `deploy.yml` promotes, so the deploy before this one meets the renamed table for the length of the rollout, and again after any rollback to it. Every statement it sends names `planets`, and the view serves each of them: a simple view over one table is updatable in Postgres, so its inserts and updates with `RETURNING` and its soft deletes write the table, and the table's `set_updated_at` trigger fires for them. Measured during MB.252's scoping (`claude-docs/design-decisions/mb.252-table-rename.md`): the whole `db` test project passed against this migration with the schema still naming `planets`, but for tests that read the catalogue by the old name, and a connection that had prepared its statements against the table before the rename ran them through the view after it.

No code names a foreign key or the trigram index. The CHECK's name is unchanged, and its new form admits every link the deploy before writes: one naming `planet_id` alone counts once, as before.

## What is lost

Nothing is lost from the data. One message is: the deploy before maps a duplicate slug to a friendly "name taken" error by the index name `planets_slug_unique`, which no longer exists, so for the rollout and after a rollback to that deploy an admin adding a duplicate celestial body sees a generic error instead. The duplicate is still refused, by the same index under its new name. The owner chose this on 2026-10-12 over keeping the old index names until MB.253, which would have cost a two-name mapping in the vocabulary services and a second rename migration.
