import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/forms` page (M5.6a): the guard, one page of the curated form
// vocabulary under the address's filter and the form groups, and the modal its
// address opens — `?new` empty, `?edit=` a form by slug. The guard and the services are mocked: what
// they decide is tests/lib/request-session.test.ts's and
// tests/modules/vocabulary's. This file holds the page's half — the address
// read into service calls, the guard, NotFound against any other error, and
// what the page builds for the list and the modal; how the list and the form
// behave given those props is their own tests'
// (claude-docs/testing/layer-ownership.md, "The owning layer").

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listIngredientFormValues = vi.fn();
const countIngredientFormValues = vi.fn();
const listIngredientFormGroups = vi.fn();
const getIngredientFormValueBySlug = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listIngredientFormValues,
  countIngredientFormValues,
  listIngredientFormGroups,
  getIngredientFormValueBySlug,
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

const { default: AdminFormsPage } = await import('@/app/admin/forms/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const GROUPS = [
  {
    id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21',
    name: 'Fixture Mineral',
    slug: 'fixture-mineral',
    description: 'An invented group',
  },
  {
    id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
    name: 'Fixture Substance',
    slug: 'fixture-substance',
    description: 'Another',
  },
];

const SHARD = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Shard',
  slug: 'testwort-shard-fixture-substance',
  description: 'An invented form',
  groupId: GROUPS[1].id,
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

async function renderPage(params: Record<string, string> = {}) {
  const page = await AdminFormsPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

const lastRequest = (): PageRequest => listIngredientFormValues.mock.lastCall?.[1] as PageRequest;

/** The filter the list and its count were last read under, which must agree. */
function lastFilter(): unknown {
  const listed: unknown = listIngredientFormValues.mock.lastCall?.[0];
  expect(countIngredientFormValues.mock.lastCall?.[0]).toEqual(listed);
  return listed;
}

const NO_FILTER = { query: undefined, groupId: undefined };

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listIngredientFormValues.mockReset();
  listIngredientFormValues.mockResolvedValue([entry(SHARD)]);
  countIngredientFormValues.mockReset();
  countIngredientFormValues.mockResolvedValue({ totalCount: 1, countBefore: 0 });
  listIngredientFormGroups.mockReset();
  listIngredientFormGroups.mockResolvedValue(GROUPS.map(entry));
  getIngredientFormValueBySlug.mockReset();
  getIngredientFormValueBySlug.mockResolvedValue(SHARD);
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('the /admin/forms page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ new: '' })).rejects.toThrow('forbidden');
    expect(listIngredientFormValues).not.toHaveBeenCalled();
    expect(listIngredientFormGroups).not.toHaveBeenCalled();
    expect(getIngredientFormValueBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each form with its group, and no modal', async () => {
    await renderPage();

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastFilter()).toEqual(NO_FILTER);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Testwort Shard' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Fixture Substance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Testwort Shard' })).toHaveAttribute(
      'href',
      '/admin/forms?edit=testwort-shard-fixture-substance',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads every group on one page of the maximum', async () => {
    await renderPage();

    expect(listIngredientFormGroups).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Testwort Shard'], id: SHARD.id });

    await renderPage({ after });
    expect(lastRequest().after).toEqual({ key: ['Testwort Shard'], id: SHARD.id });

    await renderPage({ after: 'not-a-cursor' });
    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    listIngredientFormValues.mockResolvedValue(
      Array.from({ length: 26 }, (_, index) =>
        entry({
          ...SHARD,
          id: `${SHARD.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
          name: `Testwort Shard ${index}`,
          slug: `testwort-shard-${index}-fixture-substance`,
        }),
      ),
    );
    countIngredientFormValues.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Testwort Shard'], id: SHARD.id }) });

    expect(countIngredientFormValues).toHaveBeenCalledWith(NO_FILTER, {
      key: ['Testwort Shard 0'],
      id: expect.any(String),
    });
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(pages).toHaveTextContent('Page 2 of 3');
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/forms\?before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/forms\?after=[^&]+$/,
    );
  });

  it('opens the empty modal on ?new, offering every group', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Form' });
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Group' }));
    expect(
      within(screen.getByRole('listbox', { name: 'Group choices' }))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Fixture Mineral', 'Fixture Substance']);
    expect(getIngredientFormValueBySlug).not.toHaveBeenCalled();
  });

  it("opens a form's modal on ?edit=, filled from the form", async () => {
    await renderPage({ edit: 'testwort-shard-fixture-substance' });

    expect(getIngredientFormValueBySlug).toHaveBeenCalledWith('testwort-shard-fixture-substance');
    const dialog = screen.getByRole('dialog', { name: 'Edit Form' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Testwort Shard');
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue(
      'An invented form',
    );
    expect(within(dialog).getByRole('combobox', { name: 'Group' })).toHaveTextContent(
      'Fixture Substance',
    );
  });

  it('says so, and opens nothing, when ?edit= names no form', async () => {
    getIngredientFormValueBySlug.mockRejectedValue(new NotFound('No such form'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getIngredientFormValueBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'testwort-shard' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    const after = encodeCursor({ key: ['Testwort Shard'], id: SHARD.id });
    await renderPage({ after, edit: 'testwort-shard-fixture-substance' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(`/admin/forms?after=${encodeURIComponent(after)}`);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('closes the modal back to the filtered page it opened over', async () => {
    await renderPage({
      query: 'shard',
      group: 'fixture-substance',
      edit: 'testwort-shard-fixture-substance',
    });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith('/admin/forms?query=shard&group=fixture-substance');
  });
});

// `?query=` and `?group=<slug>` narrow the list, as the categories' filter
// does (MB.178), and every link the page builds keeps them.
describe('the /admin/forms filter', () => {
  /** A full page and one more, so the pager links both ways. */
  const fullPage = () =>
    Array.from({ length: 26 }, (_, index) =>
      entry({
        ...SHARD,
        id: `${SHARD.id.slice(0, -2)}${String(index).padStart(2, '0')}`,
        name: `Testwort Shard ${index}`,
        slug: `testwort-shard-${index}-fixture-substance`,
      }),
    );

  it('reads ?query=, trimmed, into the filter of the list and its count', async () => {
    await renderPage({ query: '  testwort sh ' });

    expect(lastFilter()).toEqual({ query: 'testwort sh', groupId: undefined });
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('testwort sh');
  });

  // A native submit sends both fields, blank or not.
  it('reads a blank ?query= and ?group= as no filter', async () => {
    await renderPage({ query: '   ', group: '' });

    expect(lastFilter()).toEqual(NO_FILTER);
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
  });

  it('reads ?group= as the id of the group at that slug', async () => {
    await renderPage({ group: 'fixture-substance' });

    expect(lastFilter()).toEqual({ query: undefined, groupId: GROUPS[1].id });
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('fixture-substance');
  });

  // As a hand-edited cursor gets the first page.
  it('ignores a ?group= no group holds, and drops it from every link', async () => {
    listIngredientFormValues.mockResolvedValue(fullPage());

    await renderPage({ query: 'shard', group: 'no-such-group' });

    expect(lastFilter()).toEqual({ query: 'shard', groupId: undefined });
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Add Form' })).toHaveAttribute(
      'href',
      '/admin/forms?query=shard&new',
    );
    expect(screen.getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/forms\?query=shard&after=[^&]+$/,
    );
  });

  it('keeps the filter on the pager, each Edit and Add Form', async () => {
    const after = encodeCursor({ key: ['Testwort Shard'], id: SHARD.id });
    listIngredientFormValues.mockResolvedValue(fullPage());
    countIngredientFormValues.mockResolvedValue({ totalCount: 63, countBefore: 25 });

    await renderPage({ query: 'shard', group: 'fixture-substance', after });

    const here = `/admin/forms?query=shard&group=fixture-substance&after=${encodeURIComponent(after)}`;
    expect(screen.getByRole('link', { name: 'Add Form' })).toHaveAttribute('href', `${here}&new`);
    expect(screen.getByRole('link', { name: 'Edit Testwort Shard 0' })).toHaveAttribute(
      'href',
      `${here}&edit=testwort-shard-0-fixture-substance`,
    );
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getByRole('link', { name: 'Prev' }).getAttribute('href')).toMatch(
      /^\/admin\/forms\?query=shard&group=fixture-substance&before=[^&]+$/,
    );
    expect(within(pages).getByRole('link', { name: 'Next' }).getAttribute('href')).toMatch(
      /^\/admin\/forms\?query=shard&group=fixture-substance&after=[^&]+$/,
    );
  });
});
