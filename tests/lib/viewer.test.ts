import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// What the shell draws, assembled from the session, the user row and the
// viewer's memberships. The services are mocked: what they decide is theirs
// to test (tests/modules/); here, only how the answers are put together.

const requireSession = vi.fn();
const getMe = vi.fn();
const membershipsOf = vi.fn();
// What a role may do is the coven module's to say; here a viewer reads no members.
const rolePermits = vi.fn((role: string) => role !== 'viewer');
vi.mock('@/lib/request-session', () => ({ requireSession }));
vi.mock('@/modules/identity', () => ({ getMe }));
vi.mock('@/modules/coven', () => ({ membershipsOf, rolePermits }));

const { viewerOf } = await import('@/lib/viewer');

const SESSION = { userId: 'u1', role: 'user' } as const;
const ME = { name: 'Fixture Member', canCreateWorkspace: true, emailVerified: true };
const membership = (slug: string, name: string, role = 'member') => ({
  role,
  workspace: { slug, name },
});

beforeEach(() => {
  requireSession.mockResolvedValue(SESSION);
  getMe.mockResolvedValue(ME);
  membershipsOf.mockResolvedValue([[]]);
});

describe('viewerOf', () => {
  it('reads the creation right and the verification from the user row, and the role from the session', async () => {
    requireSession.mockResolvedValue({ ...SESSION, role: 'admin' });
    getMe.mockResolvedValue({ ...ME, canCreateWorkspace: false, emailVerified: false });

    const { viewer } = await viewerOf();

    expect(viewer).toEqual({
      name: 'Fixture Member',
      isAdmin: true,
      canCreate: false,
      verified: false,
    });
  });

  it('asks for the viewer’s own memberships only', async () => {
    await viewerOf();

    expect(membershipsOf).toHaveBeenCalledExactlyOnceWith(SESSION, ['u1']);
  });

  it('lists the covens by name, alphabetically', async () => {
    membershipsOf.mockResolvedValue([
      [
        membership('testwort-circle', 'Testwort Circle', 'viewer'),
        membership('fixture-coven', 'Fixture Coven'),
      ],
    ]);

    const { workspaces } = await viewerOf();

    expect(workspaces).toEqual([
      { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true },
      { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: false },
    ]);
  });

  it('refuses to draw a shell from a refused lookup', async () => {
    membershipsOf.mockResolvedValue([new Forbidden()]);

    await expect(viewerOf()).rejects.toThrow();
  });
});
