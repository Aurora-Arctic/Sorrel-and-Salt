import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/deities` page (MB.132): the guard, one page of the curated deity
// vocabulary under the address's filter and the traditions, and the modal its
// address opens — `?new` empty, `?edit=` a deity by slug. The guard and the services are mocked: what
// they decide is tests/lib/request-session.test.ts's and
// tests/modules/vocabulary's. This file holds the page's half — the address
// read into service calls, the guard, NotFound against any other error, and
// what the page builds for the list and the modal; how the list and the form
// behave given those props is their own tests'
// (claude-docs/testing/layer-ownership.md, "The owning layer").

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listDeities = vi.fn();
const countDeities = vi.fn();
const listDeityTraditions = vi.fn();
const getDeityBySlug = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listDeities,
  countDeities,
  listDeityTraditions,
  getDeityBySlug,
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

const { default: AdminDeitiesPage } = await import('@/app/admin/deities/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const TRADITIONS = [
  {
    id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21',
    name: 'Fixtural',
    slug: 'fixtural',
    description: 'An invented tradition',
  },
  {
    id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
    name: 'Mockish',
    slug: 'mockish',
    description: 'Another',
  },
];

const TESTRA = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testra',
  slug: 'testra-mockish',
  description: 'An invented god',
  traditionId: TRADITIONS[1].id,
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

async function renderPage(params: Record<string, string> = {}) {
  const page = await AdminDeitiesPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const lastRequest = (): PageRequest => listDeities.mock.lastCall?.[1] as PageRequest;

/** The filter the list and its count were last read under, which must agree. */
function lastFilter(): unknown {
  const listed: unknown = listDeities.mock.lastCall?.[0];
  expect(countDeities.mock.lastCall?.[0]).toEqual(listed);
  return listed;
}

const NO_FILTER = { query: undefined, traditionId: undefined };

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listDeities.mockReset();
  listDeities.mockResolvedValue([entry(TESTRA)]);
  countDeities.mockReset();
  countDeities.mockResolvedValue({ totalCount: 1, countBefore: 0 });
  listDeityTraditions.mockReset();
  listDeityTraditions.mockResolvedValue(TRADITIONS.map(entry));
  getDeityBySlug.mockReset();
  getDeityBySlug.mockResolvedValue(TESTRA);
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('the /admin/deities page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ new: '' })).rejects.toThrow('forbidden');
    expect(listDeities).not.toHaveBeenCalled();
    expect(listDeityTraditions).not.toHaveBeenCalled();
    expect(getDeityBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each deity with its tradition, and no modal', async () => {
    await renderPage();

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastFilter()).toEqual(NO_FILTER);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Testra' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Mockish' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Testra' })).toHaveAttribute(
      'href',
      '/admin/deities?edit=testra-mockish',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads every tradition on one page of the maximum', async () => {
    await renderPage();

    expect(listDeityTraditions).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Testra'], id: TESTRA.id });

    await renderPage({ after });
    expect(lastRequest().after).toEqual({ key: ['Testra'], id: TESTRA.id });

    await renderPage({ after: 'not-a-cursor' });
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    listDeities.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) =>
        entry({
          ...TESTRA,
          id: `${TESTRA.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
          name: `Testra ${index}`,
          slug: `testra-${index}-mockish`,
        }),
      ),
    );
    countDeities.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Testra'], id: TESTRA.id }) });

    expect(countDeities).toHaveBeenCalledWith(NO_FILTER, {
      key: ['Testra 0'],
      id: expect.any(String),
    });
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(pages).toHaveTextContent('Page 2 of 3');
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/deities\?before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/deities\?after=[^&]+$/,
    );
  });

  it('opens the empty modal on ?new, offering every tradition', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Deity' });
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Tradition' }));
    expect(
      within(screen.getByRole('listbox', { name: 'Tradition choices' }))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Fixtural', 'Mockish']);
    expect(getDeityBySlug).not.toHaveBeenCalled();
  });

  it("opens a deity's modal on ?edit=, filled from the deity", async () => {
    await renderPage({ edit: 'testra-mockish' });

    expect(getDeityBySlug).toHaveBeenCalledWith('testra-mockish');
    const dialog = screen.getByRole('dialog', { name: 'Edit Deity' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Testra');
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue(
      'An invented god',
    );
    expect(within(dialog).getByRole('combobox', { name: 'Tradition' })).toHaveTextContent(
      'Mockish',
    );
  });

  it('says so, and opens nothing, when ?edit= names no deity', async () => {
    getDeityBySlug.mockRejectedValue(new NotFound('No such deity'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getDeityBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'testra' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    const after = encodeCursor({ key: ['Testra'], id: TESTRA.id });
    await renderPage({ after, edit: 'testra-mockish' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(
      `/admin/deities?after=${encodeURIComponent(after)}`,
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it('closes the modal back to the filtered page it opened over', async () => {
    await renderPage({
      query: 'tra',
      tradition: 'mockish',
      edit: 'testra-mockish',
    });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith('/admin/deities?query=tra&tradition=mockish');
  });
});

// `?query=` and `?tradition=<slug>` narrow the list, as the forms' filter
// does (MB.178), and every link the page builds keeps them.
describe('the /admin/deities filter', () => {
  /** A full page and one more, so the pager links both ways. */
  const fullPage = () =>
    Array.from({ length: 26 }, (_, index) =>
      entry({
        ...TESTRA,
        id: `${TESTRA.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
        name: `Testra ${index}`,
        slug: `testra-${index}-mockish`,
      }),
    );

  it('reads ?query=, trimmed, into the filter of the list and its count', async () => {
    await renderPage({ query: '  testra mo ' });

    expect(lastFilter()).toEqual({ query: 'testra mo', traditionId: undefined });
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('testra mo');
  });

  // A native submit sends both fields, blank or not.
  it('reads a blank ?query= and ?tradition= as no filter', async () => {
    await renderPage({ query: '   ', tradition: '' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('combobox', { name: 'Tradition' })).toHaveValue('');
  });

  it('reads ?tradition= as the id of the tradition at that slug', async () => {
    await renderPage({ tradition: 'mockish' });

    expect(lastFilter()).toEqual({ query: undefined, traditionId: TRADITIONS[1].id });
    expect(screen.getByRole('combobox', { name: 'Tradition' })).toHaveValue('mockish');
  });

  // As a hand-edited cursor gets the first page.
  it('ignores a ?tradition= no tradition holds, and drops it from every link', async () => {
    listDeities.mockResolvedValue(fullPage());

    await renderPage({ query: 'tra', tradition: 'no-such-tradition' });

    expect(lastFilter()).toEqual({ query: 'tra', traditionId: undefined });
    expect(screen.getByRole('combobox', { name: 'Tradition' })).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Add Deity' })).toHaveAttribute(
      'href',
      '/admin/deities?query=tra&new',
    );
    expect(screen.getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/deities\?query=tra&after=[^&]+$/,
    );
  });

  it('keeps the filter on the pager, each Edit and Add Deity', async () => {
    const after = encodeCursor({ key: ['Testra'], id: TESTRA.id });
    listDeities.mockResolvedValue(fullPage());
    countDeities.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ query: 'tra', tradition: 'mockish', after });

    const here = `/admin/deities?query=tra&tradition=mockish&after=${encodeURIComponent(after)}`;
    expect(screen.getByRole('link', { name: 'Add Deity' })).toHaveAttribute('href', `${here}&new`);
    expect(screen.getByRole('link', { name: 'Edit Testra 0' })).toHaveAttribute(
      'href',
      `${here}&edit=testra-0-mockish`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/deities\?query=tra&tradition=mockish&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/deities\?query=tra&tradition=mockish&after=[^&]+$/,
    );
  });
});
