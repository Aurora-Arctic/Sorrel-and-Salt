import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// The plus's covens beside an entry page's pencil. The
// session, the shell's covens and the held read are mocked: what they return is their own tests'.
// Here: which covens the plus offers, which it marks held, and which it adds to by default.

const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));
const viewerIfSignedIn = vi.fn();
const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn, covenRolesIfSignedIn }));
const covensHoldingEntry = vi.fn();
vi.mock('@/modules/ingredients', () => ({ covensHoldingEntry }));

const { covensHolding, plusCovensOf } = await import('@/app/plus-covens');

const OWNED = { id: 'w-owned', name: 'Fixture Owned', slug: 'fixture-owned', canWrite: true };
const MEMBER = { id: 'w-member', name: 'Fixture Member', slug: 'fixture-member', canWrite: true };
const VIEWER = { id: 'w-viewer', name: 'Fixture Viewer', slug: 'fixture-viewer', canWrite: false };
const SESSION = { userId: 'u-fixture', role: 'user' };

const inCovens = (roles: Record<string, string>) => {
  const all = [OWNED, MEMBER, VIEWER].filter(({ id }) => id in roles);
  viewerIfSignedIn.mockResolvedValue({ workspaces: all });
  covenRolesIfSignedIn.mockResolvedValue(new Map(Object.entries(roles)));
};

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(SESSION);
});

describe('plusCovensOf', () => {
  it('offers every coven that may add, a viewer’s left off, and marks the held ones', async () => {
    inCovens({ [OWNED.id]: 'owner', [MEMBER.id]: 'member', [VIEWER.id]: 'viewer' });

    expect(await plusCovensOf([{ ...MEMBER }])).toEqual({
      workspaceId: OWNED.id,
      covens: [
        { id: OWNED.id, name: OWNED.name },
        { id: MEMBER.id, name: MEMBER.name },
      ],
      heldIn: [MEMBER.id],
    });
  });

  it('defaults to the coven whose page it is where that coven may add, and to the first otherwise', async () => {
    inCovens({ [OWNED.id]: 'owner', [MEMBER.id]: 'member', [VIEWER.id]: 'viewer' });

    expect((await plusCovensOf([], MEMBER.id))?.workspaceId).toBe(MEMBER.id);
    expect((await plusCovensOf([], VIEWER.id))?.workspaceId).toBe(OWNED.id);
  });

  it('is none for a viewer everywhere, so neither the plus nor the check is drawn', async () => {
    // Why it could have been some: the same viewer's coven holds the entry.
    inCovens({ [VIEWER.id]: 'viewer' });

    expect(await plusCovensOf([{ ...VIEWER }])).toBeUndefined();
  });

  it('is none for a curator in no coven, and for a visitor', async () => {
    viewerIfSignedIn.mockResolvedValue({ workspaces: [] });
    covenRolesIfSignedIn.mockResolvedValue(new Map());
    expect(await plusCovensOf([])).toBeUndefined();

    viewerIfSignedIn.mockResolvedValue(null);
    expect(await plusCovensOf([])).toBeUndefined();
  });
});

describe('covensHolding', () => {
  it('reads the held covens as the viewer', async () => {
    covensHoldingEntry.mockResolvedValue([{ ...OWNED }]);

    expect(await covensHolding('i-fixture')).toEqual([{ ...OWNED }]);
    expect(covensHoldingEntry).toHaveBeenCalledWith(SESSION, 'i-fixture');
  });

  it('is none signed out, asking nothing', async () => {
    getSession.mockResolvedValue(null);

    expect(await covensHolding('i-fixture')).toEqual([]);
    expect(covensHoldingEntry).not.toHaveBeenCalled();
  });

  it('reads a refusal as none, and lets anything else through', async () => {
    covensHoldingEntry.mockRejectedValueOnce(new Forbidden());
    expect(await covensHolding('i-fixture')).toEqual([]);

    covensHoldingEntry.mockRejectedValueOnce(new Error('fixture failure'));
    await expect(covensHolding('i-fixture')).rejects.toThrow('fixture failure');
  });
});
