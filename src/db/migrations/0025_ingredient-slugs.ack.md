# 0025_ingredient-slugs — destructive DDL

Destructive DDL acknowledged: `ingredients.slug` is added nullable and set `NOT NULL` in the same migration with no SQL backfill between, because no deployed code writes an ingredient yet — staging and production hold no ingredient rows for the step to refuse, and the seed writes every slug it inserts. A rollback to the previous release is unaffected: nothing before this migration inserts into `ingredients` outside the seed.

## Findings this covers

| Rule         | Statement                                                    |
| ------------ | ------------------------------------------------------------ |
| SET NOT NULL | `ALTER TABLE "ingredients" ALTER COLUMN "slug" SET NOT NULL` |

Nothing else in the migration is destructive: it creates `retired_ingredient_slugs`, adds three columns and five indexes, and attaches the `set_updated_at` trigger.

## Why the table is empty wherever this runs against real data

A slug is `ingredientSlug` from `src/lib/slugify.ts` — the label, the form and the formal name — the project's one slug rule. A backfill written in SQL would be a second rule, the thing `tests/guards/slug-rule.test.ts` exists to prevent; a backfill written in TypeScript cannot run between two statements of one `drizzle-kit migrate`. MB.81's task entry settles which applies: if it lands before the compendium holds production rows, the backfill is the seed.

It does. When this migration lands, the only writers of `ingredients` are the seed scenarios (`src/db/seed/standard.ts` and `demo.ts`), and `migrate.yml` runs none of them — it seeds the category, form and astrology vocabularies only. The first deployed writers are M8.2's workspace-ingredient service and M5.2's compendium service, both after this. So on staging and production `ALTER COLUMN … SET NOT NULL` meets an empty table and cannot fail. If it ever did, Postgres refuses the statement, the migration's transaction rolls back, and the deploy stops with the schema unchanged: a blocked release, never lost data.

## What it costs locally

A local database the `standard` or `demo` scenario has already filled holds ingredients with no slug, and this line refuses it (`column "slug" of relation "ingredients" contains null values`). That data is the seed's own and reproducible, so the remedy is a rebuild rather than a backfill: `npm run db:reset` (`make db-reset` from the host), which drops, migrates and reseeds. The test and e2e databases are built fresh from an empty schema on every run, so neither is affected.
