# 0072_fluid-ounces — destructive DDL

Destructive DDL acknowledged: this renames the stored volume unit `fl_oz` to `fl_oz_uk` and adds `fl_oz_us` beside it (M11.17), because the two fluid ounces differ by about four per cent and the converter may not guess which one a row means. A rename in place keeps every stored row: a row that held `fl_oz` now holds `fl_oz_uk`, and no value is lost or rewritten. The CHECK `inventory_items_unit_matches_dimension` is dropped and added again in the same transaction, so no write meets the table without it, and the new one names both units where the old one named `fl_oz`.

## Findings this covers

| Rule                     | Statement                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| DROP (any object)        | `ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_unit_matches_dimension"` |
| RENAME (column or table) | `ALTER TYPE "public"."inventory_unit" RENAME VALUE 'fl_oz' TO 'fl_oz_uk'`                |

## Why it is a rename and not an expand

An enum value cannot be kept under two names, and `ADD VALUE` then a data update would leave `fl_oz` in the enum for good, since Postgres cannot remove a value. Renaming is the one way to leave `fl_oz` in neither the enum nor the CHECK, which M11.17's acceptance criteria require.

## What is lost

For the length of the rollout, and after a rollback, the deploy before this one still offers `fl_oz` in its unit list. Saving a row with it fails, because the database no longer has that value; every other unit is untouched, and a row already saved as `fl_oz` reads back as `fl_oz_uk`. The owner chose to keep both fluid ounces on 2026-10-13, at the Wave 11 review.
