-- The address a completed change of address left, held until the notice to it is sent or every attempt at it failed. Nullable
-- and not unique: the address is free for another account the moment the change completes.
ALTER TABLE "users" ADD COLUMN "former_email" text;
