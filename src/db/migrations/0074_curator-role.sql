-- M11.20: a third site role, `curator`, which curates what an admin curates
-- and reaches no people page (claude-docs/design-decisions/m11.20-curator-role.md).
-- Each of `admin` and `curator` is a privilege of its own in the ledger, so a
-- move between the two records a revoke of one and a grant of the other.
--
-- The CHECK is replaced rather than widened in place: it now names `user`, the
-- one role that may lack the flag, so it never uses `curator`, which Postgres
-- refuses inside the transaction that adds the value. The function names it,
-- but a function body is read when it runs, not here. The sidecar
-- 0074_curator-role.ack.md covers the drop.
ALTER TYPE "public"."user_privilege" ADD VALUE 'curator';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'curator' BEFORE 'admin';--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_admin_can_create_workspace";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_privileged_can_create_workspace" CHECK ("users"."role" = 'user' or "users"."can_create_workspace");--> statement-breakpoint
-- 0056's function with the role split in two: a role privilege changes when
-- holding it does, so `user` to `curator` touches `curator` alone and
-- `curator` to `admin` touches both.
CREATE OR REPLACE FUNCTION record_privilege_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	declared_route text := nullif(current_setting('app.privilege_route', true), '');
	declared_note text := nullif(current_setting('app.privilege_note', true), '');
	actor uuid := coalesce(nullif(current_setting('app.current_user_id', true), '')::uuid, NEW.updated_by);
	admin_changed boolean;
	curator_changed boolean;
	creation_changed boolean;
BEGIN
	-- On insert a privilege is changed when it is held, since a new row starts
	-- from holding none.
	IF TG_OP = 'INSERT' THEN
		admin_changed := NEW.role = 'admin';
		curator_changed := NEW.role = 'curator';
		creation_changed := NEW.can_create_workspace;
	ELSE
		admin_changed := (NEW.role = 'admin') IS DISTINCT FROM (OLD.role = 'admin');
		curator_changed := (NEW.role = 'curator') IS DISTINCT FROM (OLD.role = 'curator');
		creation_changed := NEW.can_create_workspace IS DISTINCT FROM OLD.can_create_workspace;
	END IF;

	IF NOT (admin_changed OR curator_changed OR creation_changed) THEN
		RETURN NULL;
	END IF;

	IF declared_route IS NULL THEN
		RAISE EXCEPTION 'a privilege change must declare its route'
			USING HINT = 'withAudit takes { via }; a psql fix runs select set_config(''app.privilege_route'', ''manual'', true) in its transaction first';
	END IF;

	IF admin_changed THEN
		INSERT INTO user_privilege_changes (user_id, privilege, change, via, note, created_by, updated_by)
		VALUES (
			NEW.id,
			'admin',
			(CASE WHEN NEW.role = 'admin' THEN 'grant' ELSE 'revoke' END)::user_privilege_change,
			declared_route::user_privilege_route,
			declared_note,
			actor,
			actor
		);
	END IF;

	IF curator_changed THEN
		INSERT INTO user_privilege_changes (user_id, privilege, change, via, note, created_by, updated_by)
		VALUES (
			NEW.id,
			'curator',
			(CASE WHEN NEW.role = 'curator' THEN 'grant' ELSE 'revoke' END)::user_privilege_change,
			declared_route::user_privilege_route,
			declared_note,
			actor,
			actor
		);
	END IF;

	IF creation_changed THEN
		INSERT INTO user_privilege_changes (user_id, privilege, change, via, note, created_by, updated_by)
		VALUES (
			NEW.id,
			'create_workspace',
			(CASE WHEN NEW.can_create_workspace THEN 'grant' ELSE 'revoke' END)::user_privilege_change,
			declared_route::user_privilege_route,
			declared_note,
			actor,
			actor
		);
	END IF;

	RETURN NULL;
END;
$$;
--> statement-breakpoint
-- The insert trigger's WHEN names `user`, as the CHECK does, rather than the
-- new value; the update trigger already fires on any change to `role`.
CREATE OR REPLACE TRIGGER record_privilege_change_on_insert AFTER INSERT ON "users" FOR EACH ROW WHEN (NEW.role <> 'user' OR NEW.can_create_workspace) EXECUTE FUNCTION record_privilege_change();
