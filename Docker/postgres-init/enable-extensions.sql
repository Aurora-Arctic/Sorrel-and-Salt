-- Sorrel & Salt — extensions and the app role/database, baked into the image
-- at build time by Docker/Dockerfile.postgres rather than run at a
-- container's first boot. See that file for why it has to happen there.
--
-- pg_trgm backs DESIGN.md §5's fuzzy duplicate warning and the compendium
-- search; unaccent folds that search's accents. They are the two extensions
-- the design names — do not add one speculatively. Migrations 0000 and 0026
-- create both `IF NOT EXISTS`, so a from-scratch database matches this image.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- `app` and the devcontainer connect as `sorrel`. PGDATA is already
-- populated when a container starts, so the entrypoint's first-boot "create
-- POSTGRES_USER/POSTGRES_DB from env" step never runs — creating the role
-- here, at build time, is what makes that connection work at all. Still an
-- empty database: no schema and no seed data, ever.
--
-- `postgres`'s own password is generated and discarded in that same build
-- step, so `sorrel` is the only role a runtime connection can authenticate
-- as. It holds two privileges beyond LOGIN, each for one reason, and is
-- still no superuser:
--
-- - CREATEDB and ownership of `sorrel_template`: Postgres lets only a
--   template's owner (or a superuser) run `CREATE DATABASE ... TEMPLATE`,
--   and that clone is how every Vitest worker and Playwright get their own
--   database (claude-docs/testing.md).
-- - Membership of `pg_signal_backend`: the test harness drops and re-clones
--   those databases `WITH (FORCE)`, which ends every session on them, and
--   one may be an autovacuum worker, which runs as no role. Without the
--   grant `sorrel` may end only its own sessions. The role still cannot end
--   a superuser's. This file builds only the CI and devcontainer image,
--   never Neon (claude-docs/ci/database-image.md).
CREATE ROLE sorrel WITH LOGIN PASSWORD 'sorrel' CREATEDB;
CREATE DATABASE sorrel OWNER sorrel;
ALTER DATABASE sorrel_template OWNER TO sorrel;
-- `DROP DATABASE ... WITH (FORCE)` must also end an autovacuum worker, which
-- runs as no role; without this a drop racing one fails the run (MB.233).
GRANT pg_signal_backend TO sorrel;
\connect sorrel
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
