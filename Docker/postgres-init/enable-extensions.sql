-- Sorrel & Salt — extensions baked into `sorrel_template` at image build time.
--
-- Docker/Dockerfile.postgres runs this via docker-entrypoint-initdb.d during
-- the image *build* (not a container's first boot — see that file's
-- comment), so it lands inside the image layer rather than a volume.
--
-- pg_trgm backs the fuzzy duplicate warning in DESIGN.md §5
-- (`CREATE INDEX ... USING gin (name gin_trgm_ops)`). No other extension is
-- named anywhere in the design — do not add one speculatively.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
