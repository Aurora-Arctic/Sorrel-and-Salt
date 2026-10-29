import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/coven/[slug]` layout runs the coven guard on the slug in its own URL
// segment and on nothing else. What the guard decides is
// tests/lib/request-session.test.ts's and the service's; here it is mocked, to
// prove the layout awaits it before rendering anything.

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership }));
// The switcher's list is the shell's cached lookup, given here.
const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));
// CovenNav marks the page you are on from the address, which Next reads from
// the App Router's state; a test mounts no router, so the address is given.
const pathname = vi.fn<() => string>();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push }),
}));

const { default: CovenLayout, generateMetadata } =
  await import('@/app/(shell)/coven/[slug]/layout');
const { default: CovenSwitchTargets } = await import('@/components/CovenSwitchTargets');

const ADMITTED = {
  workspace: { id: 'w', name: 'Fixture Coven', slug: 'fixture-coven' },
  membership: { workspaceId: 'w', userId: 'u', role: 'viewer' },
};

const params = (slug: string) => Promise.resolve({ slug });

beforeEach(() => {
  requireCovenMembership.mockReset();
  push.mockClear();
  pathname.mockReturnValue('/coven/fixture-coven');
  viewerOf.mockResolvedValue({
    viewer: { name: 'Fixture Owner', canCurate: false, canCreate: true, verified: true },
    workspaces: [
      { slug: 'fixture-coven', name: 'Fixture Coven', canReadMembers: true, canInvite: false },
      { slug: 'testwort-circle', name: 'Testwort Circle', canReadMembers: true, canInvite: false },
    ],
  });
});

describe('the /coven/[slug] layout', () => {
  it('shows a member the section nav and the page, guarding the slug from the URL segment', async () => {
    requireCovenMembership.mockResolvedValue(ADMITTED);

    render(
      await CovenLayout({ children: <p>The page itself</p>, params: params('fixture-coven') }),
    );

    expect(requireCovenMembership).toHaveBeenCalledExactlyOnceWith('fixture-coven');
    // The nav is the layout's, so every page beneath it has it without repeating it.
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    // The context row's lead: the switcher, on the coven the address names.
    expect(screen.getByRole('combobox', { name: 'Coven' })).toHaveTextContent('Fixture Coven');
    expect(screen.getByText('The page itself')).toBeInTheDocument();
  });

  // The switcher is the layout's and the page is its child, so the layout is what lets
  // the page tell the switcher where it also opens.
  it('lets a page beneath it tell the switcher which covens it opens in', async () => {
    requireCovenMembership.mockResolvedValue(ADMITTED);
    pathname.mockReturnValue('/coven/fixture-coven/ingredients/some-id');

    render(
      await CovenLayout({
        children: (
          <CovenSwitchTargets
            path="/coven/fixture-coven/ingredients/some-id"
            slugs={['fixture-coven', 'testwort-circle']}
          />
        ),
        params: params('fixture-coven'),
      }),
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Coven' }));
    fireEvent.click(screen.getByRole('option', { name: 'Testwort Circle' }));

    expect(push).toHaveBeenCalledExactlyOnceWith('/coven/testwort-circle/ingredients/some-id');
  });

  it('renders nothing when the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('not-found'));

    await expect(
      CovenLayout({ children: <p>The page itself</p>, params: params('fixture-coven') }),
    ).rejects.toThrow('not-found');
  });

  it("titles the coven's pages with the workspace's name", async () => {
    requireCovenMembership.mockResolvedValue(ADMITTED);

    const metadata = await generateMetadata({ params: params('fixture-coven') });

    expect(requireCovenMembership).toHaveBeenCalledExactlyOnceWith('fixture-coven');
    expect(metadata.title).toMatchObject({ template: expect.stringContaining('Fixture Coven') });
  });
});
