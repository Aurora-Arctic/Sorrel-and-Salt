CREATE TABLE "spell_categories" (
	"spell_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "spell_categories_spell_id_category_id_pk" PRIMARY KEY("spell_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "spell_categories" ADD CONSTRAINT "spell_categories_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_categories" ADD CONSTRAINT "spell_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_categories" ADD CONSTRAINT "spell_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_categories" ADD CONSTRAINT "spell_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spell_categories_category_id_idx" ON "spell_categories" USING btree ("category_id","spell_id");