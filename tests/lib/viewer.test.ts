import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// The services are mocked (tests/modules/); here, only how their answers are put together.

const requireSignedIn = vi.fn();
const getSession = vi.fn();
const getShellSession = vi.fn();
const getMe = vi.fn();
const countReceivedInvitations = vi.fn();
const membershipsOf = vi.fn();
const getMySupportCounts = vi.fn();
// What a role may do is the coven module's to say; here a viewer reads no members and only an owner invites.
const rolePermits = vi.fn((role: string, statement?: { member?: string[] }) =>
  statement?.member?.includes('invite') ? role === 'owner' : role !== 'viewer',
);
vi.mock('@/lib/request-session', () => ({ requireSignedIn, getSession, getShellSession }));
vi.mock('@/modules/support', () => ({ getMySupportCounts }));
vi.mock('@/modules/identity', () => ({ getMe, countReceivedInvitations }));
const byCovenName = (a: { name: string; demo?: boolean }, b: { name: string; demo?: boolean }) =>
  Number(a.demo ?? false) - Number(b.demo ?? false) || a.name.localeCompare(b.name);
vi.mock('@/modules/coven', () => ({ membershipsOf, rolePermits, byCovenName }));

const { covenRolesIfSignedIn, viewerIfSignedIn, viewerOf } = await import('@/lib/viewer');

async function viewerFor(shell: { session: typeof SESSION | { userId: string; role: 'admin' } }) {
  getShellSession.mockResolvedValueOnce(shell);
  return (await viewerIfSignedIn())!;
}

const SESSION = { userId: 'u1', role: 'user' } as const;
const ME = { name: 'Fixture Member', canCreateWorkspace: true, emailVerified: true };
const membership = (
  slug: string,
  name: string,
  role = 'member',
  demo = false,
  pause: { until: Date | null } | null = null,
) => ({
  role,
  pause,
  workspace: { id: `id-${slug}`, slug, name, demo },
});

beforeEach(() => {
  requireSignedIn.mockResolvedValue(SESSION);
  getSession.mockResolvedValue(SESSION);
  getShellSession.mockResolvedValue({ session: SESSION });
  getMe.mockResolvedValue(ME);
  membershipsOf.mockResolvedValue([[]]);
  getMySupportCounts.mockReset().mockResolvedValue({ assignedOpen: 0, waitingOnMe: 0 });
  countReceivedInvitations.mockReset().mockResolvedValue({ totalCount: 0, countBefore: null });
});

describe('viewerOf', () => {
  it('reads the creation right and the verification from the user row, and the role from the session', async () => {
    requireSignedIn.mockResolvedValue({ ...SESSION, role: 'admin' });
    getMe.mockResolvedValue({ ...ME, canCreateWorkspace: false, emailVerified: false });

    const { viewer } = await viewerOf();

    expect(viewer).toEqual({
      id: 'u1',
      name: 'Fixture Member',
      canCurate: true,
      canCreate: false,
      verified: false,
      pendingInvitations: 0,
      assignedSupport: 0,
      waitingSupport: 0,
    });
  });

  it('counts the coven invitations waiting for a verified viewer, all of them', async () => {
    countReceivedInvitations.mockResolvedValue({ totalCount: 3, countBefore: null });

    const { viewer } = await viewerOf();

    expect(viewer.pendingInvitations).toBe(3);
    expect(countReceivedInvitations).toHaveBeenCalledExactlyOnceWith(SESSION, undefined);
  });

  it('carries the support counts for a verified viewer, and reads none for an unverified one', async () => {
    getMySupportCounts.mockResolvedValue({ assignedOpen: 4, waitingOnMe: 2 });
    const { viewer } = await viewerOf();
    expect(viewer).toMatchObject({ assignedSupport: 4, waitingSupport: 2 });

    getMySupportCounts.mockClear();
    getMe.mockResolvedValue({ ...ME, emailVerified: false });
    const { viewer: unverified } = await viewerOf();
    expect(unverified).toMatchObject({ assignedSupport: 0, waitingSupport: 0 });
    expect(getMySupportCounts).not.toHaveBeenCalled();
  });

  it('asks no count for an unverified viewer, whose address has none to read', async () => {
    getMe.mockResolvedValue({ ...ME, emailVerified: false });

    const { viewer } = await viewerOf();

    expect(viewer.pendingInvitations).toBe(0);
    expect(countReceivedInvitations).not.toHaveBeenCalled();
  });

  it("lists the demo coven last, though its name sorts ahead of the viewer's own", async () => {
    membershipsOf.mockResolvedValue([
      [
        membership('sorrel-salt-demo', 'Sorrel & Salt Demo', 'viewer', true),
        membership('testwort-circle', 'Testwort Circle', 'owner'),
      ],
    ]);

    const { workspaces } = await viewerOf();

    expect(workspaces.map(({ slug }) => slug)).toEqual(['testwort-circle', 'sorrel-salt-demo']);
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
      {
        id: 'id-fixture-coven',
        slug: 'fixture-coven',
        name: 'Fixture Coven',
        canReadMembers: true,
        canInvite: false,
        canWrite: true,
        paused: null,
      },
      {
        id: 'id-testwort-circle',
        slug: 'testwort-circle',
        name: 'Testwort Circle',
        canReadMembers: false,
        canInvite: false,
        canWrite: false,
        paused: null,
      },
    ]);
  });

  it('marks a paused coven, and takes away everything its role would offer there', async () => {
    const until = new Date('2099-01-01T00:00:00Z');
    membershipsOf.mockResolvedValue([
      [
        membership('own-coven', 'Own Coven', 'owner', false, { until }),
        membership('open-ended', 'Open Ended', 'member', false, { until: null }),
        membership('fixture-coven', 'Fixture Coven', 'owner'),
      ],
    ]);

    const { workspaces } = await viewerOf();

    // Why the paused covens could have offered all three: the same owner role unpaused does.
    expect(workspaces.find(({ slug }) => slug === 'fixture-coven')).toEqual(
      expect.objectContaining({
        canReadMembers: true,
        canInvite: true,
        canWrite: true,
        paused: null,
      }),
    );
    expect(
      workspaces
        .filter(({ slug }) => slug !== 'fixture-coven')
        .map(({ slug, canReadMembers, canInvite, canWrite, paused }) => ({
          slug,
          canReadMembers,
          canInvite,
          canWrite,
          paused,
        })),
    ).toEqual([
      {
        slug: 'open-ended',
        canReadMembers: false,
        canInvite: false,
        canWrite: false,
        paused: { until: null },
      },
      {
        slug: 'own-coven',
        canReadMembers: false,
        canInvite: false,
        canWrite: false,
        paused: { until },
      },
    ]);
  });

  it('asks the role for the statement the ingredient save asserts, and reads a viewer as unable to write', async () => {
    membershipsOf.mockResolvedValue([[membership('testwort-circle', 'Testwort Circle', 'viewer')]]);

    const { workspaces } = await viewerOf();

    expect(rolePermits).toHaveBeenCalledWith('viewer', {
      ingredient: ['create'],
      inventory: ['update'],
    });
    expect(workspaces[0]?.canWrite).toBe(false);
  });

  it('asks the role for the invite statement, so only an owner is offered the invitations page', async () => {
    membershipsOf.mockResolvedValue([
      [membership('own-coven', 'Own Coven', 'owner'), membership('other-coven', 'Other Coven')],
    ]);

    const { workspaces } = await viewerOf();

    expect(rolePermits).toHaveBeenCalledWith('owner', { member: ['invite'] });
    expect(
      workspaces.map(({ slug, canReadMembers, canInvite }) => [slug, canReadMembers, canInvite]),
    ).toEqual([
      ['other-coven', true, false],
      ['own-coven', true, true],
    ]);
  });

  it('refuses to draw a shell from a refused lookup', async () => {
    membershipsOf.mockResolvedValue([new Forbidden()]);

    await expect(viewerOf()).rejects.toThrow();
  });
});

describe('viewerIfSignedIn', () => {
  it('is null for a signed-out visitor, without asking for the viewer or redirecting', async () => {
    getShellSession.mockResolvedValue(null);

    expect(await viewerIfSignedIn()).toBeNull();
    expect(getMe).not.toHaveBeenCalled();
    expect(requireSignedIn).not.toHaveBeenCalled();
  });

  it('is the same viewer and covens viewerOf draws for a signed-in one', async () => {
    membershipsOf.mockResolvedValue([[membership('fixture-coven', 'Fixture Coven')]]);

    const shell = await viewerIfSignedIn();

    expect(shell).toEqual(await viewerOf());
    expect(shell?.workspaces).toHaveLength(1);
  });
});

describe('a paused viewer', () => {
  const until = new Date('2027-01-02T03:04:00Z');

  it('draws no coven, no curation, no creation and no invitations, carrying the pause and the support count', async () => {
    requireSignedIn.mockResolvedValue({ ...SESSION, role: 'admin' });
    getShellSession.mockResolvedValue({
      session: { ...SESSION, role: 'admin' },
      accessPause: { until },
    });
    membershipsOf.mockResolvedValue([[membership('fixture-coven', 'Fixture Coven', 'owner')]]);
    countReceivedInvitations.mockResolvedValue({ totalCount: 2, countBefore: null });
    getMySupportCounts.mockResolvedValue({ assignedOpen: 3, waitingOnMe: 1 });
    // The precondition: unpaused, the same viewer draws the coven, curation and the counts.
    const open = (await viewerFor({ session: { ...SESSION, role: 'admin' } })).viewer;
    expect(open).toMatchObject({
      canCurate: true,
      canCreate: true,
      pendingInvitations: 2,
      assignedSupport: 3,
    });

    for (const shell of [await viewerOf(), await viewerIfSignedIn()]) {
      expect(shell?.workspaces).toEqual([]);
      expect(shell?.viewer).toEqual({
        id: 'u1',
        name: 'Fixture Member',
        canCurate: false,
        canCreate: false,
        verified: true,
        pendingInvitations: 0,
        assignedSupport: 0,
        waitingSupport: 1,
        accessPause: { until },
      });
    }
  });

  it('carries an open-ended pause as a null end', async () => {
    getShellSession.mockResolvedValue({ session: SESSION, accessPause: { until: null } });

    expect((await viewerIfSignedIn())?.viewer.accessPause).toEqual({ until: null });
  });
});

// The public entry page's read: which role the viewer holds in each of their covens, for the
// cupboard choices each coven permits there. The shell carries a coven's permissions as flags,
// not its role, so the page reads the role here, from the same memberships.
describe('covenRolesIfSignedIn', () => {
  it('is null for a signed-out visitor, asking for no memberships', async () => {
    getSession.mockResolvedValue(null);

    expect(await covenRolesIfSignedIn()).toBeNull();
    expect(membershipsOf).not.toHaveBeenCalled();
  });

  it('names the viewer’s role in each of their own covens, asking for their own memberships only', async () => {
    membershipsOf.mockResolvedValue([
      [
        membership('fixture-coven', 'Fixture Coven', 'owner'),
        membership('testwort-circle', 'Testwort Circle', 'viewer'),
      ],
    ]);

    const roles = await covenRolesIfSignedIn();

    expect(membershipsOf).toHaveBeenCalledExactlyOnceWith(SESSION, ['u1']);
    expect(roles).toEqual(
      new Map([
        ['id-fixture-coven', 'owner'],
        ['id-testwort-circle', 'viewer'],
      ]),
    );
  });
});
