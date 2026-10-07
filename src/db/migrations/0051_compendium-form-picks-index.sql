-- M5.6a: the pick read backwards, for a form's delete and rename, which read
-- the live compendium entries picking it (claude-docs/design-decisions/mb.167-read-and-write-the-pick.md).
-- Partial on the compendium's live rows, the only ones either reads. Additive:
-- an index, nothing dropped or narrowed, so no acknowledgement sidecar.
CREATE INDEX "ingredients_compendium_form_id_idx" ON "ingredients" USING btree ("form_id") WHERE "ingredients"."workspace_id" is null and "ingredients"."deleted_at" is null;
