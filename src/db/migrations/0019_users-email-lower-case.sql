-- MB.60: the primary admin is the live row matching ADMIN_BOOTSTRAP_EMAIL
-- case-insensitively, and `users_email_unique` is on the raw column, so two
-- rows differing only by case would both match. Better Auth lowercases every
-- email it writes; this holds a row written by hand to the same.
--
-- Additive, so no acknowledgement. It validates the existing rows as it is
-- added, and every one of them came through Better Auth or the seed, both of
-- which write lower case.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lower_case" CHECK ("users"."email" = lower("users"."email"));