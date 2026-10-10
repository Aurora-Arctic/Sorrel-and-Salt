-- MB.197, the contract half of rule 10: `admin_role_changes` and
-- `workspace_creation_changes` dropped, with their enums, once MB.196 stopped
-- declaring them (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).
-- First 0055's copy runs once more, for any row the deploy before MB.196 wrote
-- after it, skipping by id what that copy already landed.
--
-- The drops are `generate`'s; the sweep before them is added by hand. Made
-- while MB.203's drop of the two old invitation tables was pending, so the
-- drops `generate` also emitted for those are left out, and the tables kept in
-- `0058_snapshot.json`, for MB.203 to generate.
INSERT INTO "user_privilege_changes" ("id", "user_id", "privilege", "change", "via", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "id", "user_id", 'admin'::"user_privilege",
	(CASE "change" WHEN 'revoke' THEN 'revoke' ELSE 'grant' END)::"user_privilege_change",
	(CASE "change" WHEN 'bootstrap' THEN 'bootstrap' ELSE 'admin' END)::"user_privilege_route",
	"note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by"
FROM "admin_role_changes"
UNION ALL
SELECT "id", "user_id", 'create_workspace'::"user_privilege",
	(CASE "change" WHEN 'revoke' THEN 'revoke' ELSE 'grant' END)::"user_privilege_change",
	(CASE "change" WHEN 'invitation' THEN 'invitation' ELSE 'admin' END)::"user_privilege_route",
	NULL, "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by"
FROM "workspace_creation_changes"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
DROP TABLE "admin_role_changes" CASCADE;--> statement-breakpoint
DROP TABLE "workspace_creation_changes" CASCADE;--> statement-breakpoint
DROP TYPE "public"."admin_role_change";--> statement-breakpoint
DROP TYPE "public"."workspace_creation_change";
