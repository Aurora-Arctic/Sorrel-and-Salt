-- Sorrel & Salt — extensions and the app role/database baked into the image
-- at build time.
--
-- Docker/Dockerfile.postgres runs this via docker-entrypoint-initdb.d during
-- the image *build* (not a container's first boot — see that file's
-- comment), so it lands inside the image layer rather than a volume.
--
-- pg_trgm backs the fuzzy duplicate warning in DESIGN.md §5
-- (`CREATE INDEX ... USING gin (name gin_trgm_ops)`). No other extension is
-- named anywhere in the design — do not add one speculatively.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- `app`/`devcontainer` connect as `sorrel` (Docker/docker-compose.yaml's
-- DATABASE_URL) — but PGDATA is already populated by the time a container
-- starts, so the entrypoint's normal first-boot "create POSTGRES_USER/
-- POSTGRES_DB from env" step never runs for it. Creating the role/database
-- here, at build time, is what makes that connection work at all. This is
-- still just an empty database: no schema and no seed data until M1.27
-- bakes those into this same image.
CREATE ROLE sorrel WITH LOGIN PASSWORD 'sorrel';
CREATE DATABASE sorrel OWNER sorrel;
\connect sorrel
CREATE EXTENSION IF NOT EXISTS pg_trgm;
