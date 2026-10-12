-- MB.214: the blank-description CHECK the six other vocabularies carry, on
-- the two that never had it. Additive: the seed writes no blank description
-- and the admin input refuses one, so no live row fails it.
ALTER TABLE "categories" ADD CONSTRAINT "categories_description_not_blank" CHECK (btrim(description) <> '');--> statement-breakpoint
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_description_not_blank" CHECK (btrim(description) <> '');