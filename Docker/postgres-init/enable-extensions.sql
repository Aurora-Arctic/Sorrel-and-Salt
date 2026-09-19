-- Sorrel & Salt — extensions and the app role/database, baked into the image
-- at build time by Docker/Dockerfile.postgres rather than run at a
-- container's first boot. See that file for why it has to happen there.
--
-- pg_trgm backs DESIGN.md §5's fuzzy duplicate warning. No other extension is
-- named anywhere in the design — do not add one speculatively.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- `app` and the devcontainer connect as `sorrel`. PGDATA is already
-- populated when a container starts, so the entrypoint's first-boot "create
-- POSTGRES_USER/POSTGRES_DB from env" step never runs — creating the role
-- here, at build time, is what makes that connection work at all. Still an
-- empty database: no schema and no seed data, ever.
--
-- `postgres`'s own password is generated and discarded in that same build
-- step, so `sorrel` is the only role a runtime connection can authenticate
-- as. It needs CREATEDB and ownership of `sorrel_template` for one reason:
-- Postgres lets only a template's owner (or a superuser) run
-- `CREATE DATABASE ... TEMPLATE`, and that clone is how every Vitest worker
-- and Playwright get their own database (claude-docs/testing.md).
CREATE ROLE sorrel WITH LOGIN PASSWORD 'sorrel' CREATEDB;
CREATE DATABASE sorrel OWNER sorrel;
ALTER DATABASE sorrel_template OWNER TO sorrel;
\connect sorrel
CREATE EXTENSION IF NOT EXISTS pg_trgm;
