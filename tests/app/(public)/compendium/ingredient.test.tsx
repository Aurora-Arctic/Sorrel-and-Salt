import { cleanup, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { entryDetail } from '../../../support/entry-detail';

// The public entry page, with the cached read and the viewer mocked. It proves which outcome of the read becomes which response, who is offered Edit,
// and that the edit dialog's values are read only for a curator and only with `?edit`.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
const permanentRedirect = vi.fn((_to: string) => {
  throw new Error('redirected');
});
// The edit dialog is a client part, which asks for the router.
const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ notFound, permanentRedirect, useRouter: () => router }));

const viewerIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn }));

const readCompendiumEntry = vi.fn();
// The review switch's read (M14.8), per viewer, made for a curator or admin only.
const readCompendiumReview = vi.fn();
vi.mock('@/modules/ingredients', () => ({ readCompendiumEntry, readCompendiumReview }));
const SESSION = { userId: 'user-fixture' };
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

// The form is its own tests'; here only that the dialog holds one.
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

// M14.8: the Reviewed switch as the last row of the page's head, for a curator or
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
