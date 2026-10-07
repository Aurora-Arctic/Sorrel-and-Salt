import { admin } from 'better-auth/plugins';

// MB.53: an admin signs in as a specific user, outside production, through
// Better Auth's `admin` plugin with every endpoint but its two impersonation
// ones removed. See claude-docs/auth/impersonation.md, "Impersonation".

/** The plugin's endpoints this app mounts, and the only ones. */
export const IMPERSONATION_PATHS = [
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
] as const;

/**
 * Both conditions, defaulting to off: the flag set, and a deploy target that is
 * not production. `VERCEL_ENV` rather than `NODE_ENV`, which is `production` in
 * every Vercel build, staging and the hotfix previews included.
 */
export function impersonationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENABLE_IMPERSONATION === 'true' && env.VERCEL_ENV !== 'production';
}

/**
 * The `admin` plugin narrowed to impersonation. Every other endpoint would
 * write through the adapter, outside `withAudit`: `set-role` would grant admin
 * past M2.9's ledger, and `remove-user` could hard-delete the primary admin.
 * The schema keeps `sessions.impersonatedBy` and declines the three ban columns,
 * since nothing here bans. `allowImpersonatingAdmins` stays at its default, off.
 */
export function impersonation() {
  const plugin = admin();
  const { impersonateUser, stopImpersonating } = plugin.endpoints;
  return {
    ...plugin,
    endpoints: { impersonateUser, stopImpersonating },
    schema: { session: plugin.schema.session },
  };
}
