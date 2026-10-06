-- MB.137, the contract half of rule 10 over MB.134's lists: the singles
-- MB.136 stopped declaring, dropped. No last fill: the deploy this meets
-- writes the lists, so a single that disagrees with its list may be either's
-- newer write, and a fill would overwrite a member's edit. `substitutes`
-- stays, MB.141's to drop, and in the snapshot with it
-- (claude-docs/db/identity-model.md, "The ingredient identity model").
ALTER TABLE "ingredients" DROP COLUMN "planet";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "zodiac";--> statement-breakpoint
ALTER TABLE "ingredients" DROP COLUMN "color";