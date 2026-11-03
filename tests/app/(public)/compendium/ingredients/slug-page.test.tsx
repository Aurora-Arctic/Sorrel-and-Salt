import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';

// The public entry page's reach: the cached sessionless read first, and a session asked for only when it finds
// nothing. A curator or keeper then gets a hidden entry from the uncached read; anyone else gets the 404. What the
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
const readSourcingScore = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  readCompendiumEntry,
  readCompendiumEntryAsCurator,
  readSourcingScore,
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
  default: (props: {
    detail: { entry: { name: string } };
    hiddenFromPublic?: boolean;
    edit?: { sourcing?: unknown };
  }) => {
    shown(props);
    return (
      <>
        <p>{props.detail.entry.name}</p>
        {props.hiddenFromPublic && (
          <p>Hidden in the Compendium. Only curators and keepers can see this page.</p>
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
      screen.getByText('Hidden in the Compendium. Only curators and keepers can see this page.'),
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

describe("the public entry page's sourcing score", () => {
  const score = { score: 38, facts: [] };
  const viewer = (canCurate: boolean) => ({ viewer: { canCurate }, workspaces: [] });

  // The entry is public and found by the cached read, so the score's absence below is the page's choice.
  beforeEach(() => {
    readCompendiumEntry.mockResolvedValue({
      ...hiddenEntry,
      detail: { ...hiddenEntry.detail, entry: { ...hiddenEntry.detail.entry, shown: true } },
    });
    readSourcingScore.mockResolvedValue(score);
  });

  it.each(['curator', 'admin'])('hands a %s the score, read with their session', async (role) => {
    const session = { userId: 'u', role };
    getSession.mockResolvedValue(session);
    viewerIfSignedIn.mockResolvedValue(viewer(true) as never);
    render(await open());
    expect(readSourcingScore).toHaveBeenCalledWith(session, 'entry-1');
    expect(shown.mock.calls[0]?.[0].edit?.sourcing).toEqual(score);
  });

  it.each([
    ['a signed-out visitor', null, null],
    ['a viewer, member or owner', { userId: 'u', role: 'user' }, viewer(false)],
  ])('gives %s no score and does not read one', async (_who, session, shell) => {
    getSession.mockResolvedValue(session);
    viewerIfSignedIn.mockResolvedValue(shell as never);
    render(await open());
    expect(readSourcingScore).not.toHaveBeenCalled();
    expect(shown.mock.calls[0]?.[0].edit).toBeUndefined();
  });

  it('leaves the cached public read without a session or a score', async () => {
    getSession.mockResolvedValue(null);
    render(await open());
    expect(readCompendiumEntry).toHaveBeenCalledWith('testwort');
    expect(JSON.stringify(readCompendiumEntry.mock.results[0]?.value)).not.toContain('sourcing');
  });
});

describe("the public entry page's way back", () => {
  // Regression: an entry opened from the admin compendium list went back to the public compendium.
  it('returns to the public compendium, or to the admin compendium list under its own label', async () => {
    readCompendiumEntry.mockResolvedValue({
      ...hiddenEntry,
      detail: { ...hiddenEntry.detail, entry: { ...hiddenEntry.detail.entry, shown: true } },
    });
    render(await open());
    const props = shown.mock.calls[0]?.[0] as
      { back?: { href: string; also?: readonly { path: string; label: string }[] } } | undefined;
    const back = props?.back;
    expect(back?.href).toBe('/compendium');
    expect(back?.also).toEqual([{ path: '/curator/compendium', label: 'Curator Compendium' }]);
  });
});
