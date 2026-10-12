-- MB.203, the contract half of rule 10: `workspace_invitations` and
-- `admin_invitations` dropped, once MB.202 stopped declaring them
-- (claude-docs/design-decisions/mb.201-two-tier-invitations.md). First 0057's
-- copy runs once more, for any row the deploy before MB.202 wrote after it,
-- skipping by id what that copy already landed. `workspace_role` stays:
-- `workspace_members` and `invitations` hold it.
--
-- The drops are `generate`'s; the sweep before them is added by hand.
INSERT INTO "invitations" ("id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", NULL::text, "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "workspace_invitations"
UNION ALL
SELECT "id", NULL::uuid, "email", NULL::"workspace_role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "admin_invitations"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
DROP TABLE "workspace_invitations" CASCADE;--> statement-breakpoint
DROP TABLE "admin_invitations" CASCADE;
