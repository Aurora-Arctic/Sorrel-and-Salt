ALTER TABLE "ingredients" ADD COLUMN "seed_content_hash" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "curator_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "curator_reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_curator_reviewed_by_users_id_fk" FOREIGN KEY ("curator_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_seed_content_hash_is_sha256" CHECK (seed_content_hash is null or seed_content_hash ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_curator_review_both_or_neither" CHECK ((curator_reviewed_at is null) = (curator_reviewed_by is null));--> statement-breakpoint
-- M14.5: the three columns above are seed and review state, not content. A
-- seed run writing the hash of the file it just checked, or a curator marking
-- an entry reviewed, changes nothing a reader sees, so neither may move
-- `updated_at` or `updated_by`: the compendium's "Updated" marker would
-- otherwise light up on every seed run. Same body as migration 0079, with the
-- three columns joined to the two stamps the comparison already ignores. Same
-- name and signature, so every table's trigger picks it up unchanged, and it
-- drops nothing, so no destructive-DDL acknowledgement is needed.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	ignored text[];
BEGIN
	IF current_setting('app.touch_row', true) IS DISTINCT FROM 'on' THEN
		SELECT ARRAY['updated_at', 'updated_by', 'seed_content_hash', 'curator_reviewed_at', 'curator_reviewed_by']
			|| coalesce(array_agg(attname::text), '{}')
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
