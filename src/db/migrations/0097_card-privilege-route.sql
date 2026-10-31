-- A card's acceptance is recorded in the privilege ledger as `via: 'card'`, beside `invitation`: an arrival by card
-- is a different thing to count from an arrival by a mailed address. Adding a value is additive; nothing here reads it yet.
ALTER TYPE "public"."user_privilege_route" ADD VALUE 'card';