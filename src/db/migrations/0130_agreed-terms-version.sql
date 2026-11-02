-- Hand-written: a data change, which Drizzle cannot express. An account that agreed to the terms dated 2026-11-02, the text version 1
-- seeds from, takes version 1; one that agreed to nothing or to other terms keeps none. `terms_version` stays. Re-running changes nothing.
UPDATE "users" SET "agreed_terms_version" = 1 WHERE "terms_version" = '2026-11-02' AND "agreed_terms_version" IS NULL;
