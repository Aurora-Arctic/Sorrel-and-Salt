import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/categories` page (M5.6, MB.178): the guard, one page of the
// vocabulary under the address's filter and the groups, and the modal its
// address opens — `?new` empty, `?edit=` a category by slug. The guard and the services are mocked: what they
// decide is tests/lib/request-session.test.ts's and
// tests/modules/vocabulary/services/categories.test.ts's. This file holds the
// page's half — the address read into service calls, the guard, NotFound
// against any other error, and what the page builds for the list and the
// modal; how the list and the form behave given those props is their own
// tests' (claude-docs/testing/layer-ownership.md, "The owning layer").

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listCategories = vi.fn();
const listCategoryGroups = vi.fn();
const getCategoryBySlug = vi.fn();
const countCategories = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listCategories,
  listCategoryGroups,
  getCategoryBySlug,
  countCategories,
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

const { default: AdminCategoriesPage } = await import('@/app/admin/categories/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Healing', slug: 'fixture-healing' },
  {
    id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
    name: 'Fixture Protection',
    slug: 'fixture-protection',
  },
];

const TESTCRAFT = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testcraft',
  slug: 'testcraft',
  description: 'An invented category',
  groupId: GROUPS[1].id,
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

async function renderPage(params: Record<string, string> = {}) {
  const page = await AdminCategoriesPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const lastRequest = (): PageRequest => listCategories.mock.lastCall?.[1] as PageRequest;

/** The filter the list and its count were last read under, which must agree. */
function lastFilter(): unknown {
  const listed: unknown = listCategories.mock.lastCall?.[0];
  expect(countCategories.mock.lastCall?.[0]).toEqual(listed);
  return listed;
}

const NO_FILTER = { query: undefined, groupId: undefined };

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listCategories.mockReset();
  listCategories.mockResolvedValue([entry(TESTCRAFT)]);
  listCategoryGroups.mockReset();
  listCategoryGroups.mockResolvedValue(GROUPS.map(entry));
  getCategoryBySlug.mockReset();
  getCategoryBySlug.mockResolvedValue(TESTCRAFT);
  countCategories.mockReset();
  countCategories.mockResolvedValue({ totalCount: 1, countBefore: 0 });
});

describe('the /admin/categories page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listCategories).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each category with its group, and no modal', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument();
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastFilter()).toEqual(NO_FILTER);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Fixture Protection' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id });

    await renderPage({ after });
    expect(lastRequest().after).toEqual({ key: ['Testcraft'], id: TESTCRAFT.id });

    await renderPage({ after: 'not-a-cursor' });
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
  });

  it('puts Add Category on the line of the heading, linking the empty modal over this page', async () => {
    const after = encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id });
    await renderPage({ after });

    const heading = screen.getByRole('heading', { level: 1, name: 'Categories' });
    const add = screen.getByRole('link', { name: 'Add Category' });
    expect(add.parentElement).toBe(heading.parentElement);
    expect(add).toHaveAttribute('href', `/admin/categories?after=${encodeURIComponent(after)}&new`);
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    listCategories.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) =>
        entry({
          ...TESTCRAFT,
          id: `${TESTCRAFT.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
          name: `Testcraft ${index}`,
        }),
      ),
    );
    countCategories.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id }) });

    expect(countCategories).toHaveBeenCalledWith(NO_FILTER, {
      key: ['Testcraft 0'],
      id: expect.any(String),
    });
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 2 of 3');
  });

  it('opens the empty modal on ?new', async () => {
    await renderPage({ new: '' });

    expect(screen.getByRole('dialog', { name: 'Add Category' })).toBeInTheDocument();
    expect(getCategoryBySlug).not.toHaveBeenCalled();
  });

  it("opens a category's modal on ?edit=, filled from the category", async () => {
    await renderPage({ edit: 'testcraft' });

    expect(getCategoryBySlug).toHaveBeenCalledWith('testcraft');
    const dialog = screen.getByRole('dialog', { name: 'Edit Category' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Testcraft');
    expect(within(dialog).getByRole('combobox', { name: 'Group' })).toHaveTextContent(
      'Fixture Protection',
    );
  });

  it('says so, and opens nothing, when ?edit= names no category', async () => {
    getCategoryBySlug.mockRejectedValue(new NotFound('No such category'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No category has that address — it may have been renamed or deleted.',
    );
  });

  it('lets any other failure reading ?edit= through', async () => {
    getCategoryBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'testcraft' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over', async () => {
    const after = encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id });
    await renderPage({ after, edit: 'testcraft' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(
      `/admin/categories?after=${encodeURIComponent(after)}`,
    );
  });

  it('closes the modal back to the filtered page it opened over', async () => {
    await renderPage({ query: 'test', group: 'fixture-healing', edit: 'testcraft' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(
      '/admin/categories?query=test&group=fixture-healing',
    );
  });
});

// MB.178: `?query=` and `?group=<slug>` narrow the list, as the user list's
// filter does (MB.52), and every link the page builds keeps them.
describe('the /admin/categories filter', () => {
  /** A full page and one more, so the pager links both ways. */
  const fullPage = () =>
    Array.from({ length: 26 }, (_, index) =>
      entry({
        ...TESTCRAFT,
        id: `${TESTCRAFT.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
        name: `Testcraft ${index}`,
        slug: `testcraft-${index}`,
      }),
    );

  it('reads ?query=, trimmed, into the filter of the list and its count', async () => {
    await renderPage({ query: '  test craft ' });

    expect(lastFilter()).toEqual({ query: 'test craft', groupId: undefined });
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('test craft');
  });

  // A native submit sends both fields, blank or not.
  it('reads a blank ?query= and ?group= as no filter', async () => {
    await renderPage({ query: '   ', group: '' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
  });

  it('reads ?group= as the id of the group at that slug', async () => {
    await renderPage({ group: 'fixture-protection' });

    expect(lastFilter()).toEqual({ query: undefined, groupId: GROUPS[1].id });
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('fixture-protection');
  });

  // As a hand-edited cursor gets the first page.
  it('ignores a ?group= no group holds, and drops it from every link', async () => {
    listCategories.mockResolvedValue(fullPage());

    await renderPage({ query: 'test', group: 'no-such-group' });

    expect(lastFilter()).toEqual({ query: 'test', groupId: undefined });
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Add Category' })).toHaveAttribute(
      'href',
      '/admin/categories?query=test&new',
    );
    expect(screen.getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/categories\?query=test&after=[^&]+$/,
    );
  });

  it('keeps the filter on the pager, each Edit and Add Category', async () => {
    const after = encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id });
    listCategories.mockResolvedValue(fullPage());
    countCategories.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ query: 'test', group: 'fixture-healing', after });

    const here = `/admin/categories?query=test&group=fixture-healing&after=${encodeURIComponent(after)}`;
    expect(screen.getByRole('link', { name: 'Add Category' })).toHaveAttribute(
      'href',
      `${here}&new`,
    );
    expect(screen.getByRole('link', { name: 'Edit Testcraft 0' })).toHaveAttribute(
      'href',
      `${here}&edit=testcraft-0`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/categories\?query=test&group=fixture-healing&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/categories\?query=test&group=fixture-healing&after=[^&]+$/,
    );
  });

  // What the list says of it is the list's own test's.
  it('counts a page the filter leaves empty from no row', async () => {
    listCategories.mockResolvedValue([]);
    countCategories.mockResolvedValue({ totalCount: 0, countBefore: undefined });

    await renderPage({ query: 'nothing' });

    expect(countCategories).toHaveBeenCalledWith(
      { query: 'nothing', groupId: undefined },
      undefined,
    );
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });
});
