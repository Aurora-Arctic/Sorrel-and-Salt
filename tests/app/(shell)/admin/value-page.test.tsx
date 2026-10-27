import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import type { GroupedValueKind } from '@/components/GroupedValueForm/types';

// The page every curated value shares (src/app/(shell)/admin/value-page.tsx, MB.115):
// the guard, one page of the vocabulary under the address's filter and its
// groups, and the modal its address opens — `?new` empty, `?edit=` a value
// by slug. The shape runs on the categories, as `/admin/categories` (M5.6,
// MB.178); every other kind gets only what it changes, its path and its
// services (claude-docs/testing/layer-ownership.md, rule 5). The guard and the
// services are mocked: what they decide is tests/lib/request-session.test.ts's
// and the vocabulary module's service tests'. This file holds the page's half
// — the address read into service calls, the guard, NotFound against any
// other error, and what the page builds for the list and the modal; how the
// list and the form behave given those props is their own tests'
// (claude-docs/testing/layer-ownership.md, "The owning layer").

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));

// The editors' names are `editorStamps`'s, tested in tests/app/(shell)/admin/editors.test.ts.
const editorStamps = vi.fn(async (_session: unknown, rows: readonly unknown[]) =>
  rows.map(() => ({ updatedBy: 'Fixture Editor', updatedAt: new Date('2026-05-06T10:00:00Z') })),
);
vi.mock('@/app/(shell)/admin/editors', () => ({ editorStamps }));

const listCategories = vi.fn();
const listCategoryGroups = vi.fn();
const getCategoryBySlug = vi.fn();
const countCategories = vi.fn();
const listIngredientFormValues = vi.fn();
const listIngredientFormGroups = vi.fn();
const getIngredientFormValueBySlug = vi.fn();
const countIngredientFormValues = vi.fn();
const listDeities = vi.fn();
const listDeityTraditions = vi.fn();
const getDeityBySlug = vi.fn();
const countDeities = vi.fn();
const deityOtherNamesOf = vi.fn(async (ids: readonly string[]) => ids.map((): string[] => []));
const listAstrologyValues = vi.fn();
const getAstrologyValueBySlug = vi.fn();
const countAstrologyValues = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listCategories,
  listCategoryGroups,
  getCategoryBySlug,
  countCategories,
  listIngredientFormValues,
  listIngredientFormGroups,
  getIngredientFormValueBySlug,
  countIngredientFormValues,
  listDeities,
  listDeityTraditions,
  getDeityBySlug,
  countDeities,
  deityOtherNamesOf,
  listAstrologyValues,
  getAstrologyValueBySlug,
  countAstrologyValues,
}));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { ValueAction, ValuePage } = await import('@/app/(shell)/admin/value-page');

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

async function renderPage(
  params: Record<string, string> = {},
  kind: GroupedValueKind = 'category',
) {
  // The tab's action beside the heading, and the tab's content, as the
  // route group's layout puts them on one page.
  const [action, page] = await Promise.all([
    ValueAction({ kind, searchParams: Promise.resolve(params) }),
    ValuePage({ kind, searchParams: Promise.resolve(params) }),
  ]);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      {action}
      {page}
    </QueryClientProvider>,
  );
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
  requireCuratorSession.mockReset();
  requireCuratorSession.mockResolvedValue(ADMIN);
  listCategories.mockReset();
  listCategories.mockResolvedValue([entry(TESTCRAFT)]);
  listCategoryGroups.mockReset();
  listCategoryGroups.mockResolvedValue(GROUPS.map(entry));
  getCategoryBySlug.mockReset();
  getCategoryBySlug.mockResolvedValue(TESTCRAFT);
  countCategories.mockReset();
  countCategories.mockResolvedValue({ totalCount: 1, countBefore: 0 });
});

describe('a curated value page, on the categories', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage()).rejects.toThrow('forbidden');
    expect(listCategories).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each category with its group, and no modal', async () => {
    await renderPage();

    expect(lastRequest()).toEqual({ limit: 26, inverted: false });
    expect(lastFilter()).toEqual(NO_FILTER);
    const row = within(screen.getByRole('table')).getAllByRole('row')[1];
    expect(within(row).getByRole('cell', { name: 'Fixture Protection' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Which cursor is readable is tests/lib/search-params.test.ts's.
  it('reads the page after the cursor in the address', async () => {
    const after = encodeCursor({ key: ['Testcraft'], id: TESTCRAFT.id });

    await renderPage({ after });
    expect(lastRequest().after).toEqual({ key: ['Testcraft'], id: TESTCRAFT.id });
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
  });

  it('opens the empty modal on ?new', async () => {
    await renderPage({ new: '' });

    expect(screen.getByRole('dialog', { name: 'Add Category' })).toBeInTheDocument();
    expect(getCategoryBySlug).not.toHaveBeenCalled();
  });

  it("opens a category's modal on ?edit=, filled from the category", async () => {
    await renderPage({ edit: 'testcraft' });

    expect(getCategoryBySlug).toHaveBeenCalledWith('testcraft');
    expect(screen.getByRole('dialog', { name: 'Edit Category, Testcraft' })).toBeInTheDocument();
  });

  it('says so, and opens nothing, when ?edit= names no category', async () => {
    getCategoryBySlug.mockRejectedValue(new NotFound('No such category'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getCategoryBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'testcraft' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the filtered page it opened over', async () => {
    await renderPage({ query: 'test', group: 'fixture-healing', edit: 'testcraft' });

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(router.replace).toHaveBeenCalledWith(
      '/admin/categories?query=test&group=fixture-healing',
    );
  });
});

// MB.178: `?query=` and `?group=<slug>` narrow the list, as the user list's
// filter does (MB.52), and every link the page builds keeps them.
describe("a curated value page's filter, on the categories", () => {
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

  // The type-ahead shows the group by its name; the slug is what it submits.
  it('reads ?group= as the id of the group at that slug', async () => {
    await renderPage({ group: 'fixture-protection' });

    expect(lastFilter()).toEqual({ query: undefined, groupId: GROUPS[1].id });
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveValue(GROUPS[1].name);
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
});

// Every other kind changes only its path and its services: its group read
// under its own parameter, or none for a flat kind, and its value read by
// slug for the modal (claude-docs/testing/layer-ownership.md, rule 5).
describe('a curated value page, for each other kind', () => {
  const VALUE = { id: TESTCRAFT.id, name: 'Testwort Shard', slug: 'testwort-shard' };
  const ROWS = [
    {
      kind: 'form',
      path: '/admin/forms',
      address: { group: 'fixture-protection' },
      list: listIngredientFormValues,
      count: countIngredientFormValues,
      groups: listIngredientFormGroups,
      get: getIngredientFormValueBySlug,
      filter: { query: 'te', groupId: GROUPS[1].id },
      getArgs: ['testwort-shard'],
      row: { ...TESTCRAFT, ...VALUE },
      dialog: 'Edit Form, Testwort Shard',
    },
    {
      kind: 'deity',
      path: '/admin/deities',
      address: { tradition: 'fixture-protection' },
      list: listDeities,
      count: countDeities,
      groups: listDeityTraditions,
      get: getDeityBySlug,
      // The deities' service calls the group a tradition.
      filter: { query: 'te', traditionId: GROUPS[1].id },
      getArgs: ['testwort-shard'],
      row: { ...VALUE, description: 'A deity', traditionId: GROUPS[1].id },
      // Named with its tradition, as two traditions may share a deity's name.
      dialog: 'Edit Deity, Testwort Shard, Fixture Protection',
    },
    {
      kind: 'celestialBody',
      path: '/admin/celestial-bodies',
      address: {},
      list: listAstrologyValues,
      count: countAstrologyValues,
      groups: undefined,
      get: getAstrologyValueBySlug,
      filter: { query: 'te' },
      getArgs: ['celestialBodies', 'testwort-shard'],
      row: { ...VALUE, description: 'A celestial body' },
      dialog: 'Edit Celestial Body, Testwort Shard',
    },
  ] as const;

  it.each(ROWS)(
    'reads the $kind list and value through its own services, on $path',
    async ({ kind, path, address, list, count, groups, get, filter, getArgs, row, dialog }) => {
      list.mockReset();
      list.mockResolvedValue([entry(row)]);
      count.mockReset();
      count.mockResolvedValue({ totalCount: 1, countBefore: 0 });
      groups?.mockReset();
      groups?.mockResolvedValue(GROUPS.map(entry));
      get.mockReset();
      get.mockResolvedValue(row);

      await renderPage({ query: 'te', ...address, edit: 'testwort-shard' }, kind);

      // A flat kind's services take the vocabulary first.
      const flat = getArgs.length === 2;
      expect(list.mock.lastCall?.slice(0, flat ? 2 : 1)).toEqual(
        flat ? [getArgs[0], filter] : [filter],
      );
      expect(count.mock.lastCall?.slice(0, flat ? 2 : 1)).toEqual(
        flat ? [getArgs[0], filter] : [filter],
      );
      expect(get).toHaveBeenCalledWith(...getArgs);
      expect(screen.getByRole('dialog', { name: dialog })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: `Edit ${VALUE.name}` })).toHaveAttribute(
        'href',
        `${path}?${new URLSearchParams({ query: 'te', ...address }).toString()}&edit=${VALUE.slug}`,
      );
    },
  );

  // M14.23: a deity's other names, read once for the page and once for the
  // deity the modal edits, so its row says them and its form opens on them.
  it("reads each deity's other names into its row and into the form that edits it", async () => {
    const row = { ...VALUE, description: 'A deity', traditionId: GROUPS[1].id };
    listDeities.mockReset();
    listDeities.mockResolvedValue([entry(row)]);
    countDeities.mockReset();
    countDeities.mockResolvedValue({ totalCount: 1, countBefore: 0 });
    listDeityTraditions.mockReset();
    listDeityTraditions.mockResolvedValue(GROUPS.map(entry));
    getDeityBySlug.mockReset();
    getDeityBySlug.mockResolvedValue(row);
    deityOtherNamesOf.mockReset();
    deityOtherNamesOf.mockResolvedValue([['Testrina', 'Tess']]);

    await renderPage({ edit: 'testwort-shard' }, 'deity');

    expect(deityOtherNamesOf.mock.calls).toEqual([[[VALUE.id]], [[VALUE.id]]]);
    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('cell', { name: 'Testwort Shard Also called Testrina, Tess' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', {
      name: 'Edit Deity, Testwort Shard, Fixture Protection',
    });
    const names = within(dialog).getByRole('group', { name: 'Other Names' });
    for (const name of ['Testrina', 'Tess']) {
      expect(within(names).getByRole('button', { name: `Remove ${name}` })).toBeInTheDocument();
    }
  });
});
