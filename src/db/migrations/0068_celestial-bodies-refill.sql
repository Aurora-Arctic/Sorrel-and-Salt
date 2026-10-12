-- MB.253, between rule 10's expand (0067) and its drop (MB.254): the new
-- celestial body columns filled again from the old, for whatever the deploy
-- before wrote to an old one after 0067 — a new list or link, a changed list,
-- a cleared one. Written with `generate --custom`, which copies the last
-- snapshot, so the old columns stay in it although the schema no longer
-- declares them, and MB.254's generate emits their drop
-- (claude-docs/db/expand-contract.md, "Renaming a table").
--
-- A rederivation rather than a copy where the old column is set, as 0031's:
-- this runs before MB.253 promotes, while nothing but 0067 has written a new
-- column, so every new value is still its old one's and a cleared old one
-- must clear it. Only a row that disagrees is written, so `set_updated_at`
-- touches no other.
--
-- A link only adds: no code changes or clears a link's body, it only writes
-- one when it inserts the link, so an old column left empty says nothing.
UPDATE "ingredients" SET "celestial_bodies" = "planets"
WHERE "celestial_bodies" IS DISTINCT FROM "planets";--> statement-breakpoint
UPDATE "ingredient_variants" SET "celestial_bodies" = "planets"
WHERE "celestial_bodies" IS DISTINCT FROM "planets";--> statement-breakpoint
UPDATE "reference_links" SET "celestial_body_id" = "planet_id"
WHERE "planet_id" IS NOT NULL AND "celestial_body_id" IS DISTINCT FROM "planet_id";
