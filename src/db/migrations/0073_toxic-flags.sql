ALTER TABLE "ingredient_variants" ADD COLUMN "toxic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "toxic" boolean DEFAULT false NOT NULL;