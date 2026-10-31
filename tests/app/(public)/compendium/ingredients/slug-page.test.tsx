import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';

// The public entry page's reach: the cached sessionless read first, and a session asked for only when it finds
// nothing. A curator or admin then gets a hidden entry from the uncached read; anyone else gets the 404. What the
// uncached read admits is its service test's (tests/modules/ingredients/services/compendium-hidden.test.ts).

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound,
  permanentRedirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

const readCompendiumEntry = vi.fn();
const readCompendiumEntryAsCurator = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  readCompendiumEntry,
  readCompendiumEntryAsCurator,
  readCompendiumReview: async () => null,
  getIngredient: async () => ({ shown: false }),
}));

const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));
const viewerIfSignedIn = vi.fn(async () => null);
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));
vi.mock('@/app/entry-values', () => ({ entryValues: async () => ({}) }));
vi.mock('@/app/plus-covens', () => ({ covensHolding: async () => [] }));
vi.mock('@/app/(public)/compendium/ingredients/[slug]/cupboard', () => ({
  publicCupboardOf: async () => undefined,
}));
const shown = vi.fn();
vi.mock('@/components/IngredientEntry', () => ({
  default: (props: { detail: { entry: { name: string } }; hiddenFromPublic?: boolean }) => {
    shown(props);
    return (
      <>
        <p>{props.detail.entry.name}</p>
        {props.hiddenFromPublic && (
          <p>Hidden in the Compendium. Only curators and admins can see this page.</p>
        )}
      </>
    );
  },
}));

const hiddenEntry = {
  kind: 'entry' as const,
  detail: {
    entry: { id: 'entry-1', name: 'Testwort', slug: 'testwort', shown: false },
    folkNames: [],
  },
  movedAway: null,
};

async function open() {
  const { default: Page } = await import('@/app/(public)/compendium/ingredients/[slug]/page');
  return Page({
    params: Promise.resolve({ slug: 'testwort' }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Why the 404 means something: the entry exists, and the public read does not return it.
  readCompendiumEntry.mockRejectedValue(new NotFound('No such entry'));
  readCompendiumEntryAsCurator.mockResolvedValue(hiddenEntry);
});

describe('the public entry page for a hidden entry', () => {
  it.each(['curator', 'admin'])('shows it to a %s', async (role) => {
    getSession.mockResolvedValue({ userId: 'u', role });
    render(await open());
    expect(readCompendiumEntryAsCurator).toHaveBeenCalled();
    expect(shown).toHaveBeenCalled();
    expect(
      screen.getByText('Hidden in the Compendium. Only curators and admins can see this page.'),
    ).toBeInTheDocument();
  });

  it('draws no notice for a shown entry', async () => {
    readCompendiumEntry.mockResolvedValue({
      ...hiddenEntry,
      detail: { ...hiddenEntry.detail, entry: { ...hiddenEntry.detail.entry, shown: true } },
    });
    render(await open());
    expect(screen.queryByText(/Only curators and admins/)).not.toBeInTheDocument();
  });

  it.each([
    ['a signed-out visitor', null],
    ['a member', { userId: 'u', role: 'user' }],
  ])('answers 404 for %s, without the curator read', async (_who, session) => {
    getSession.mockResolvedValue(session);
    await expect(open()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(readCompendiumEntryAsCurator).not.toHaveBeenCalled();
  });

  it('never asks for a session when the public read finds the entry', async () => {
    readCompendiumEntry.mockResolvedValue({ ...hiddenEntry, detail: { ...hiddenEntry.detail } });
    render(await open());
    expect(getSession).not.toHaveBeenCalled();
  });
});
