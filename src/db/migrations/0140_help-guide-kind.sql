-- A guide becomes a kind of its own. The step that makes each top-level article holding sub pages a guide is the help
-- seed's (src/db/seed/help.ts), not this file's: the migrator runs every pending file in one transaction, and Postgres
-- refuses a new enum value inside the transaction that adds it.
ALTER TYPE "public"."help_article_kind" ADD VALUE 'guide' BEFORE 'term';
