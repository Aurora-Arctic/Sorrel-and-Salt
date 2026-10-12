## The organization plugin is not used (MB.30)

Better Auth ships an organization plugin — organizations, members,
invitations, a last-owner guard, a creation gate — and it is **not
configured here**, deliberately. Workspaces, membership and invitations are
the hand-built `workspaces`, `workspace_members` and
`invitations` tables behind services, written through
`withAudit`, read under the `Membership` proof (DESIGN.md §5, §8). MB.30
ran the plugin against a real database before M4.1 made `workspaces` a
foreign-key target, and found the mismatch structural rather than
configurable:

- its writes bypass `withAudit` and its deletes are hard, so the audit
  spread, soft delete and rule 4's partial unique indexes cannot hold on its
  tables;
- the invitation id is the token — a plaintext primary key returned to every
  member by `getFullOrganization` and `listInvitations` — and acceptance is
  bound to the invited email with no option to relax it;
- five ways a link can be dead collapse into one `INVITATION_NOT_FOUND`, and
  the last-owner refusal carries no remedy, so the service would classify
  both itself anyway;
- it adds `active_organization_id` to `sessions`, writes it on create,
  accept and even a forbidden read, and any endpoint called without an
  explicit `organizationId` falls back to it — the session-held workspace §9
  exists to forbid;
- it mounts ~20 `/api/auth/organization/*` routes carrying workspace data,
  a third access path under rule 1 (`disabledPaths` hides them at the HTTP
  layer only, as an enumerated list).

The record with the code behind each finding is
[`design-decisions/mb.30-organization-plugin.md`](../design-decisions/mb.30-organization-plugin.md).
One byproduct worth knowing: `auth.api.*` does work inside the Vitest `db`
project given a real `sessions` row and an HMAC-signed
`better-auth.session_token` cookie (`<token>.<base64 HMAC-SHA256(secret,
token)>`); the recipe is in the record.
