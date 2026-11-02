-- A card's expiry is now the end of its printed day in the last zone on Earth (UTC-12): the next day at 12:00 UTC. Cards minted before held that day's midnight UTC, so each gains 36 hours.
-- Only cards still live are moved; an expired card stays expired, and an address invitation is untouched.
UPDATE "invitations" SET "expires_at" = "expires_at" + interval '36 hours' WHERE "kind" = 'card' AND "deleted_at" IS NULL AND "expires_at" > now();
