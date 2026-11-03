ALTER TABLE "users" ADD COLUMN "agreed_disclaimer_version" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agreed_ethics_version" integer;--> statement-breakpoint
-- Hand-written: a data change, which Drizzle cannot express. An account that agreed to the terms in force agreed to the disclaimer
-- and the code of ethics as they stood then, since the terms include both: each takes the number of its document's newest live
-- published version published by the moment it agreed, or stays null when there was none. Every other account keeps null.
UPDATE "users" AS "u" SET
  "agreed_disclaimer_version" = (
    SELECT max("v"."number") FROM "document_versions" "v" JOIN "documents" "d" ON "d"."id" = "v"."document_id"
    WHERE "d"."key" = 'disclaimer' AND "d"."deleted_at" IS NULL AND "v"."deleted_at" IS NULL
      AND "v"."status" = 'published' AND "v"."published_at" <= "u"."terms_accepted_at"),
  "agreed_ethics_version" = (
    SELECT max("v"."number") FROM "document_versions" "v" JOIN "documents" "d" ON "d"."id" = "v"."document_id"
    WHERE "d"."key" = 'code-of-ethics' AND "d"."deleted_at" IS NULL AND "v"."deleted_at" IS NULL
      AND "v"."status" = 'published' AND "v"."published_at" <= "u"."terms_accepted_at")
WHERE "u"."agreed_disclaimer_version" IS NULL AND "u"."agreed_ethics_version" IS NULL
  AND "u"."agreed_terms_version" = (
    SELECT max("v"."number") FROM "document_versions" "v" JOIN "documents" "d" ON "d"."id" = "v"."document_id"
    WHERE "d"."key" = 'terms' AND "d"."deleted_at" IS NULL AND "v"."deleted_at" IS NULL AND "v"."status" = 'published');
