-- A support time-out may have no end date (`until` null), and every time-out
-- carries a note. The fill runs first so that NOT NULL and the CHECK validate:
-- a time-out set before the note was required gets a placeholder sentence,
-- the soft-deleted ones included, since NOT NULL binds every row.
UPDATE "support_timeouts" SET "note" = 'No note was recorded when this time-out was set.'
WHERE "note" IS NULL OR btrim("note") = '';--> statement-breakpoint
ALTER TABLE "support_timeouts" ALTER COLUMN "until" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "support_timeouts" ALTER COLUMN "note" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "support_timeouts" ADD CONSTRAINT "support_timeouts_note_not_blank" CHECK (btrim("support_timeouts"."note") <> '');
