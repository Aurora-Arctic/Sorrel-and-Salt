-- The address a change of address was asked for, held until its link is followed, replaced or lapses. Nullable and not unique:
-- it holds no address from anyone, and the unique index on email decides at verification.
ALTER TABLE "users" ADD COLUMN "pending_email" text;
