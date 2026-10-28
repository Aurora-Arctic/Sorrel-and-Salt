import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';

// MB.6: the spell recipe page. The guard and the services are mocked, since what they decide
// is their own tests' (tests/modules/grimoire/services/spell-reads.test.ts proves a private
// spell reads as NotFound to anyone but its author); here: the page guards itself, a refusal
// is the 404, and what the services give is drawn.

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
  usePathname: () => '/coven/fixture-coven/grimoire/spell-1',
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
  id: 'spell-1',
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
  spellId: 'spell-1',
  ingredientId: null,
  variantId: null,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  body: null,
  note: null,
  ingredient: null,
  variant: null,
};
const params = (id = 'spell-1') => ({
  params: Promise.resolve({ slug: 'fixture-coven', id }),
  searchParams: Promise.resolve({}),
});

beforeEach(() => {
  vi.clearAllMocks();
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
    render(await Page(params()));
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
    expect(requireSession).toHaveBeenCalled();
    expect(readSpell).toHaveBeenCalledWith(session, COVEN.id, 'spell-1');
  });

  it('draws the title, intent, categories, steps in the order given, and the note', async () => {
    render(await Page(params()));
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
