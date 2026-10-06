-- MB.159, between rule 10's expand (0034) and its drop (MB.160): the list
-- filled again from the single, for whatever the live deploy wrote to it
-- after 0034 — a new row, a changed value, a cleared one. Written with
-- `generate --custom`, which copies the last snapshot, so `element` stays in
-- it although the schema no longer declares it, and MB.160's generate emits
-- its drop (claude-docs/db/identity-model.md, "The ingredient identity model").
--
-- A rederivation rather than a copy where the single is set: this runs before
-- MB.159 promotes, while nothing but 0034 has written a list, so every list
-- is still its single's and a cleared single must clear it. Only a row that
-- disagrees is written, so `set_updated_at` touches no other.
UPDATE "ingredients"
SET "elements" = CASE WHEN "element" IS NULL THEN NULL ELSE ARRAY["element"] END
WHERE "elements" IS DISTINCT FROM CASE WHEN "element" IS NULL THEN NULL ELSE ARRAY["element"] END;
