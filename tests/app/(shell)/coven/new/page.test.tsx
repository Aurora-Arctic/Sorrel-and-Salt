import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import type { Session } from '@/lib/session';

// The create-workspace page, `/coven/new` (M9.16). The session and the row are
// mocked; what they are is tests/lib/request-session.test.ts's and the
// identity service's, and the creation gate is the coven service's.

const requireSession = vi.fn<() => Promise<Session>>();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const getMe = vi.fn();
vi.mock('@/modules/identity', () => ({ getMe }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { default: NewCovenPage } = await import('@/app/(shell)/coven/new/page');

const SESSION: Session = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'user' };

async function renderPage(canCreateWorkspace: boolean) {
  requireSession.mockResolvedValue(SESSION);
  getMe.mockResolvedValue({ name: 'Ada Fixture', canCreateWorkspace });
  render(
    <QueryClientProvider client={makeQueryClient()}>{await NewCovenPage()}</QueryClientProvider>,
  );
}

beforeEach(() => {
  requireSession.mockReset();
  getMe.mockReset();
});

describe('the /coven/new page', () => {
  it('reads the right from the row for the signed-in user', async () => {
    await renderPage(true);

    expect(requireSession).toHaveBeenCalledOnce();
    expect(getMe).toHaveBeenCalledExactlyOnceWith(SESSION);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('offers the form to a user holding creation rights', async () => {
    await renderPage(true);

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
