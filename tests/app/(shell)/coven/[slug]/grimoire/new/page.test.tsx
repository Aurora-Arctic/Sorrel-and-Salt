import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { offerCategories } from '../../../../../../support/msw/ingredient-lookups';

// The new-spell page (M10.12, story 47): the guard on the slug from the address, the
// builder for a role that may create a spell, and the 404 a stranger gets for a viewer.
// The guard is mocked, since who is a member is its own tests'; that the service refuses a
// viewer's createSpell by itself is tests/modules/grimoire/services/spells.test.ts's.

const COVEN = { id: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44', slug: 'fixture-coven' };

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/coven/fixture-coven/grimoire/new',
}));

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership }));

const { default: NewSpellPage } = await import('@/app/(shell)/coven/[slug]/grimoire/new/page');

function asRole(role: 'owner' | 'member' | 'viewer') {
  requireCovenMembership.mockResolvedValue({
    workspace: COVEN,
    membership: { workspaceId: COVEN.id, userId: 'fixture-user', role },
  });
}

async function renderPage() {
  const page = await NewSpellPage({ params: Promise.resolve({ slug: COVEN.slug }) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // The builder's Categories field reads every category as it opens (M10.14).
  offerCategories([]);
});

describe('the new-spell page', () => {
  it.each(['owner', 'member'] as const)(
    'draws an empty builder for an %s, under the page heading, with a way back to the grimoire',
    async (role) => {
      asRole(role);
      await renderPage();

      expect(requireCovenMembership).toHaveBeenCalledWith(COVEN.slug);
      expect(screen.getByRole('heading', { level: 1, name: 'New Spell' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Back to Grimoire/ })).toHaveAttribute(
        'href',
        `/coven/${COVEN.slug}/grimoire`,
      );
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Save Spell' })).toBeDisabled();
      expect(notFound).not.toHaveBeenCalled();
    },
  );

  it('answers a viewer, who writes nothing, with the 404 a stranger gets', async () => {
    asRole('viewer');

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    // The guard let the viewer in as a member: the page's own check is what refused.
    expect(requireCovenMembership).toHaveBeenCalledWith(COVEN.slug);
    expect(notFound).toHaveBeenCalledOnce();
  });
});
