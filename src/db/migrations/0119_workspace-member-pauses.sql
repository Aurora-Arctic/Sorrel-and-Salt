CREATE TABLE "workspace_member_pauses" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"until" timestamp,
	"note" text,
	"lifted_at" timestamp,
	"lifted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "workspace_member_pauses_lifted_together" CHECK (("workspace_member_pauses"."lifted_at" is null) = ("workspace_member_pauses"."lifted_by" is null))
);
--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_lifted_by_users_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_pauses" ADD CONSTRAINT "workspace_member_pauses_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_pauses_one_live" ON "workspace_member_pauses" USING btree ("workspace_id","user_id") WHERE "workspace_member_pauses"."lifted_at" is null and "workspace_member_pauses"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: each table attaches its own `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "workspace_member_pauses" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
