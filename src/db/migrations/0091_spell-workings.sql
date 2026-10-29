CREATE TYPE "public"."working_status" AS ENUM('draft', 'complete');--> statement-breakpoint
CREATE TABLE "spell_working_deductions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"working_id" uuid NOT NULL,
	"spell_step_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" "inventory_unit" NOT NULL,
	"shortfall" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spell_working_participants" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"working_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "spell_working_participants_one_identity" CHECK (num_nonnulls("spell_working_participants"."user_id", "spell_working_participants"."name") = 1),
	CONSTRAINT "spell_working_participants_name_not_blank" CHECK ("spell_working_participants"."name" is null or btrim("spell_working_participants"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "spell_workings" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"spell_id" uuid NOT NULL,
	"status" "working_status" DEFAULT 'draft' NOT NULL,
	"worked_on" date NOT NULL,
	"completed_at" timestamp with time zone,
	"note" text,
	"visibility" "spell_visibility" DEFAULT 'workspace' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "spell_workings_note_not_blank" CHECK ("spell_workings"."note" is null or btrim("spell_workings"."note") <> ''),
	CONSTRAINT "spell_workings_completed_at_with_status" CHECK (("spell_workings"."status" = 'complete') = ("spell_workings"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "spell_working_deductions" ADD CONSTRAINT "spell_working_deductions_working_id_spell_workings_id_fk" FOREIGN KEY ("working_id") REFERENCES "public"."spell_workings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_deductions" ADD CONSTRAINT "spell_working_deductions_spell_step_id_spell_steps_id_fk" FOREIGN KEY ("spell_step_id") REFERENCES "public"."spell_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_deductions" ADD CONSTRAINT "spell_working_deductions_inventory_item_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_deductions" ADD CONSTRAINT "spell_working_deductions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_deductions" ADD CONSTRAINT "spell_working_deductions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_participants" ADD CONSTRAINT "spell_working_participants_working_id_spell_workings_id_fk" FOREIGN KEY ("working_id") REFERENCES "public"."spell_workings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_participants" ADD CONSTRAINT "spell_working_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_participants" ADD CONSTRAINT "spell_working_participants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_working_participants" ADD CONSTRAINT "spell_working_participants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_workings" ADD CONSTRAINT "spell_workings_spell_id_spells_id_fk" FOREIGN KEY ("spell_id") REFERENCES "public"."spells"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_workings" ADD CONSTRAINT "spell_workings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_workings" ADD CONSTRAINT "spell_workings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spell_workings" ADD CONSTRAINT "spell_workings_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spell_working_deductions_working_id_idx" ON "spell_working_deductions" USING btree ("working_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spell_working_participants_working_id_user_id_unique" ON "spell_working_participants" USING btree ("working_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spell_working_participants_working_id_name_unique" ON "spell_working_participants" USING btree ("working_id",lower("name"));--> statement-breakpoint
CREATE INDEX "spell_workings_spell_id_worked_on_idx" ON "spell_workings" USING btree ("spell_id","worked_on" desc) WHERE "spell_workings"."deleted_at" is null;
--> statement-breakpoint
-- Rule 3: each new audited table attaches its own `set_updated_at` trigger, since
-- `sorrel` may not create the event trigger that would (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spell_workings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spell_working_participants" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "spell_working_deductions" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
