CREATE TABLE "ingredient_categories" (
	"ingredient_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "ingredient_categories_ingredient_id_category_id_pk" PRIMARY KEY("ingredient_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD CONSTRAINT "ingredient_categories_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD CONSTRAINT "ingredient_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD CONSTRAINT "ingredient_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_categories" ADD CONSTRAINT "ingredient_categories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_categories_category_id_idx" ON "ingredient_categories" USING btree ("category_id","ingredient_id");