ALTER TABLE "invitations" ADD COLUMN "batch_note" text;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_batch_note_card_only" CHECK ("invitations"."batch_note" is null or "invitations"."kind" = 'card');--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_batch_note_length" CHECK (char_length("invitations"."batch_note") <= 500);