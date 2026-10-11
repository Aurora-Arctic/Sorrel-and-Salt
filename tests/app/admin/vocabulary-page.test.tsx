import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// `/admin/planets` and `/admin/zodiac-signs` (MB.95), one page shape: the
// guard, one page of the vocabulary under the address's query, and the modal
// its address opens — `?new` empty, `?edit=` a value by slug. The shape runs
// on planets; the signs' page proves only what it changes, its vocabulary and
// its path. The guard and the services are mocked: what they decide is
// tests/lib/request-session.test.ts's and tests/modules/vocabulary's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listAstrologyValues = vi.fn();
const countAstrologyValues = vi.fn();
const getAstrologyValueBySlug = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listAstrologyValues,
  countAstrologyValues,
  getAstrologyValueBySlug,
}));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// jsdom implements no modal dialog; stood in for as a browser behaves.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const { default: AdminPlanetsPage } = await import('@/app/admin/planets/page');
const { default: AdminZodiacSignsPage } = await import('@/app/admin/zodiac-signs/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const STAR = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Star',
  slug: 'testwort-star',
  description: 'An invented value',
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

/** A full page and one more, so the pager links both ways. */
const fullPage = () =>
  Array.from({ length: 26 }, (_, index) =>
    entry({
      ...STAR,
      id: `${STAR.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
      name: `Testwort Star ${index}`,
      slug: `testwort-star-${index}`,
    }),
  );

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listAstrologyValues.mockReset();
  listAstrologyValues.mockResolvedValue([entry(STAR)]);
  countAstrologyValues.mockReset();
  countAstrologyValues.mockResolvedValue({ totalCount: 1, countBefore: 0 });
  getAstrologyValueBySlug.mockReset();
  getAstrologyValueBySlug.mockResolvedValue(STAR);
  router.replace.mockReset();
  router.refresh.mockReset();
});

type VocabularyPageRoute = typeof AdminPlanetsPage;

async function renderRoute(Page: VocabularyPageRoute, params: Record<string, string> = {}) {
  const page = await Page({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

describe('the /admin/planets page', () => {
  const vocabulary = 'planets';
  const path = '/admin/planets';
  const noun = 'planet';
  const label = 'Planet';
  const renderPage = (params?: Record<string, string>) => renderRoute(AdminPlanetsPage, params);

  const lastRequest = (): PageRequest => listAstrologyValues.mock.lastCall?.[2] as PageRequest;

  /** The vocabulary and filter the list and its count were last read under, which must agree. */
  function lastRead(): unknown[] {
    const listed = listAstrologyValues.mock.lastCall?.slice(0, 2) ?? [];
    expect(countAstrologyValues.mock.lastCall?.slice(0, 2)).toEqual(listed);
    return listed;
  }

  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ edit: 'testwort-star' })).rejects.toThrow('forbidden');
    expect(listAstrologyValues).not.toHaveBeenCalled();
    expect(getAstrologyValueBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25 of the planets, and no modal', async () => {
    await renderPage();

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastRead()).toEqual([vocabulary, { query: undefined }]);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Testwort Star' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Testwort Star' })).toHaveAttribute(
      'href',
      `${path}?edit=testwort-star`,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Testwort Star'], id: STAR.id });

    await renderPage({ after });
    expect(lastRequest().after).toEqual({ key: ['Testwort Star'], id: STAR.id });

    await renderPage({ after: 'not-a-cursor' });
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
  });

  it(`links Add ${label} to the empty modal over this page`, async () => {
    await renderPage({ query: 'star' });

    expect(screen.getByRole('link', { name: `Add ${label}` })).toHaveAttribute(
      'href',
      `${path}?query=star&new`,
    );
  });

  it('says which page of how many, the query kept on every link', async () => {
    listAstrologyValues.mockResolvedValue(fullPage());
    countAstrologyValues.mockResolvedValue({ totalCount: 63, countBefore: 25 });
    const after = encodeCursor({ key: ['Testwort Star'], id: STAR.id });

    await renderPage({ query: '  star ', after });

    expect(lastRead()).toEqual([vocabulary, { query: 'star' }]);
    expect(countAstrologyValues).toHaveBeenCalledWith(
      vocabulary,
      { query: 'star' },
      { key: ['Testwort Star 0'], id: expect.any(String) },
    );
    const here = `${path}?query=star&after=${encodeURIComponent(after)}`;
    expect(screen.getByRole('link', { name: 'Edit Testwort Star 0' })).toHaveAttribute(
      'href',
      `${here}&edit=testwort-star-0`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(pages).toHaveTextContent('Page 2 of 3');
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      new RegExp(`^${path}\\?query=star&before=[^&]+$`),
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      new RegExp(`^${path}\\?query=star&after=[^&]+$`),
    );
  });

  // A native submit sends the field, blank or not.
  it('reads a blank ?query= as no filter', async () => {
    await renderPage({ query: '   ' });

    expect(lastRead()).toEqual([vocabulary, { query: undefined }]);
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('');
  });

  it('opens the empty modal on ?new', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: `Add ${label}` });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(within(dialog).getByRole('button', { name: `Save ${label}` })).toBeDisabled();
    expect(getAstrologyValueBySlug).not.toHaveBeenCalled();
  });

  it("opens a value's modal on ?edit=, filled from the value", async () => {
    await renderPage({ edit: 'testwort-star' });

    expect(getAstrologyValueBySlug).toHaveBeenCalledWith(vocabulary, 'testwort-star');
    const dialog = screen.getByRole('dialog', { name: `Edit ${label}` });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Testwort Star');
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue(
      'An invented value',
    );
    expect(within(dialog).getByRole('button', { name: `Delete ${label}` })).toBeInTheDocument();
  });

  it('says so, and opens nothing, when ?edit= names no value', async () => {
    getAstrologyValueBySlug.mockRejectedValue(new NotFound(`No such ${noun}`));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getAstrologyValueBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'testwort-star' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    await renderPage({ query: 'star', edit: 'testwort-star' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(`${path}?query=star`);
    expect(router.refresh).toHaveBeenCalled();
  });
});

describe('the /admin/zodiac-signs page', () => {
  it('lists the first page of 25 of the signs, linking each to its modal on its own path', async () => {
    await renderRoute(AdminZodiacSignsPage);

    expect(listAstrologyValues).toHaveBeenCalledWith(
      'zodiacSigns',
      { query: undefined },
      { limit: 26, inverted: false },
    );
    expect(countAstrologyValues.mock.lastCall?.slice(0, 2)).toEqual([
      'zodiacSigns',
      { query: undefined },
    ]);
    expect(screen.getByRole('link', { name: 'Edit Testwort Star' })).toHaveAttribute(
      'href',
      '/admin/zodiac-signs?edit=testwort-star',
    );
  });
});
