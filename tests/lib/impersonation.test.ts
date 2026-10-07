import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthTables } from 'better-auth/db';
import { IMPERSONATION_PATHS, impersonationEnabled } from '@/lib/impersonation';

// MB.53: Better Auth's `admin` plugin is registered for impersonation alone,
// and only where both conditions hold — the flag set, and a deploy target that
// is not production. Elsewhere it is never constructed, so its endpoints are
// absent rather than refusing (claude-docs/auth/impersonation.md).

const ORIGIN = 'http://localhost:8000';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('impersonationEnabled', () => {
  it.each([
    { flag: 'true', target: undefined, enabled: true },
    { flag: 'true', target: 'preview', enabled: true },
    { flag: 'true', target: 'development', enabled: true },
    { flag: 'true', target: 'production', enabled: false },
    { flag: undefined, target: undefined, enabled: false },
    { flag: undefined, target: 'preview', enabled: false },
    { flag: '', target: 'preview', enabled: false },
    { flag: 'false', target: 'preview', enabled: false },
  ])('flag $flag at VERCEL_ENV=$target is $enabled', ({ flag, target, enabled }) => {
    expect(impersonationEnabled({ ENABLE_IMPERSONATION: flag, VERCEL_ENV: target })).toBe(enabled);
  });
});

async function authUnder(flag: string, target: string) {
  vi.stubEnv('ENABLE_IMPERSONATION', flag);
  vi.stubEnv('VERCEL_ENV', target);
  vi.resetModules();
  return (await import('@/lib/auth')).auth;
}

/** Every `/admin/*` path the instance mounts, whichever plugin brought it. */
function mountedAdminPaths(auth: Awaited<ReturnType<typeof authUnder>>): string[] {
  return Object.values(auth.api as Record<string, { path?: string }>)
    .map((endpoint) => endpoint.path)
    .filter((path): path is string => typeof path === 'string' && path.startsWith('/admin/'))
    .sort();
}

/** What the handler answers for a bare POST to `path`, signed out. */
async function statusOf(auth: Awaited<ReturnType<typeof authUnder>>, path: string) {
  const response = await auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-00000000000b' }),
    }),
  );
  return response.status;
}

describe('registration', () => {
  it.each([
    { target: '', label: 'locally' },
    { target: 'preview', label: 'on a preview' },
  ])(
    'mounts exactly the two impersonation endpoints $label with the flag set',
    async ({ target }) => {
      const auth = await authUnder('true', target);

      // The allowlist, compared by name: an endpoint a Better Auth upgrade adds
      // fails here rather than going through unnoticed.
      expect(mountedAdminPaths(auth)).toEqual([...IMPERSONATION_PATHS].sort());
      // Answers, refusing a signed-out caller, rather than 404ing.
      expect(await statusOf(auth, '/admin/impersonate-user')).toBe(401);
    },
  );

  it.each([
    { flag: 'true', target: 'production', label: 'at production with the flag set' },
    { flag: '', target: '', label: 'locally without the flag' },
    { flag: '', target: 'preview', label: 'on a preview without the flag' },
    { flag: '', target: 'production', label: 'at production without the flag' },
  ])('mounts nothing under /admin $label: the endpoints are absent', async ({ flag, target }) => {
    const auth = await authUnder(flag, target);

    expect(auth.options.plugins?.map(({ id }) => id)).not.toContain('admin');
    expect(mountedAdminPaths(auth)).toEqual([]);
    for (const path of IMPERSONATION_PATHS) {
      expect(await statusOf(auth, path)).toBe(404);
    }
  });

  it('leaves set-role, remove-user and the ban endpoints unmounted where impersonation is on', async () => {
    const auth = await authUnder('true', 'preview');

    // set-role would grant admin outside withAudit and M2.9's ledger.
    for (const path of [
      '/admin/set-role',
      '/admin/remove-user',
      '/admin/ban-user',
      '/admin/unban-user',
      '/admin/create-user',
      '/admin/update-user',
      '/admin/list-users',
    ]) {
      expect(await statusOf(auth, path), path).toBe(404);
    }
  });

  it('adds sessions.impersonatedBy and declines the three ban columns', async () => {
    const auth = await authUnder('true', 'preview');
    const tables = getAuthTables(auth.options);

    expect(Object.keys(tables.session.fields)).toContain('impersonatedBy');
    for (const field of ['banned', 'banReason', 'banExpires']) {
      expect(Object.keys(tables.user.fields)).not.toContain(field);
    }
  });

  it('keeps impersonating another admin off', async () => {
    const auth = await authUnder('true', 'preview');
    const plugin = auth.options.plugins?.find(({ id }) => id === 'admin');

    expect(plugin?.options).not.toMatchObject({ allowImpersonatingAdmins: true });
  });
});
