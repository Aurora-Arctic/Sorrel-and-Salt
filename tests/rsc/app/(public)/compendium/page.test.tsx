import { AsyncLocalStorage } from 'node:async_hooks';
import { createElement } from 'react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_MANIFEST } from '../../../../support/client-references.mts';

// The public compendium page's Flight payload, the data `self.__next_f.push` carries beside the HTML. The reads
// and the viewer are mocked and every `'use client'` module is a client reference
// (tests/support/client-references.mts), so the payload holds each client component's props as Next sends them.

vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }));
// A package's client module is outside the plugin's reach, as Vitest loads packages untransformed.
vi.mock('next/link', async () => {
  const { registerClientReference } = await import('react-server-dom-webpack/server.edge');
  return { default: registerClientReference(() => null, 'next/link', 'default') };
});

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({
  viewerIfSignedIn,
  covenRolesIfSignedIn: async () => new Map([['w-1', 'owner']]),
}));
vi.mock('@/lib/request-session', () => ({
  getSession: async () => ({ userId: 'user-a', role: 'user' }),
}));
vi.mock('@/app/entry-stock', () => ({
  readEntryStock: async () => new Map(),
  stockKey: (workspaceId: string, ingredientId: string) => `${workspaceId}:${ingredientId}`,
}));
vi.mock('@/modules/ingredients', () => ({
  heldCompendiumEntryIdsIn: async () => new Map([['w-1', new Set<string>()]]),
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
}));

const GROUP = { id: 'g-ward', name: 'Fixture Wards', colorDark: '#4e8bc2', colorLight: '#0c5393' };
// The one category and the one deity this file follows. Both cards wear the category, so a card that
// named its own categories would carry its name again.
const CATEGORY = {
  id: 'c-tw',
  slug: 'testward',
  name: 'Testward',
  description: null,
  group: GROUP,
};
const DEITY = {
  id: 'd-tg',
  slug: 'testgod-fixture-rite',
  name: 'Testgod',
  tradition: 'Fixture Rite',
};
const OTHER_CATEGORY = { ...CATEGORY, id: 'c-tc', slug: 'testcraft', name: 'Testcraft' };
const OTHER_DEITY = { ...DEITY, id: 'd-to', slug: 'testother-fixture-rite', name: 'Testother' };

const entry = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  canonicalName: null,
  nomenclature: 'none',
  toxic: false,
  safetyNotes: null,
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2020-01-01'),
});
const ENTRIES = [entry('id-one', 'Fixturewort'), entry('id-two', 'Fixture Salt')];

vi.mock('@/app/compendium-reads', () => ({
  readCompendium: async () => ({
    edges: ENTRIES.map((node) => ({ node, cursor: node.id })),
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    position: { page: 1, pages: 1 },
    totalCount: ENTRIES.length,
    variants: ENTRIES.map(() => []),
    forms: ENTRIES.map(() => []),
  }),
  // Some entry carries each, so the facets name both as the panel's choices.
  readFacets: async () => ({
    forms: [],
    deities: [
      { value: DEITY.id, count: 2 },
      { value: OTHER_DEITY.id, count: 1 },
    ],
    categories: [
      { value: CATEGORY.id, count: 2 },
      { value: OTHER_CATEGORY.id, count: 1 },
    ],
    zodiacSigns: [],
    celestialBodies: [],
    elements: [],
    toxic: [],
    withoutReferences: 0,
    withoutForms: 0,
    reviewed: null,
  }),
  readFormIcons: async () => new Map(),
  readDeities: async () => [DEITY, OTHER_DEITY],
  readCategories: async () => [CATEGORY, OTHER_CATEGORY],
  readCardCategories: async (ids: readonly string[]) =>
    ids.map(() => [{ category: { id: CATEGORY.id, name: CATEGORY.name }, group: GROUP }]),
}));

// React's `cache()` follows a request through `AsyncLocalStorage`, a global Next sets on the server.
Object.assign(globalThis, { AsyncLocalStorage });
const { renderToReadableStream } = await import('react-server-dom-webpack/server.edge');
const { default: Page } = await import('@/app/(public)/compendium/page');
const { default: IngredientCard } = await import('@/components/IngredientCard');

/** The page's Flight payload, as the server streams it to the browser. */
async function payload(): Promise<string> {
  const errors: unknown[] = [];
  const tree = await Page({ searchParams: Promise.resolve({}) });
  const stream = renderToReadableStream(
    createElement(() => tree),
    CLIENT_MANIFEST,
    {
      onError: (error) => {
        errors.push(error);
      },
    },
  );
  const text = await new Response(stream).text();
  if (errors.length > 0) throw errors[0];
  return text;
}

const occurrences = (text: string, word: string) => text.split(`"${word}"`).length - 1;

const visitor = null;
const member = {
  viewer: { name: 'Fixture Member', canCurate: false },
  workspaces: [
    {
      id: 'w-1',
      slug: 'fixture-coven',
      name: 'Fixture Coven',
      canReadMembers: true,
      canWrite: true,
    },
  ],
};

beforeEach(() => {
  viewerIfSignedIn.mockReset();
});

describe('the public compendium page’s data for the browser', () => {
  it.each([
    ['signed out', visitor],
    ['signed in', member],
  ] as const)('carries each category and each deity once, %s', async (_who, viewer) => {
    viewerIfSignedIn.mockResolvedValue(viewer);

    const text = await payload();

    // The panel offers both as choices: they reached the payload at all.
    expect(text).toContain('"testward"');
    expect(text).toContain('"testgod-fixture-rite"');
    // Once each, as a vocabulary row: the facet choices and the cards name them by id, and the
    // browser looks the rest up there.
    expect(occurrences(text, CATEGORY.name)).toBe(1);
    expect(occurrences(text, DEITY.name)).toBe(1);
  });

  it.each([
    ['signed out', visitor],
    ['signed in', member],
  ] as const)('sends each card as its data, not its drawn markup, %s', async (_who, viewer) => {
    viewerIfSignedIn.mockResolvedValue(viewer);

    const text = await payload();

    // The cards reached the payload: their names are there.
    expect(occurrences(text, 'Fixturewort')).toBeGreaterThan(0);
    // The card is a client component's props, so the markup the browser draws from them is not sent.
    expect(text).not.toContain('"ingredient-card specimen"');
  });
});

describe('the card’s props for the browser', () => {
  // The card shows a Caution badge for notes, never the notes, so their text has no reason to travel.
  it('hands the client card whether there are notes, never their text', () => {
    const notes = 'Fixture caution against testing by mouth';
    const formNotes = 'Fixture caution for the oil alone';
    const card = IngredientCard({
      href: '/compendium/ingredients/fixturewort' as Route,
      label: 'Fixturewort',
      kind: 'compendium',
      safetyNotes: notes,
      variants: [
        { form: 'fixture oil', safetyNotes: formNotes, toxic: false, formChoice: null },
        { form: 'fixture herb', safetyNotes: '  ', toxic: true, formChoice: null },
      ],
    });

    // What the page sends is this element's props: the client card is a reference, not drawn here.
    expect(card.type).toHaveProperty('$$typeof', Symbol.for('react.client.reference'));
    const sent = JSON.stringify(card.props);
    expect(sent).not.toContain(notes);
    expect(sent).not.toContain(formNotes);
    // Enough is kept for the badge: which have notes and which are flagged.
    const props = card.props as {
      safetyNotes: string | null;
      variants: { safetyNotes: string | null; toxic: boolean }[];
    };
    expect(props.safetyNotes).not.toBeNull();
    expect(props.variants.map(({ safetyNotes, toxic }) => [safetyNotes !== null, toxic])).toEqual([
      [true, false],
      [false, true],
    ]);
  });
});
