CREATE TYPE "public"."ingredient_element" AS ENUM('earth', 'air', 'fire', 'water', 'spirit');--> statement-breakpoint
CREATE TYPE "public"."nomenclature_kind" AS ENUM('botanical', 'fungal', 'zoological', 'mineral', 'chemical', 'unknown', 'none');--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"name" text NOT NULL,
	"canonical_name" text,
	"nomenclature" "nomenclature_kind" NOT NULL,
	"form" text,
	"canonical_key" text GENERATED ALWAYS AS (
  lower(coalesce(canonical_name, name)) || coalesce(' :: ' || lower(btrim(form)), '')
) STORED NOT NULL,
	"description" text,
	"element" "ingredient_element",
	"planet" text,
	"zodiac" text,
	"deities" text[],
	"color" text,
	"safety_notes" text,
	"substitutes" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "ingredients_nomenclature_declares_canonical_name" CHECK ((nomenclature in ('none', 'unknown')) = (canonical_name is null)),
	CONSTRAINT "ingredients_canonical_name_not_blank" CHECK (canonical_name is null or btrim(canonical_name) <> ''),
	CONSTRAINT "ingredients_form_not_blank" CHECK (form is null or btrim(form) <> '')
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;