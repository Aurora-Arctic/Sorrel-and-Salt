import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';
import type { GroupKind } from '@/components/GroupForm/types';

// The page every group vocabulary shares (src/app/(shell)/admin/group-page.tsx): the guard, one page
// of the groups, and the modal its address opens (`?new` empty, `?edit=` a group by slug, told how many
// rows its delete must move). The shape runs on the category groups; the form groups and the deity
// traditions get only what they change, their path and their services
// (claude-docs/testing/layer-ownership.md, rule 5). The guard and the services are mocked: what they
// decide is tests/lib/request-session.test.ts's and tests/modules/vocabulary's.

const requireCuratorSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCuratorSession }));

// The editors' names are `editorStamps`'s, tested in tests/app/(shell)/admin/editors.test.ts.
const editorStamps = vi.fn(async (_session: unknown, rows: readonly unknown[]) =>
  rows.map(() => ({ updatedBy: 'Fixture Editor', updatedAt: new Date('2026-05-06T10:00:00Z') })),
);
vi.mock('@/app/(shell)/admin/editors', () => ({ editorStamps }));

const listCategoryGroups = vi.fn();
const countCategoryGroups = vi.fn();
const getCategoryGroupBySlug = vi.fn();
const countCategories = vi.fn();
const listIngredientFormGroups = vi.fn();
const countIngredientFormGroups = vi.fn();
const getIngredientFormGroupBySlug = vi.fn();
const countIngredientFormValues = vi.fn();
const listDeityTraditions = vi.fn();
const countDeityTraditions = vi.fn();
const getDeityTraditionBySlug = vi.fn();
const countDeities = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listCategoryGroups,
  countCategoryGroups,
  getCategoryGroupBySlug,
  countCategories,
  listIngredientFormGroups,
  countIngredientFormGroups,
  getIngredientFormGroupBySlug,
  countIngredientFormValues,
  listDeityTraditions,
  countDeityTraditions,
  getDeityTraditionBySlug,
  countDeities,
}));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const { GroupAction, GroupPage } = await import('@/app/(shell)/admin/group-page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const WARDS = {
  id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21',
  name: 'Fixture Wards',
  slug: 'fixture-wards',
  description: 'An invented group',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};

const MENDING = {
  ...WARDS,
  id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
  name: 'Fixture Mending',
  slug: 'fixture-mending',
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

async function renderPage(params: Record<string, string> = {}, kind: GroupKind = 'category') {
  // The tab's action beside the heading, and the tab's content, as the
  // route group's layout puts them on one page.
  const [action, page] = await Promise.all([
    GroupAction({ kind, searchParams: Promise.resolve(params) }),
    GroupPage({ kind, searchParams: Promise.resolve(params) }),
  ]);
  render(
    <QueryClientProvider client={makeQueryClient()}>
      {action}
      {page}
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  requireCuratorSession.mockReset();
  requireCuratorSession.mockResolvedValue(ADMIN);
  listCategoryGroups.mockReset();
  countCategoryGroups.mockReset();
  countCategoryGroups.mockResolvedValue({ totalCount: 2, countBefore: 0 });
  listCategoryGroups.mockResolvedValue([entry(MENDING), entry(WARDS)]);
  getCategoryGroupBySlug.mockReset();
  getCategoryGroupBySlug.mockResolvedValue(WARDS);
  countCategories.mockReset();
  countCategories.mockResolvedValue({ totalCount: 3, countBefore: null });
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('a group page, on the category groups', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireCuratorSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ edit: 'fixture-wards' })).rejects.toThrow('forbidden');
    expect(listCategoryGroups).not.toHaveBeenCalled();
    expect(getCategoryGroupBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each group by its name, and no modal', async () => {
    await renderPage();

    expect(listCategoryGroups).toHaveBeenCalledWith({ limit: 26, inverted: false });
    expect(screen.getByRole('cell', { name: 'Fixture Wards' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Fixture Wards' })).toHaveAttribute(
      'href',
      '/admin/category-groups?edit=fixture-wards',
    );
    expect(screen.getByRole('link', { name: 'Add Group' })).toHaveAttribute(
      'href',
      '/admin/category-groups?new',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads every group on one page of the maximum for the move', async () => {
    await renderPage();

    expect(listCategoryGroups).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('counts the page from its first row', async () => {
    countCategoryGroups.mockResolvedValue({ totalCount: 30, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Fixture Mending'], id: MENDING.id }) });

    // The page's first row, as its list read it.
    expect(countCategoryGroups).toHaveBeenCalledWith({
      key: [expect.any(String)],
      id: expect.any(String),
    });
  });

  // Which cursor is readable is tests/lib/search-params.test.ts's.
  it('reads the page after the cursor in the address', async () => {
    const after = encodeCursor({ key: ['Fixture Mending'], id: MENDING.id });

    await renderPage({ after });
    const read = listCategoryGroups.mock.calls.map(([request]) => request as PageRequest);
    expect(read.some((request) => request.after?.id === MENDING.id)).toBe(true);
  });

  it('opens the empty modal on ?new', async () => {
    await renderPage({ new: '' });

    expect(screen.getByRole('dialog', { name: 'Add Category Group' })).toBeInTheDocument();
    expect(getCategoryGroupBySlug).not.toHaveBeenCalled();
  });

  it("opens a group's modal on ?edit=, filled from it and told how many categories it holds", async () => {
    await renderPage({ edit: 'fixture-wards' });

    expect(getCategoryGroupBySlug).toHaveBeenCalledWith('fixture-wards');
    expect(countCategories).toHaveBeenCalledWith({ groupId: WARDS.id }, undefined);
    const dialog = screen.getByRole('dialog', { name: 'Edit Category Group, Fixture Wards' });
    // The count reaches the form: which groups the move offers is GroupForm's tests'.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Group' }));
    expect(
      within(dialog).getByRole('combobox', { name: 'Move Its 3 Categories To' }),
    ).toBeInTheDocument();
  });

  it('says so, and opens nothing, when ?edit= names no group', async () => {
    getCategoryGroupBySlug.mockRejectedValue(new NotFound('No such group'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getCategoryGroupBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'fixture-wards' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    const after = encodeCursor({ key: ['Fixture Mending'], id: MENDING.id });
    await renderPage({ after, edit: 'fixture-wards' });

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(router.replace).toHaveBeenCalledWith(
      `/admin/category-groups?after=${encodeURIComponent(after)}`,
    );
    expect(router.refresh).toHaveBeenCalled();
  });
});

// The other two kinds change only their path and their services: the page
// of groups, the group by slug, and the count of what its delete must move.
describe('a group page, for each other kind', () => {
  const PLAIN = { ...WARDS, colorDark: undefined, colorLight: undefined };
  const ROWS = [
    {
      kind: 'form',
      path: '/admin/form-groups',
      list: listIngredientFormGroups,
      count: countIngredientFormGroups,
      get: getIngredientFormGroupBySlug,
      members: countIngredientFormValues,
      memberFilter: { groupId: WARDS.id },
      dialog: 'Edit Form Group, Fixture Wards',
    },
    {
      kind: 'tradition',
      path: '/admin/deity-traditions',
      list: listDeityTraditions,
      count: countDeityTraditions,
      get: getDeityTraditionBySlug,
      members: countDeities,
      memberFilter: { traditionId: WARDS.id },
      dialog: 'Edit Tradition, Fixture Wards',
    },
  ] as const;

  it.each(ROWS)(
    'reads the $kind groups and the edited one through its own services, on $path',
    async ({ kind, path, list, count, get, members, memberFilter, dialog }) => {
      list.mockResolvedValue([entry(PLAIN)]);
      count.mockResolvedValue({ totalCount: 1, countBefore: 0 });
      get.mockResolvedValue(PLAIN);
      members.mockResolvedValue({ totalCount: 2, countBefore: null });

      await renderPage({ edit: WARDS.slug }, kind);

      expect(get).toHaveBeenCalledWith(WARDS.slug);
      expect(members).toHaveBeenCalledWith(memberFilter, undefined);
      expect(screen.getByRole('dialog', { name: dialog })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: `Edit ${WARDS.name}` })).toHaveAttribute(
        'href',
        `${path}?edit=${WARDS.slug}`,
      );
    },
  );
});

// The traditions' name search: the address's query reaches the
// service's page and count, and every link on the page keeps it; a kind
// without a search reads none. What the search matches is the finder's,
// tests/db/repository/vocabularies.test.ts's.
describe('a group page, searched by name', () => {
  beforeEach(() => {
    listDeityTraditions.mockReset();
    countDeityTraditions.mockReset();
    listDeityTraditions.mockResolvedValue([entry(MENDING), entry(WARDS)]);
    countDeityTraditions.mockResolvedValue({ totalCount: 30, countBefore: 0 });
  });

  it('reads the traditions under ?query=, and keeps it on every link', async () => {
    // A page more than the 25 shown, so the pager offers Next.
    const many = Array.from({ length: 26 }, (_, index) =>
      entry({ ...WARDS, id: `${WARDS.id.slice(0, -2)}${String(index).padStart(2, '0')}` }),
    );
    listDeityTraditions.mockImplementation(async (request: PageRequest) =>
      request.limit === 26 ? many : [entry(WARDS)],
    );

    await renderPage({ query: ' wort ' }, 'tradition');

    expect(listDeityTraditions).toHaveBeenCalledWith(
      { limit: 26, inverted: false },
      { query: 'wort' },
    );
    expect(countDeityTraditions).toHaveBeenCalledWith(expect.anything(), { query: 'wort' });
    expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('wort');
    expect(screen.getAllByRole('link', { name: `Edit ${WARDS.name}` })[0]).toHaveAttribute(
      'href',
      `/admin/deity-traditions?query=wort&edit=${WARDS.slug}`,
    );
    expect(screen.getByRole('link', { name: 'Add Tradition' })).toHaveAttribute(
      'href',
      '/admin/deity-traditions?query=wort&new',
    );
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/admin\/deity-traditions\?query=wort&after=/),
    );
  });

  it('reads every tradition for the move picker, whatever the search', async () => {
    await renderPage({ query: 'wort' }, 'tradition');

    expect(listDeityTraditions).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('reads no ?query= on a kind without a search', async () => {
    await renderPage({ query: 'wort' });

    expect(listCategoryGroups).toHaveBeenCalledWith({ limit: 26, inverted: false });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Group' })).toHaveAttribute(
      'href',
      '/admin/category-groups?new',
    );
  });
});
