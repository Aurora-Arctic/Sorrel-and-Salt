-- `canonical_key` goes before `form`: it is generated from `form`, and
-- Postgres refuses to drop a column a generated column reads. drizzle-kit
-- emits `form` first, which fails.
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_not_blank";--> statement-breakpoint
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_id_has_form";--> statement-breakpoint
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_form_id_ingredient_forms_id_fk";
--> statement-breakpoint
DROP INDEX "ingredients_compendium_identity_unique";--> statement-breakpoint
DROP INDEX "ingredients_workspace_identity_unique";--> statement-breakpoint
DROP INDEX "ingredients_compendium_form_id_idx";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "canonical_key";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "form";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "form_id";