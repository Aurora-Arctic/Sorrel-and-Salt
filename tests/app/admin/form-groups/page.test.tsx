import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/form-groups` page (M5.6b): the guard, one page of the form
// groups, and the modal its address opens — `?new` empty, `?edit=` a group by
// slug, told how many forms its delete must move. The guard and the
// services are mocked: what they decide is tests/lib/request-session.test.ts's
// and tests/modules/vocabulary's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listIngredientFormGroups = vi.fn();
const countIngredientFormGroups = vi.fn();
const getIngredientFormGroupBySlug = vi.fn();
const countIngredientFormValues = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listIngredientFormGroups,
  countIngredientFormGroups,
  getIngredientFormGroupBySlug,
  countIngredientFormValues,
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

const { default: AdminFormGroupsPage } = await import('@/app/admin/form-groups/page');

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

async function renderPage(params: Record<string, string> = {}) {
  const page = await AdminFormGroupsPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listIngredientFormGroups.mockReset();
  countIngredientFormGroups.mockReset();
  countIngredientFormGroups.mockResolvedValue({ totalCount: 2, countBefore: 0 });
  listIngredientFormGroups.mockResolvedValue([entry(MENDING), entry(WARDS)]);
  getIngredientFormGroupBySlug.mockReset();
  getIngredientFormGroupBySlug.mockResolvedValue(WARDS);
  countIngredientFormValues.mockReset();
  countIngredientFormValues.mockResolvedValue({ totalCount: 3, countBefore: null });
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('the /admin/form-groups page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ edit: 'fixture-wards' })).rejects.toThrow('forbidden');
    expect(listIngredientFormGroups).not.toHaveBeenCalled();
    expect(getIngredientFormGroupBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each group by its name, and no modal', async () => {
    await renderPage();

    expect(listIngredientFormGroups).toHaveBeenCalledWith({ limit: 26, inverted: false });
    expect(screen.getByRole('cell', { name: 'Fixture Wards' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Fixture Wards' })).toHaveAttribute(
      'href',
      '/admin/form-groups?edit=fixture-wards',
    );
    expect(screen.getByRole('link', { name: 'Add Group' })).toHaveAttribute(
      'href',
      '/admin/form-groups?new',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads every group on one page of the maximum for the move', async () => {
    await renderPage();

    expect(listIngredientFormGroups).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    countIngredientFormGroups.mockResolvedValue({ totalCount: 30, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Fixture Mending'], id: MENDING.id }) });

    // The page's first row, as its list read it.
    expect(countIngredientFormGroups).toHaveBeenCalledWith({
      key: [expect.any(String)],
      id: expect.any(String),
    });
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 2 of 2');
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Fixture Mending'], id: MENDING.id });

    await renderPage({ after });
    const read = listIngredientFormGroups.mock.calls.map(([request]) => request as PageRequest);
    expect(read.some((request) => request.after?.id === MENDING.id)).toBe(true);
  });

  it('opens the empty modal on ?new, asking for no colour', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Form Group' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: 'Dark Theme Colour' }),
    ).not.toBeInTheDocument();
    expect(getIngredientFormGroupBySlug).not.toHaveBeenCalled();
  });

  it("opens a group's modal on ?edit=, filled from it and told how many forms it holds", async () => {
    await renderPage({ edit: 'fixture-wards' });

    expect(getIngredientFormGroupBySlug).toHaveBeenCalledWith('fixture-wards');
    expect(countIngredientFormValues).toHaveBeenCalledWith({ groupId: WARDS.id }, undefined);
    const dialog = screen.getByRole('dialog', { name: 'Edit Form Group' });
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue(
      'An invented group',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Group' }));
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Move its 3 forms to' }));
    expect(
      within(screen.getByRole('listbox', { name: 'Move its 3 forms to choices' }))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Fixture Mending']);
  });

  it('says so, and opens nothing, when ?edit= names no group', async () => {
    getIngredientFormGroupBySlug.mockRejectedValue(new NotFound('No such group'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('lets any other failure reading ?edit= through', async () => {
    getIngredientFormGroupBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'fixture-wards' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    const after = encodeCursor({ key: ['Fixture Mending'], id: MENDING.id });
    await renderPage({ after, edit: 'fixture-wards' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(
      `/admin/form-groups?after=${encodeURIComponent(after)}`,
    );
    expect(router.refresh).toHaveBeenCalled();
  });
});
