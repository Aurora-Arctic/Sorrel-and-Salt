import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '@/lib/graphql-client';
import { CARD_PAGE_SIZE, encodeCursor } from '@/lib/pagination';

// The public compendium page (M8.18; MB.80). The reads and the viewer are mocked, since what
// they decide is their own tests' (the admin page's test runs the reads). Here: what the
// address becomes in the read, which foot each kind of visitor gets, and when the page asks
// to be kept out of search results.

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));

const readCompendium = vi.fn();
const readFacets = vi.fn();
vi.mock('@/app/compendium-reads', () => ({
  readCompendium,
  readFacets,
  readFormIcons: async () => new Map(),
  readDeities: async () => [],
  readCategories: async () => [],
  readCardCategories: async (ids: readonly string[]) => ids.map(() => []),
}));

const { default: Page, generateMetadata } = await import('@/app/(public)/compendium/page');

const NODE = {
  id: '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
  name: 'Testwort',
  slug: 'testwort-fixtura-testalis',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
  toxic: false,
  safetyNotes: null,
};

const NO_FACETS = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
};

const shellOf = (...canWrite: boolean[]) => ({
  viewer: { name: 'Fixture Member' },
  workspaces: canWrite.map((write, i) => ({
    id: `w${i}`,
    slug: `coven-${i}`,
    name: `Coven ${i}`,
    canReadMembers: true,
    canWrite: write,
  })),
});

async function renderPage(params: Record<string, string | string[]> = {}) {
  const page = await Page({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const sizeRead = () => readCompendium.mock.lastCall![3] as number;
const variablesRead = () => JSON.parse(readCompendium.mock.lastCall![0] as string);

beforeEach(() => {
  readCompendium.mockReset();
  readCompendium.mockResolvedValue({
    edges: [{ node: NODE, cursor: 'c' }],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    position: { page: 1, pages: 1 },
    totalCount: 1,
    variants: [[{ form: 'Fixture Herb', formChoice: null }]],
    forms: [[]],
  });
  readFacets.mockReset();
  readFacets.mockResolvedValue(NO_FACETS);
  viewerIfSignedIn.mockReset();
  viewerIfSignedIn.mockResolvedValue(null);
});

describe('the public compendium page', () => {
  it('lists the entry as a link to its own page for a visitor with no account', async () => {
    await renderPage();
    const list = screen.getByRole('list', { name: 'Compendium' });
    expect(within(list).getByRole('link', { name: /Testwort/ })).toHaveAttribute(
      'href',
      `/compendium/ingredients/${NODE.slug}`,
    );
  });

  it('asks for a page of 24 cards, so the grid ends on a full row, on the first page and both ways on', async () => {
    const cursor = encodeCursor({ key: ['Testwort'], id: NODE.id });
    await renderPage();
    const first = sizeRead();
    await renderPage({ after: cursor });
    const next = sizeRead();
    await renderPage({ before: cursor });
    const previous = sizeRead();

    expect([first, next, previous]).toEqual([CARD_PAGE_SIZE, CARD_PAGE_SIZE, CARD_PAGE_SIZE]);
    expect(CARD_PAGE_SIZE).toBe(24);
  });

  it('reads the same list with ?withoutReferences=1 as without it', async () => {
    await renderPage();
    const unfiltered = readCompendium.mock.lastCall![0];
    readCompendium.mockClear();
    document.body.innerHTML = '';
    await renderPage({ withoutReferences: '1' });
    expect(readCompendium.mock.lastCall![0]).toBe(unfiltered);
    expect(variablesRead()).not.toHaveProperty('withoutReferences');
  });

  it('leaves a visitor with no account no action on the cards, and no second Sign In', async () => {
    await renderPage();
    expect(screen.getAllByRole('link', { name: 'Testwort' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add to My Ingredients' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
  });

  it.each([
    ['a member of one coven', [true], 1],
    ['an owner beside a coven that only views', [false, true], 1],
    ['someone who only views', [false], 0],
    ['someone in no coven', [], 0],
  ] as const)(
    'offers Add to My Ingredients to %s only as the role allows',
    async (_who, writes, buttons) => {
      viewerIfSignedIn.mockResolvedValue(shellOf(...writes));
      await renderPage();
      const add = screen.queryAllByRole('button', { name: 'Add to My Ingredients' });
      expect(add).toHaveLength(buttons);
      for (const button of add) expect(button).toBeDisabled();
      expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
    },
  );
});

describe('the public compendium page structured data', () => {
  const scripts = () => document.querySelectorAll('script[type="application/ld+json"]');

  it('describes the unfiltered list as a collection', async () => {
    await renderPage();
    expect(scripts()).toHaveLength(1);
    expect(JSON.parse(scripts()[0].textContent ?? '{}')['@type']).toBe('CollectionPage');
  });

  it('describes a filtered view as nothing', async () => {
    await renderPage({ query: 'wort' });
    expect(scripts()).toHaveLength(0);
  });
});

describe('the public compendium page metadata', () => {
  const metadata = (params: Record<string, string | string[]>) =>
    generateMetadata({ searchParams: Promise.resolve(params) });

  it('keeps the unfiltered page indexable', async () => {
    const result = await metadata({});
    expect(result.robots).toBeUndefined();
  });

  it('names the bare address as canonical on the indexable view too, with a description', async () => {
    const result = await metadata({});
    expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
    expect(result.description).toBeTruthy();
  });

  it('reads the same list with ?withoutForms=1 as without it', async () => {
    await renderPage();
    const unfiltered = readCompendium.mock.lastCall![0];
    readCompendium.mockClear();
    document.body.innerHTML = '';
    await renderPage({ withoutForms: '1' });
    expect(readCompendium.mock.lastCall![0]).toBe(unfiltered);
    expect(variablesRead()).not.toHaveProperty('withoutForms');
  });

  it('keeps ?withoutForms=1 indexable too, as it filters nothing', async () => {
    const result = await metadata({ withoutForms: '1' });
    expect(result.robots).toBeUndefined();
  });

  it('keeps ?withoutReferences=1 indexable too, as it filters nothing', async () => {
    const result = await metadata({ withoutReferences: '1' });
    expect(result.robots).toBeUndefined();
  });

  it.each<Record<string, string>>([
    { query: 'wort' },
    { forms: 'Fixture Herb' },
    { toxic: 'toxic' },
  ])(
    'keeps a filtered view (%o) out of search results, canonical to the unfiltered page',
    async (params) => {
      const result = await metadata(params);
      expect(result.robots).toMatchObject({ index: false });
      expect(result.alternates?.canonical).toBe('https://sorrelandsalt.com/compendium');
    },
  );
});
