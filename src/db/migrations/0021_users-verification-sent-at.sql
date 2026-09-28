-- MB.54: when the last verification mail went out, so a second within the
-- minute can be refused whichever path would send it. Nullable and additive,
-- so no acknowledgement.
ALTER TABLE "users" ADD COLUMN "verification_sent_at" timestamp;