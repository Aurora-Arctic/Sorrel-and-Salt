-- pg_trgm backs the fuzzy duplicate-name warning in DESIGN.md §5
-- (`CREATE INDEX ... USING gin (name gin_trgm_ops)`). No other extension is
-- named anywhere in the design — do not add one speculatively.
--
-- IF NOT EXISTS makes this migration idempotent even outside the journal's
-- own once-only bookkeeping: `sorrel_template`/`sorrel` (Docker/postgres-init)
-- already have it from the image build, so applying this migration against
-- either is a no-op rather than an error.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
