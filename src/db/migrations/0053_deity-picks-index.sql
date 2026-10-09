-- MB.132: the pick read backwards, for a deity's delete and rename, which read
-- the live rows linking it (claude-docs/design-decisions/mb.167-read-and-write-the-pick.md).
-- Partial on live links, the only rows either reads. Additive: an index,
-- nothing dropped or narrowed, so no acknowledgement sidecar.
CREATE INDEX "ingredient_deities_deity_id_idx" ON "ingredient_deities" USING btree ("deity_id") WHERE "ingredient_deities"."deity_id" is not null and "ingredient_deities"."deleted_at" is null;