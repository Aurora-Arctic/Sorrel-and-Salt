import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFound } from '@/lib/errors';
import { makeQueryClient } from '@/lib/graphql-client';
import { encodeCursor } from '@/lib/pagination';
import type { PageRequest } from '@/lib/types';

// The `/admin/deity-traditions` page (MB.132): the guard, one page of the
// deity traditions, and the modal its address opens — `?new` empty, `?edit=`
// a tradition by slug, told how many deities its delete must move. The guard and the
// services are mocked: what they decide is tests/lib/request-session.test.ts's
// and tests/modules/vocabulary's.

const requireAdminSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireAdminSession }));

const listDeityTraditions = vi.fn();
const countDeityTraditions = vi.fn();
const getDeityTraditionBySlug = vi.fn();
const countDeities = vi.fn();
vi.mock('@/modules/vocabulary', () => ({
  listDeityTraditions,
  countDeityTraditions,
  getDeityTraditionBySlug,
  countDeities,
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

const { default: AdminDeityTraditionsPage } = await import('@/app/admin/deity-traditions/page');

const ADMIN = { userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f', role: 'admin' } as const;

const FIXTURAL = {
  id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21',
  name: 'Fixtural',
  slug: 'fixtural',
  description: 'An invented tradition',
};

const MOCKISH = {
  ...FIXTURAL,
  id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
  name: 'Mockish',
  slug: 'mockish',
};

const entry = <T extends { id: string; name: string }>(node: T) => ({
  node,
  cursor: { key: [node.name], id: node.id },
});

async function renderPage(params: Record<string, string> = {}) {
  const page = await AdminDeityTraditionsPage({ searchParams: Promise.resolve(params) });
  render(<QueryClientProvider client={makeQueryClient()}>{page}</QueryClientProvider>);
}

beforeEach(() => {
  requireAdminSession.mockReset();
  requireAdminSession.mockResolvedValue(ADMIN);
  listDeityTraditions.mockReset();
  countDeityTraditions.mockReset();
  countDeityTraditions.mockResolvedValue({ totalCount: 2, countBefore: 0 });
  listDeityTraditions.mockResolvedValue([entry(MOCKISH), entry(FIXTURAL)]);
  getDeityTraditionBySlug.mockReset();
  getDeityTraditionBySlug.mockResolvedValue(FIXTURAL);
  countDeities.mockReset();
  countDeities.mockResolvedValue({ totalCount: 3, countBefore: null });
  router.replace.mockReset();
  router.refresh.mockReset();
});

describe('the /admin/deity-traditions page', () => {
  it('renders nothing, and reads nothing, when the guard refuses', async () => {
    requireAdminSession.mockRejectedValue(new Error('forbidden'));

    await expect(renderPage({ edit: 'fixtural' })).rejects.toThrow('forbidden');
    expect(listDeityTraditions).not.toHaveBeenCalled();
    expect(getDeityTraditionBySlug).not.toHaveBeenCalled();
  });

  it('lists the first page of 25, each tradition by its name, and no modal', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Deity traditions' })).toBeInTheDocument();
    expect(listDeityTraditions).toHaveBeenCalledWith({ limit: 26, inverted: false });
    expect(screen.getByRole('cell', { name: 'Fixtural' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit Fixtural' })).toHaveAttribute(
      'href',
      '/admin/deity-traditions?edit=fixtural',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads every tradition on one page of the maximum for the move', async () => {
    await renderPage();

    expect(listDeityTraditions).toHaveBeenCalledWith({ limit: 101, inverted: false });
  });

  it('says which page of how many, counted from the first row of the page', async () => {
    countDeityTraditions.mockResolvedValue({ totalCount: 30, countBefore: 25 });

    await renderPage({ after: encodeCursor({ key: ['Mockish'], id: MOCKISH.id }) });

    // The page's first row, as its list read it.
    expect(countDeityTraditions).toHaveBeenCalledWith({
      key: [expect.any(String)],
      id: expect.any(String),
    });
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('Page 2 of 2');
  });

  it('reads the page after a readable cursor, and the first page for one that is not', async () => {
    const after = encodeCursor({ key: ['Mockish'], id: MOCKISH.id });

    await renderPage({ after });
    const read = listDeityTraditions.mock.calls.map(([request]) => request as PageRequest);
    expect(read.some((request) => request.after?.id === MOCKISH.id)).toBe(true);
  });

  it('puts Add Tradition on the line of the heading, linking the empty modal over this page', async () => {
    await renderPage();

    const heading = screen.getByRole('heading', { level: 1, name: 'Deity traditions' });
    const add = screen.getByRole('link', { name: 'Add Tradition' });
    expect(add.parentElement).toBe(heading.parentElement);
    expect(add).toHaveAttribute('href', '/admin/deity-traditions?new');
  });

  it('opens the empty modal on ?new, asking for no colour', async () => {
    await renderPage({ new: '' });

    const dialog = screen.getByRole('dialog', { name: 'Add Tradition' });
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('textbox', { name: 'Dark Theme Colour' }),
    ).not.toBeInTheDocument();
    expect(getDeityTraditionBySlug).not.toHaveBeenCalled();
  });

  it("opens a tradition's modal on ?edit=, filled from it and told how many deities it holds", async () => {
    await renderPage({ edit: 'fixtural' });

    expect(getDeityTraditionBySlug).toHaveBeenCalledWith('fixtural');
    expect(countDeities).toHaveBeenCalledWith({ traditionId: FIXTURAL.id }, undefined);
    const dialog = screen.getByRole('dialog', { name: 'Edit Tradition' });
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toHaveValue(
      'An invented tradition',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Tradition' }));
    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Move its 3 deities to' }));
    expect(
      within(screen.getByRole('listbox', { name: 'Move its 3 deities to choices' }))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Mockish']);
  });

  it('says so, and opens nothing, when ?edit= names no tradition', async () => {
    getDeityTraditionBySlug.mockRejectedValue(new NotFound('No such tradition'));

    await renderPage({ edit: 'gone' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tradition has that address — it may have been renamed or deleted.',
    );
  });

  it('lets any other failure reading ?edit= through', async () => {
    getDeityTraditionBySlug.mockRejectedValue(new Error('database down'));

    await expect(renderPage({ edit: 'fixtural' })).rejects.toThrow('database down');
  });

  it('closes the modal back to the page it opened over, and re-reads it', async () => {
    const after = encodeCursor({ key: ['Mockish'], id: MOCKISH.id });
    await renderPage({ after, edit: 'fixtural' });

    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }).click();

    expect(router.replace).toHaveBeenCalledWith(
      `/admin/deity-traditions?after=${encodeURIComponent(after)}`,
    );
    expect(router.refresh).toHaveBeenCalled();
  });
});
