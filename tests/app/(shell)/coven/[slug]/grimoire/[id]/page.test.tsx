import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLQuery } from '../../../../../../support/msw/graphql';
import { offerCategories } from '../../../../../../support/msw/ingredient-lookups';

// MB.6: the spell recipe page. The guard and the services are mocked, since what they decide
// is their own tests' (tests/modules/grimoire/services/spell-reads.test.ts proves a private
// spell reads as NotFound to anyone but its author); here: the page guards itself, a refusal
// is the 404, and what the services give is drawn.

const SPELL_ID = '0f6d2c8e-3b1a-4e5f-9a7c-2d4b6e8f1a3c';
const COVEN = { id: 'c0ffee00-0000-4000-8000-000000000001', slug: 'fixture-coven' };
const session = { user: { id: 'fixture-user' } };
const requireSession = vi.fn(async () => session);
const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => `/coven/fixture-coven/grimoire/${SPELL_ID}`,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/compendium-reads', () => ({
  readCategories: async () => [
    {
      id: 'cat-1',
      slug: 'testwarding',
      name: 'Testwarding',
      description: null,
      group: { id: 'g', name: 'G', colorDark: '#a0c4ff', colorLight: '#1d3557' },
    },
  ],
}));

const readSpell = vi.fn();
const stepsOfSpells = vi.fn();
const assignedCategoriesOf = vi.fn();
vi.mock('@/modules/grimoire', () => ({ readSpell, stepsOfSpells, assignedCategoriesOf }));
const displayNamesOf = vi.fn();
vi.mock('@/modules/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/identity')>()),
  displayNamesOf,
}));

const { default: Page, generateMetadata } =
  await import('@/app/(shell)/coven/[slug]/grimoire/[id]/page');

const SPELL = {
  id: SPELL_ID,
  workspaceId: COVEN.id,
  title: 'Fixture Working',
  intent: 'To keep the testwort fresh.',
  status: 'complete',
  visibility: 'workspace',
  note: 'Best on a dry night.',
  updatedBy: 'fixture-user',
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
};
const stepRow = {
  spellId: SPELL_ID,
  ingredientId: null,
  variantId: null,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  body: null,
  ingredient: null,
  variant: null,
};
const params = (id = SPELL_ID, search: Record<string, string> = {}) => ({
  params: Promise.resolve({ slug: 'fixture-coven', id }),
  searchParams: Promise.resolve(search),
});
const draw = async (...args: Parameters<typeof params>) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>
      {await Page(params(...args))}
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  offerCategories([]);
  mockGraphQLQuery('SpellBuilderSteps', ({ id }: { id: string }) => ({ spell: { id, steps: [] } }));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  requireCovenMembership.mockResolvedValue({ workspace: COVEN, membership: { role: 'member' } });
  readSpell.mockResolvedValue(SPELL);
  stepsOfSpells.mockResolvedValue([
    [
      {
        ...stepRow,
        id: 's-b',
        ingredientId: 'ing-1',
        variantId: 'v-1',
        quantity: '2',
        unit: 'tsp',
        ingredient: { id: 'ing-1', name: 'Testwort', canonicalName: null, deleted: false },
        variant: { id: 'v-1', form: 'dried leaf', deleted: false },
      },
      { ...stepRow, id: 's-a', body: 'Stir three times' },
    ],
  ]);
  assignedCategoriesOf.mockResolvedValue([[{ id: 'cat-1' }]]);
  displayNamesOf.mockResolvedValue(['Fixture Author']);
});

describe('the spell recipe page', () => {
  it('guards itself: the coven, then the session, then reads the spell in that coven', async () => {
    await draw();
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
    expect(requireSession).toHaveBeenCalled();
    expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, SPELL_ID);
  });

  it('draws the title, intent, categories, steps in the order given, and the note', async () => {
    await draw();
    expect(screen.getByRole('heading', { level: 1, name: 'Fixture Working' })).toBeInTheDocument();
    expect(screen.getByText('To keep the testwort fresh.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Categories' })).toHaveTextContent('Testwarding');
    const steps = within(screen.getByRole('list', { name: 'Steps' }));
    expect(steps.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Testwort'),
      'Stir three times',
    ]);
    expect(screen.getByText('Best on a dry night.')).toBeInTheDocument();
    expect(screen.getAllByText(/Fixture Author/).length).toBeGreaterThan(0);
  });

  describe('editing (M13.10)', () => {
    const as = (role: 'owner' | 'member' | 'viewer') =>
      requireCovenMembership.mockResolvedValue({ workspace: COVEN, membership: { role } });
    const SAVED = {
      ...SPELL,
      revision: 2,
      jarDescription: null,
      sealWaxColor: null,
      moonPhase: null,
      dayOfWeek: null,
    };

    it('gives a member an Edit link to ?edit=<id> on this page and opens no dialog until it is used', async () => {
      as('member');
      await draw();
      const link = screen.getByRole('link', { name: 'Edit Fixture Working' });
      expect(link).toHaveAttribute(
        'href',
        `/coven/fixture-coven/grimoire/${SPELL_ID}?edit=${SPELL_ID}`,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the spell in the dialog under ?edit=<its id>', async () => {
      as('member');
      readSpell.mockResolvedValue(SAVED);
      await draw(SPELL_ID, { edit: SPELL_ID });
      expect(
        screen.getByRole('dialog', { name: 'Edit Spell, Fixture Working' }),
      ).toBeInTheDocument();
    });

    it('shows a viewer no Edit link and opens no dialog under ?edit, though they read the same spell', async () => {
      as('viewer');
      await draw(SPELL_ID, { edit: SPELL_ID });
      expect(
        screen.getByRole('heading', { level: 1, name: 'Fixture Working' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^Edit / })).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens no dialog when ?edit names a different spell, which the page does not read', async () => {
      as('member');
      await draw(SPELL_ID, { edit: '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d' });
      expect(
        screen.getByRole('heading', { level: 1, name: 'Fixture Working' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(readSpell).not.toHaveBeenCalledWith(
        session,
        COVEN.id,
        '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d',
      );
    });

    it("is the 404, with no dialog, for another member's private spell or another coven's", async () => {
      as('member');
      readSpell.mockRejectedValue(new NotFound('No such spell in this coven'));
      await expect(Page(params(SPELL_ID, { edit: SPELL_ID }))).rejects.toThrow('NEXT_NOT_FOUND');
      expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, SPELL_ID);
    });
  });

  it('is the 404 when the guard refuses a non-member', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(Page(params())).rejects.toThrow('NEXT_NOT_FOUND');
    expect(readSpell).not.toHaveBeenCalled();
  });

  // The preconditions are the service's: it throws NotFound for another member's private spell
  // and for another coven's, Forbidden for a non-member. Either is the page's 404.
  it.each([new NotFound('No such spell in this coven'), new Forbidden('no')])(
    'is the 404 when the service refuses the spell (%s)',
    async (refusal) => {
      readSpell.mockRejectedValue(refusal);
      await expect(Page(params('someone-elses-private'))).rejects.toThrow('NEXT_NOT_FOUND');
      expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, 'someone-elses-private');
      expect(stepsOfSpells).not.toHaveBeenCalled();
    },
  );

  it('lets any other failure through rather than calling it a 404', async () => {
    readSpell.mockRejectedValue(new Error('database down'));
    await expect(Page(params())).rejects.toThrow('database down');
  });

  it('titles the tab by the spell, Untitled Spell for a draft with none', async () => {
    expect(await generateMetadata(params())).toEqual({ title: 'Fixture Working' });
    readSpell.mockResolvedValue({ ...SPELL, title: null, status: 'draft' });
    expect(await generateMetadata(params())).toEqual({ title: 'Untitled Spell' });
  });
});
