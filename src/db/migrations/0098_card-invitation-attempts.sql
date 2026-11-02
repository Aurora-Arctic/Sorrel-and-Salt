CREATE TABLE "card_invitation_attempts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_attempted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	CONSTRAINT "card_invitation_attempts_reason_known" CHECK ("card_invitation_attempts"."reason" in ('revoked', 'expired', 'accepted')),
	CONSTRAINT "card_invitation_attempts_count_positive" CHECK ("card_invitation_attempts"."attempts" >= 1)
);
--> statement-breakpoint
ALTER TABLE "card_invitation_attempts" ADD CONSTRAINT "card_invitation_attempts_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_invitation_attempts" ADD CONSTRAINT "card_invitation_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_invitation_attempts" ADD CONSTRAINT "card_invitation_attempts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_invitation_attempts" ADD CONSTRAINT "card_invitation_attempts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_invitation_attempts" ADD CONSTRAINT "card_invitation_attempts_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_invitation_attempts_card_user_reason_unique" ON "card_invitation_attempts" USING btree ("invitation_id","user_id","reason") WHERE "card_invitation_attempts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "card_invitation_attempts_invitation_idx" ON "card_invitation_attempts" USING btree ("invitation_id") WHERE "card_invitation_attempts"."deleted_at" is null;--> statement-breakpoint
-- Rule 3: the table attaches its own `set_updated_at` trigger.
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "card_invitation_attempts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
