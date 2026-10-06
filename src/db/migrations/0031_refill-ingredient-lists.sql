-- MB.136, between rule 10's expand (0030) and its drop (MB.137): the lists
-- filled again from the singles, for whatever the live deploy wrote to one
-- after 0030 — a new row, a changed value, a cleared one. Written with
-- `generate --custom`, which copies the last snapshot, so the singles stay in
-- it although the schema no longer declares them, and MB.137's generate emits
-- their drop (claude-docs/db/identity-model.md, "The ingredient identity model").
--
-- A rederivation rather than a copy where a single is set: this runs before
-- MB.136 promotes, while nothing but 0030 has written a list, so every list
-- is still its single's and a cleared single must clear it. Only a row that
-- disagrees is written, so `set_updated_at` touches no other.
UPDATE "ingredients"
SET "planets" = CASE WHEN "planet" IS NULL THEN NULL ELSE ARRAY["planet"] END
WHERE "planets" IS DISTINCT FROM CASE WHEN "planet" IS NULL THEN NULL ELSE ARRAY["planet"] END;--> statement-breakpoint
UPDATE "ingredients"
SET "zodiac_signs" = CASE WHEN "zodiac" IS NULL THEN NULL ELSE ARRAY["zodiac"] END
WHERE "zodiac_signs" IS DISTINCT FROM CASE WHEN "zodiac" IS NULL THEN NULL ELSE ARRAY["zodiac"] END;--> statement-breakpoint
UPDATE "ingredients"
SET "colors" = CASE WHEN "color" IS NULL THEN NULL ELSE ARRAY["color"] END
WHERE "colors" IS DISTINCT FROM CASE WHEN "color" IS NULL THEN NULL ELSE ARRAY["color"] END;
