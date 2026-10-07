-- MB.62: `admin_role_change_pauses`, the primary admin's switch on admin
-- grants and revokes, one row per pause; an open pause has no `ended_at`
-- (claude-docs/design-decisions/mb.62-pause-ledger.md). Additive, and it
-- writes no row: nothing is paused until someone pauses.
CREATE TABLE "admin_role_change_pauses" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"ended_at" timestamp,
	"ended_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "admin_role_change_pauses_ended_together" CHECK (("admin_role_change_pauses"."ended_at" is null) = ("admin_role_change_pauses"."ended_by" is null))
);
--> statement-breakpoint
ALTER TABLE "admin_role_change_pauses" ADD CONSTRAINT "admin_role_change_pauses_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_change_pauses" ADD CONSTRAINT "admin_role_change_pauses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_change_pauses" ADD CONSTRAINT "admin_role_change_pauses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_change_pauses" ADD CONSTRAINT "admin_role_change_pauses_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_role_change_pauses_one_open" ON "admin_role_change_pauses" USING btree ((true)) WHERE "admin_role_change_pauses"."ended_at" is null and "admin_role_change_pauses"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "admin_role_change_pauses" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
