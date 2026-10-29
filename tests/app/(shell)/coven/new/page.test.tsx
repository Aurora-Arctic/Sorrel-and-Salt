import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// The create-workspace page, `/coven/new`. The session and the row are
// mocked; what they are is tests/lib/request-session.test.ts's and the
// identity service's, and the creation gate is the coven service's.

const requireSession = vi.fn<() => Promise<Session>>();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({ getMe }));
const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/coven/new',
}));

const { default: NewCovenPage } = await import('@/app/(shell)/coven/new/page');

const SESSION: Session = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' };

async function renderPage(
  canCreateWorkspace: boolean,
  workspaces: { slug: string; name: string }[] = [],
) {
  requireSession.mockResolvedValue(SESSION);
  viewerOf.mockResolvedValue({
    viewer: {
      name: 'Ada Fixture',
      canCurate: false,
      canCreate: canCreateWorkspace,
      verified: true,
    },
    workspaces,
  });
  getMe.mockResolvedValue({ name: 'Ada Fixture', canCreateWorkspace });
  render(
    <QueryClientProvider client={makeQueryClient()}>{await NewCovenPage()}</QueryClientProvider>,
  );
}

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
  viewerOf.mockReset();
});

describe('the /coven/new page', () => {
  it('shows the context row, with the switcher, to a user who already has a coven', async () => {
    await renderPage(true, [{ slug: 'fixture-coven', name: 'Fixture Coven' }]);

    const row = screen.getByRole('region', { name: 'Context' });
    expect(within(row).getByRole('combobox')).toBeInTheDocument();
  });

  it('shows no context row to a user with no coven to switch to', async () => {
    await renderPage(true, []);

    expect(screen.queryByRole('region', { name: 'Context' })).toBeNull();
  });

  it('reads the right from the row and offers the form to a user holding it', async () => {
    await renderPage(true);

    expect(requireSession).toHaveBeenCalledOnce();
    expect(getMe).toHaveBeenCalledExactlyOnceWith(SESSION);

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Coven' })).toBeInTheDocument();
  });

  it('offers no form to a user without the right, saying so instead', async () => {
    await renderPage(false);

    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Coven' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing when there is no session', async () => {
    requireSession.mockRejectedValue(new Error('redirect'));

    await expect(NewCovenPage()).rejects.toThrow('redirect');
    expect(getMe).not.toHaveBeenCalled();
  });
});
