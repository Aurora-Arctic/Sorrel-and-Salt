CREATE TYPE "public"."name_basis" AS ENUM('stated', 'resolved', 'unresolved', 'unaudited');--> statement-breakpoint
ALTER TABLE "reference_links" ADD COLUMN "name_basis" "name_basis";--> statement-breakpoint
ALTER TABLE "reference_links" ADD COLUMN "supports" text[];--> statement-breakpoint
ALTER TABLE "references" ADD COLUMN "scholarly" boolean DEFAULT false NOT NULL;