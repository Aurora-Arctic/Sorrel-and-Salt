DROP INDEX "ingredients_compendium_pending_slug_unique";--> statement-breakpoint
DROP INDEX "ingredients_workspace_pending_slug_unique";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "pending_slug";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "pending_slug_effective_at";