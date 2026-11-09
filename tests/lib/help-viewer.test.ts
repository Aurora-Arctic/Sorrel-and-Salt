import { beforeEach, describe, expect, it, vi } from 'vitest';

// What a help reader page draws for its viewer beyond the text, read per request beside the cached help reads. The edit
// page refuses anyone but a keeper on its own; this decides only what is drawn.

const getSession = vi.fn();
const sessionIsVerified = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession, sessionIsVerified }));

const { helpViewerOffers } = await import('@/lib/help-viewer');

const as = (role: 'user' | 'curator' | 'admin', verified = true) => {
  getSession.mockResolvedValue({ userId: 'u1', role });
  sessionIsVerified.mockResolvedValue(verified);
};

beforeEach(() => {
  getSession.mockReset();
  sessionIsVerified.mockReset();
});

describe('helpViewerOffers', () => {
  it('offers a signed-out reader nothing', async () => {
    getSession.mockResolvedValue(null);

    expect(await helpViewerOffers()).toEqual({ staffHelp: false, edit: false });
  });

  it('offers a member nothing', async () => {
    as('user');

    expect(await helpViewerOffers()).toEqual({ staffHelp: false, edit: false });
  });

  it('offers a curator Staff Help, and no Edit, as only a keeper writes help', async () => {
    as('curator');

    expect(await helpViewerOffers()).toEqual({ staffHelp: true, edit: false });
  });

  it('offers a keeper Staff Help and Edit', async () => {
    as('admin');

    expect(await helpViewerOffers()).toEqual({ staffHelp: true, edit: true });
  });

  it.each(['curator', 'admin'] as const)(
    'offers an unverified %s nothing, as staff help refuses them',
    async (role) => {
      as(role, false);

      expect(await helpViewerOffers()).toEqual({ staffHelp: false, edit: false });
      // Precondition: the same role verified is offered something.
      as(role);
      expect((await helpViewerOffers()).staffHelp).toBe(true);
    },
  );
});
