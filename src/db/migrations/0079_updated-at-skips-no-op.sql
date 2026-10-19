-- MB.106: `set_updated_at()` (0016) leaves a row's stamps alone when an UPDATE
-- changed nothing, so "when was this entry last changed" can be read from
-- `updated_at` (the compendium's New/Updated marker, and later the sitemap's
-- `lastModified`).
--
-- "Changed nothing" compares the whole row except the two stamps the write
-- path always sends (`updated_at` from the application's clock, `updated_by`
-- from the session). Comparing them too would make every save a change, since
-- `withAudit` stamps both on every UPDATE, and a different curator re-saving
-- an entry unchanged would read as an edit. A no-op keeps both stamps: the
-- row's `updated_by` stays the person who last really changed it, so a
-- different user re-saving unchanged does not take the credit. A write that
-- sets a stamp alone (a fixture, a repair) is therefore a no-op too, and says
-- otherwise by publishing `app.touch_row` or changing a real column.
--
-- Generated columns are left out of the comparison too: Postgres computes them
-- after BEFORE triggers run, so `NEW` holds none of them yet and every row with
-- one (an ingredient's `identity_key`) would read as changed on every save.
--
-- The one write that must move `updated_at` with no column changing is
-- touching a parent after its child rows changed (`writeChildren`). It says so
-- by publishing `app.touch_row` as 'on' for its own statement, in the
-- transaction, as `withAudit` publishes the actor.
--
-- Same name and signature as before, so the trigger on every audited table
-- picks the new body up with no change to it. It drops nothing, so it needs no
-- destructive-DDL acknowledgement.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	ignored text[];
BEGIN
	IF current_setting('app.touch_row', true) IS DISTINCT FROM 'on' THEN
		SELECT ARRAY['updated_at', 'updated_by'] || coalesce(array_agg(attname::text), '{}')
		INTO ignored
		FROM pg_attribute
		WHERE attrelid = TG_RELID AND attgenerated <> '' AND NOT attisdropped;
		IF (to_jsonb(NEW) - ignored) = (to_jsonb(OLD) - ignored) THEN
			NEW.updated_at := OLD.updated_at;
			NEW.updated_by := OLD.updated_by;
			RETURN NEW;
		END IF;
	END IF;
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;
