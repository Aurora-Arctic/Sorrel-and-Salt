import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The `/coven` landing (M2.8, Story 2): a member goes into their first coven,
// anyone else is told what they can do next. The viewer is mocked; who is a
// member and who may create is tests/lib/viewer's and the services'.

const REDIRECTED = new Error('NEXT_REDIRECT');
const redirect = vi.fn((_to: string): never => {
  throw REDIRECTED;
});
vi.mock('next/navigation', () => ({ redirect }));
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireSession }));
const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));

const { default: CovenLandingPage } = await import('@/app/(shell)/coven/page');

function asViewer(canCreate: boolean, workspaces: { slug: string; name: string }[] = []) {
  viewerOf.mockResolvedValue({
    viewer: { name: 'Ada Fixture', isAdmin: false, canCreate, verified: true },
    workspaces,
  });
}

beforeEach(() => {
  redirect.mockClear();
  requireSession.mockReset().mockResolvedValue({ userId: 'u', role: 'user' });
  viewerOf.mockReset();
});

describe('the /coven landing', () => {
  it('sends a member to the first coven the switcher lists, whatever they may create', async () => {
    asViewer(true, [
      { slug: 'fixture-coven', name: 'Fixture Coven' },
      { slug: 'testwort-circle', name: 'Testwort Circle' },
    ]);

    await expect(CovenLandingPage()).rejects.toBe(REDIRECTED);
    expect(redirect).toHaveBeenCalledWith('/coven/fixture-coven');
  });

  it('offers someone with no coven who may create one the create page', async () => {
    asViewer(true);

    render(await CovenLandingPage());

    expect(screen.getByRole('link', { name: 'Create Coven' })).toHaveAttribute(
      'href',
      '/coven/new',
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it('tells someone with neither how to get in, with no create link', async () => {
    asViewer(false);

    render(await CovenLandingPage());

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Coven' })).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('is behind the session guard', async () => {
    asViewer(false);

    render(await CovenLandingPage());

    expect(requireSession).toHaveBeenCalled();
  });
});
