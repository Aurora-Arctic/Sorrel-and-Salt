import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE } from '@/lib/pagination';

// A coven's Ingredients page (M9.6). The guard and the services are mocked, since what they
// decide is their own tests'; the page's own reads run for real over them. Here: the guard on
// the slug from the address, one page of 24 with one stock call for the whole page, the address
// becoming the filter, and what a card shows of the coven's label, kind and jars.

const COVEN = {
  id: '5b8f4a10-2d6e-4c19-8a37-0e9d1c2b3a44',
  slug: 'fixture-coven',
  name: 'Fixture Coven',
};
const session = { user: { id: 'fixture-user' } };

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const requireCovenMembership = vi.fn();
vi.mock('@/lib/request-session', () => ({
  requireCovenMembership,
  requireSession: async () => session,
}));

vi.mock('@/app/compendium-reads', () => ({
  readFormIcons: async () => new Map([['fixture herb', 'botanical']]),
  readDeities: async () => [],
  readCategories: async () => [],
  readCardCategoriesOf: async (_session: unknown, refs: readonly unknown[]) => refs.map(() => []),
}));

const listWorkspaceIngredients = vi.fn();
const countWorkspaceIngredients = vi.fn();
const stockOf = vi.fn();
const variantsOf = vi.fn();
const workspaceIngredientFacets = vi.fn();
vi.mock('@/modules/ingredients', async (importActual) => ({
  ...(await importActual<typeof import('@/modules/ingredients')>()),
  listWorkspaceIngredients,
  countWorkspaceIngredients,
  stockOf,
  variantsOf,
  workspaceIngredientFacets,
}));

const { default: Page, metadata } = await import('@/app/(shell)/coven/[slug]/ingredients/page');

const row = (id: string, name: string, workspaceId: string | null) => ({
  id,
  name,
  workspaceId,
  canonicalName: null,
  nomenclature: 'none',
  toxic: false,
  safetyNotes: null,
  deletedAt: null,
});

const NO_FACETS = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  source: [],
  inStock: 0,
  lowStockOnly: 0,
};

async function renderPage(search: Record<string, string> = {}) {
  const page = await Page({
    params: Promise.resolve({ slug: COVEN.slug }),
    searchParams: Promise.resolve(search),
  });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCovenMembership.mockResolvedValue({
    workspace: COVEN,
    membership: { workspaceId: COVEN.id, userId: 'fixture-user', role: 'member' },
  });
  listWorkspaceIngredients.mockResolvedValue([
    {
      node: row('a1', 'Testwort', COVEN.id),
      cursor: { key: ['Testwort'], id: 'a1' },
      cupboardEntry: null,
    },
    {
      node: row('b2', 'Fixture Salt', null),
      cursor: { key: ['Fixture Salt'], id: 'b2' },
      cupboardEntry: { label: 'House Salt', description: null },
    },
  ]);
  countWorkspaceIngredients.mockResolvedValue({ totalCount: 2, countBefore: null });
  variantsOf.mockResolvedValue([
    [{ id: 'v1', form: 'Fixture Herb', toxic: false, safetyNotes: null }],
    [],
  ]);
  stockOf.mockResolvedValue([
    [{ id: 'j1', variantId: 'v1', quantityOnHand: '3', unit: 'oz', lowStockThreshold: '1' }],
    [],
  ]);
  workspaceIngredientFacets.mockResolvedValue(NO_FACETS);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

describe('the coven Ingredients page', () => {
  it('runs the coven guard on the slug from its own address', async () => {
    await renderPage();
    expect(requireCovenMembership).toHaveBeenCalledWith('fixture-coven');
  });

  it('does not read anything for a non-member, whom the guard refuses', async () => {
    requireCovenMembership.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(listWorkspaceIngredients).not.toHaveBeenCalled();
    expect(stockOf).not.toHaveBeenCalled();
  });

  it('asks for a page of 24 and reads every jar of it in one stock call', async () => {
    await renderPage();
    expect(CARD_PAGE_SIZE).toBe(24);
    expect(listWorkspaceIngredients.mock.calls[0]![3]).toMatchObject({ limit: CARD_PAGE_SIZE + 1 });
    expect(stockOf).toHaveBeenCalledTimes(1);
  });

  it('links each entry to its page in the coven, under the coven’s label', async () => {
    await renderPage();
    const list = screen.getByRole('list', { name: 'Ingredients' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/coven/fixture-coven/ingredients/a1', '/coven/fixture-coven/ingredients/b2']);
    expect(within(list).getByRole('link', { name: /House Salt/ })).toBeInTheDocument();
  });

  it('draws the jar a coven holds on its form', async () => {
    await renderPage();
    expect(screen.getAllByText(/Fixture Herb/).length).toBeGreaterThan(0);
    expect(screen.getByText(/3 oz/)).toBeInTheDocument();
  });

  it('reads the address as the filter, Source and In Stock included', async () => {
    await renderPage({ source: 'local', inStock: '1' });
    expect(listWorkspaceIngredients.mock.calls[0]![2]).toEqual({ source: 'local', inStock: true });
    expect(workspaceIngredientFacets.mock.calls[0]![2]).toEqual({ source: 'local', inStock: true });
  });

  it('titles the tab Ingredients', () => {
    expect(metadata.title).toBe('Ingredients');
  });
});
