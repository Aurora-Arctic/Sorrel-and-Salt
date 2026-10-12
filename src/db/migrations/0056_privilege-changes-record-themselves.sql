-- MB.195: `users` fills `user_privilege_changes` itself, one row per change
-- to a privilege column, so no service, seed, script or `psql` session can
-- change a privilege and leave no trace
-- (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md). A
-- function and two triggers; only adds.
--
-- The route and the note come from the transaction-local settings
-- `withAudit(session, fn, { via, note })` publishes. A change whose route is
-- empty is refused rather than recorded with a guess, so a writer that forgot
-- to declare fails its own test, and a `psql` fix declares `manual` first. The
-- actor is `app.current_user_id`, or the row's own `updated_by` where nothing
-- published one, as the seed and a `psql` fix stamp themselves. An empty note
-- is no note.
CREATE OR REPLACE FUNCTION record_privilege_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	declared_route text := nullif(current_setting('app.privilege_route', true), '');
	declared_note text := nullif(current_setting('app.privilege_note', true), '');
	actor uuid := coalesce(nullif(current_setting('app.current_user_id', true), '')::uuid, NEW.updated_by);
	admin_changed boolean;
	creation_changed boolean;
BEGIN
	-- On insert a privilege is changed when it is held, since a new row starts
	-- from holding neither.
	IF TG_OP = 'INSERT' THEN
		admin_changed := NEW.role = 'admin';
		creation_changed := NEW.can_create_workspace;
	ELSE
		admin_changed := NEW.role IS DISTINCT FROM OLD.role;
		creation_changed := NEW.can_create_workspace IS DISTINCT FROM OLD.can_create_workspace;
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
-- Two triggers over the one function, since an insert trigger's WHEN may not
-- name OLD. Each WHEN keeps every other write off the function's path, Better
-- Auth's sign-up, profile and verification writes among them, so only a write
-- that changes a privilege is asked for a route. AFTER, so the ledger's
-- foreign key finds the row; a third privilege is a column in each.
CREATE OR REPLACE TRIGGER record_privilege_change_on_insert AFTER INSERT ON "users" FOR EACH ROW WHEN (NEW.role = 'admin' OR NEW.can_create_workspace) EXECUTE FUNCTION record_privilege_change();--> statement-breakpoint
CREATE OR REPLACE TRIGGER record_privilege_change_on_update AFTER UPDATE OF "role", "can_create_workspace" ON "users" FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.can_create_workspace IS DISTINCT FROM NEW.can_create_workspace) EXECUTE FUNCTION record_privilege_change();
