# MB.252 — A renamed table leaves a view under its old name

**Status:** decided · **Date:** 2026-10-12 (scoped in the task; the index names were the owner's call)

**Decided:** `planets` is renamed `celestial_bodies` in one migration, `0067_celestial-bodies-expand`. A view named `planets` over the new table serves the deploy that is still running. The table's indexes, its CHECK and its foreign keys take the new name in the same migration. The scoping plan is [`mb.252-plan.md`](mb.252-plan.md), and the pattern for the next table rename is in [`db/expand-contract.md`](../db/expand-contract.md), "Renaming a table".

## The question the task asked first

This is the first table rename in the repo. Rule 10 needs every migration to work under both the new code and the code before it. `migrate.yml` runs before `deploy.yml` promotes, so the code before always meets the renamed table: for the minutes the rollout takes, and again after any rollback. The task's entry asked whether a view under the old name serves every statement that code sends.

## What was measured

- **The whole `db` test project, against the migration, with the code unchanged.** The migration was applied and the Drizzle schema still named `planets`, so every statement went through the view. 1240 tests passed and 10 failed. Seven of the failures were the catalogue tests the entry predicted. The other three reached the database by the old table's name: two read the catalogue or `ctid` through the view, and one looked for an index under its old name. Every service, GraphQL resolver, seed, reference link, trigram search and in-use count passed.
- **Statements prepared before the rename.** postgres.js prepares statements by default, so a running deploy holds prepared statements that name the old table. A scratch script prepared a `SELECT`, an `INSERT … RETURNING` and an `UPDATE … RETURNING` against the table, renamed it, created the view, and ran them again. All three worked, and so did a soft delete. Postgres looks the name up again when it re-plans a statement, and the result columns are unchanged.
- **What the code sends.** Nothing that touches `planets` uses `ON CONFLICT`, `FOR UPDATE` or `TRUNCATE`. The seed only inserts rows it is missing.

So the answer is yes. Postgres can write through a view over one table, and the table keeps its `set_updated_at` trigger through the rename, so writes through the view are stamped as before.

## The index names move now, not in MB.253

The entry first kept the four index and CHECK names (`planets_seed_key_unique`, `planets_slug_unique`, `planets_trgm`, `planets_description_not_blank`) until MB.253. The reason: the vocabulary service turns a unique violation on `planets_slug_unique` into a friendly "name taken" error, and the code before MB.252 knows only that name.

Keeping them would have cost:

- `slugIndex` accepting two names, a type change in the shared vocabulary services
- `vocabularies.test.ts` reading one table under a different name prefix
- a second rename migration and sidecar in MB.253, and the work to undo the two-name mapping

Renaming now costs one message. During the rollout, and after a rollback to the earlier deploy, an admin adding a duplicate celestial body sees a generic error instead of "name taken". The duplicate is still refused, by the same index under its new name, and the screen is admin-only. The owner chose to rename now.

## What it leaves for MB.253 and MB.254

- **MB.253** moves the code and GraphQL names and every reader and writer onto `celestial_bodies`, `ingredients.celestial_bodies`, `ingredient_variants.celestial_bodies` and `reference_links.celestial_body_id`, refilling them for what the deploy before wrote in between.
- **MB.254** drops the old columns and the `planets` view, and counts `celestial_body_id` alone in `reference_links_one_row`.
- **Until MB.254, the view locks the table's columns.** Postgres refuses `DROP COLUMN` and `ALTER COLUMN TYPE` on any column a view reads.
