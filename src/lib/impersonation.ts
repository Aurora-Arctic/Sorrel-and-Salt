import { admin } from 'better-auth/plugins';

// A keeper signs in as a specific user, outside production, through
// Better Auth's `admin` plugin with every endpoint but its two impersonation
// ones removed. See claude-docs/auth/impersonation.md, "Impersonation".

export const IMPERSONATION_PATHS = [
  '/admin/impersonate-user',
  '/admin/stop-impersonating',
] as const;

/** `VERCEL_ENV` rather than `NODE_ENV`, which is `production` in every Vercel build, staging and the hotfix previews included. */
export function impersonationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENABLE_IMPERSONATION === 'true' && env.VERCEL_ENV !== 'production';
}

/**
 * The `admin` plugin narrowed to impersonation: every other endpoint would write through the adapter outside `withAudit` (`set-role` past the privilege
 * ledger, `remove-user` hard-deleting the primary keeper). The schema keeps `sessions.impersonatedBy` and no ban columns; `allowImpersonatingAdmins` stays off.
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
