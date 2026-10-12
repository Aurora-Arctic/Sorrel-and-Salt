import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/coven/[slug]` layout runs the coven guard on the slug in its own URL
// segment and on nothing else. What the guard decides is
// tests/lib/request-session.test.ts's and the service's; here it is mocked, to
// prove the layout awaits it before rendering anything.

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership }));
// CovenNav marks the page you are on from the address, which Next reads from
// the App Router's state; a test mounts no router, so the address is given.
vi.mock('next/navigation', () => ({ usePathname: () => '/coven/fixture-coven' }));

const { default: CovenLayout, generateMetadata } = await import('@/app/coven/[slug]/layout');

const ADMITTED = {
  workspace: { id: 'w', name: 'Fixture Coven', slug: 'fixture-coven' },
  membership: { workspaceId: 'w', userId: 'u', role: 'viewer' },
};

const params = (slug: string) => Promise.resolve({ slug });

beforeEach(() => {
  requireCovenMembership.mockReset();
});

describe('the /coven/[slug] layout', () => {
  it('shows a member the section nav and the page, guarding the slug from the URL segment', async () => {
    requireCovenMembership.mockResolvedValue(ADMITTED);

    render(
      await CovenLayout({ children: <p>The page itself</p>, params: params('fixture-coven') }),
    );

    expect(requireCovenMembership).toHaveBeenCalledExactlyOnceWith('fixture-coven');
    // The nav is the layout's, so every page beneath it has it without repeating it (M9.15).
    expect(screen.getByRole('navigation', { name: 'Workspace' })).toBeInTheDocument();
    expect(screen.getByText('The page itself')).toBeInTheDocument();
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
