import { cleanup, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { entryDetail } from '../../../support/entry-detail';
import { getSession } from '../../../support/request-session';

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
const permanentRedirect = vi.fn((_to: string) => {
  throw new Error('redirected');
});
vi.mock('next/navigation', async () => ({
  ...(await import('../../../support/next-navigation')),
  notFound,
  permanentRedirect,
}));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));

const readCompendiumEntry = vi.fn();
const readCompendiumReview = vi.fn();
const getIngredient = vi.fn();
// The sourcing score's read, for a curator or keeper; its tests are slug-page.test.tsx's.
const readSourcingScore = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  readCompendiumEntry,
  readCompendiumReview,
  getIngredient,
  readSourcingScore,
}));
const SESSION = { userId: 'user-fixture' };
vi.mock('@/lib/request-session', () => import('../../../support/request-session'));

vi.mock('@/components/IngredientForm', () => ({
  default: ({ review }: { review?: { reviewed: boolean } }) => (
    <form aria-label="Fixture Form">
      {review && (
        <input
          type="checkbox"
          role="switch"
          aria-label="Reviewed"
          defaultChecked={review.reviewed}
        />
      )}
    </form>
  ),
}));

const entryValues = vi.fn();
vi.mock('@/app/entry-values', () => ({ entryValues }));

const { default: Page, generateMetadata } =
  await import('@/app/(public)/compendium/ingredients/[slug]/page');

const SLUG = 'testwort-fixtura-testalis';
const params = (slug = SLUG, search: Record<string, string> = {}) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve(search),
});
const shellOf = (canCurate: boolean) => ({
  viewer: { name: 'Fixture Curator', canCurate },
  workspaces: [],
});
const entryRead = (movedAway: { name: string; slug: string } | null = null) => ({
  kind: 'entry' as const,
  detail: entryDetail(),
  movedAway,
});

const show = async (search: Record<string, string> = {}) =>
  render(await Page(params(SLUG, search)));
const dialog = () => screen.queryByRole('dialog', { name: /Edit Compendium Entry/ });
const edits = () => screen.queryAllByRole('link', { name: /edit/i });

beforeEach(() => {
  vi.clearAllMocks();
  viewerIfSignedIn.mockResolvedValue(null);
  readCompendiumEntry.mockResolvedValue(entryRead());
  entryValues.mockResolvedValue(EMPTY_VALUES);
  getSession.mockResolvedValue(SESSION);
  readCompendiumReview.mockResolvedValue(null);
  readSourcingScore.mockResolvedValue(undefined);
  getIngredient.mockResolvedValue({ shown: true });
});

describe('the compendium entry page', () => {
  it('reads the entry named by the address', async () => {
    await show();

    expect(readCompendiumEntry).toHaveBeenCalledWith(SLUG);
  });

  it('carries the entry as structured data in the page itself', async () => {
    const { container } = await show();

    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? '{}');
    expect(data['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
      'DefinedTerm',
      'BreadcrumbList',
    ]);
  });

  it('answers 404 when there is no such entry', async () => {
    readCompendiumEntry.mockRejectedValue(new NotFound('ingredient'));

    await expect(Page(params('nothing-here'))).rejects.toThrow('not-found');
    expect(readCompendiumEntry).toHaveBeenCalledWith('nothing-here');
    expect(notFound).toHaveBeenCalledOnce();
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('answers 308 to the current address when the slug has moved', async () => {
    readCompendiumEntry.mockResolvedValue({ kind: 'moved', slug: 'testwort-renamed' });

    await expect(Page(params('testwort-old'))).rejects.toThrow('redirected');
    expect(permanentRedirect).toHaveBeenCalledOnce();
    expect(permanentRedirect).toHaveBeenCalledWith('/compendium/ingredients/testwort-renamed');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('rethrows a failure that is not a missing entry', async () => {
    readCompendiumEntry.mockRejectedValue(new Error('database down'));

    await expect(Page(params())).rejects.toThrow('database down');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('offers a signed-out visitor no Edit', async () => {
    await show();

    expect(viewerIfSignedIn).toHaveBeenCalled();
    expect(edits()).toHaveLength(0);
  });

  it('offers a signed-in viewer who cannot curate no Edit', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(false));
    await show();

    expect(edits()).toHaveLength(0);
  });

  it('offers a curator Edit on this very page, with no dialog until it is asked for', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    await show();

    const [link] = edits();
    const target = new URL(link!.getAttribute('href')!, 'http://fixture.test');
    expect(edits()).toHaveLength(1);
    expect(target.pathname).toBe(`/compendium/ingredients/${SLUG}`);
    expect(target.searchParams.has('edit')).toBe(true);
    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });

  it('opens the edit dialog on a curator who asks for it with a bare ?edit', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    await show({ edit: '' });

    expect(entryValues).toHaveBeenCalledWith(expect.objectContaining({ slug: SLUG }), null);
    expect(dialog()).toBeInTheDocument();
  });

  it.each([
    ['a signed-out visitor', null],
    ['a signed-in viewer who cannot curate', shellOf(false)],
  ])('opens no dialog, and reads nothing for it, for %s who asks for one', async (_who, shell) => {
    viewerIfSignedIn.mockResolvedValue(shell);
    await show({ edit: '' });

    expect(dialog()).not.toBeInTheDocument();
    expect(entryValues).not.toHaveBeenCalled();
  });
});

// The Reviewed switch as the last row of the page's head, for a curator or
// admin. Its read is per viewer and made for them alone, so a visitor's page is the cached one.
describe('the compendium entry page, with the review switch', () => {
  const reviewSwitches = () => screen.queryAllByRole('switch', { name: 'Reviewed' });
  const REVIEWED = { reviewedAt: new Date('2026-10-01T09:30:00.000Z') };

  it('shows a curator the switch as the mark stands, read once with their session', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    readCompendiumReview.mockResolvedValue(REVIEWED);
    await show();

    expect(readCompendiumReview).toHaveBeenCalledExactlyOnceWith(SESSION, entryDetail().entry.id);
    const [mark] = reviewSwitches();
    expect(reviewSwitches()).toHaveLength(1);
    expect(mark).toBeChecked();
  });

  it('draws it last in the head, and gives the edit form the same answer', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    readCompendiumReview.mockResolvedValue(REVIEWED);
    const { container } = await show({ edit: '' });

    const head = container.querySelector('.ingredient-entry__head')!;
    const inHead = within(head as HTMLElement).getByRole('switch', { name: 'Reviewed' });
    expect(head.lastElementChild!.contains(inHead)).toBe(true);
    expect(within(dialog()!).getByRole('switch', { name: 'Reviewed' })).toBeChecked();
    expect(readCompendiumReview).toHaveBeenCalledOnce();
  });

  // The preconditions: the same address shows the switch to a curator (asserted first).
  it.each([
    ['a signed-out visitor', null],
    ['a signed-in viewer who cannot curate', shellOf(false)],
  ])('shows %s no switch and makes no review read', async (_who, shell) => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    await show({ edit: '' });
    expect(reviewSwitches()).toHaveLength(2);
    cleanup();
    readCompendiumReview.mockClear();
    getSession.mockClear();

    viewerIfSignedIn.mockResolvedValue(shell);
    await show({ edit: '' });

    expect(reviewSwitches()).toHaveLength(0);
    expect(readCompendiumReview).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('shows nothing, and does not fail, when the read refuses', async () => {
    viewerIfSignedIn.mockResolvedValue(shellOf(true));
    readCompendiumReview.mockRejectedValue(new Forbidden('curators only'));
    await show();

    expect(reviewSwitches()).toHaveLength(0);
  });
});

describe('the compendium entry page title', () => {
  it('names the absolute public address as canonical, and describes the entry', async () => {
    // The title's formula is tests/components/IngredientEntry/page-title.test.ts's.
    const result = await generateMetadata(params());
    // The canonical is the absolute public address, with no query string.
    expect(result.alternates?.canonical).toBe(
      `https://sorrelandsalt.com/compendium/ingredients/${entryDetail().entry.slug}`,
    );
    expect(result.description).toBeTruthy();
    // A shown entry is a real page, so nothing keeps it out of search results.
    expect(entryDetail().entry.shown).toBe(true);
    expect(result.robots).toBeUndefined();
  });

  it('describes two entries that share a label differently', async () => {
    const base = entryDetail();
    readCompendiumEntry.mockResolvedValue({
      kind: 'entry',
      detail: {
        ...base,
        entry: { ...base.entry, description: null, canonicalName: 'Fixtura altera' },
      },
      movedAway: null,
    });
    const other = await generateMetadata(params());
    readCompendiumEntry.mockResolvedValue({
      kind: 'entry',
      detail: {
        ...base,
        entry: { ...base.entry, description: null, canonicalName: 'Fixtura tertia' },
      },
      movedAway: null,
    });
    expect((await generateMetadata(params())).description).not.toBe(other.description);
  });

  it('is empty for an address that renders no page', async () => {
    readCompendiumEntry.mockResolvedValue({ kind: 'moved', slug: 'testwort-renamed' });
    expect(await generateMetadata(params())).toEqual({});

    readCompendiumEntry.mockRejectedValue(new NotFound('ingredient'));
    expect(await generateMetadata(params())).toEqual({});
  });
});
