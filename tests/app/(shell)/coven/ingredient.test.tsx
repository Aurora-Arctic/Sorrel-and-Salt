import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';
import { entryDetail } from '../../../support/entry-detail';

// A coven's ingredient page (M8.19). The guard and the services are mocked,
// since what they decide is their own tests'. Here: that the coven in the
// address is what the lookup is given, that a refusal is a 404, and which of
// Edit and the canonical link each kind of entry gets.

const notFound = vi.fn(() => {
  throw new Error('not-found');
});
vi.mock('next/navigation', () => ({ notFound }));

const requireCovenMembership = vi.fn();
const requireSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ requireCovenMembership, requireSession }));

const viewerOf = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerOf }));

const getIngredient = vi.fn();
const ingredientDetailOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({ getIngredient, ingredientDetailOf }));

const { default: Page, generateMetadata } =
  await import('@/app/(shell)/coven/[slug]/ingredients/[id]/page');

const WORKSPACE = { id: 'w-fixture', name: 'Fixture Coven', slug: 'fixture-coven' };
const SESSION = { userId: 'u-member', role: 'user' };
const ID = '00000000-0000-4000-8000-000000000001';
const params = (id = ID) => ({ params: Promise.resolve({ slug: WORKSPACE.slug, id }) });

const compendiumRow = () => entryDetail().entry;
const covenRow = () => entryDetail({ workspaceId: WORKSPACE.id, slug: 'testwort-own' }).entry;
const edits = () => screen.queryAllByRole('link', { name: /edit/i });

const open = async (row: ReturnType<typeof compendiumRow>, canCurate = false) => {
  getIngredient.mockResolvedValue(row);
  ingredientDetailOf.mockResolvedValue({ ...entryDetail(), entry: row });
  viewerOf.mockResolvedValue({ viewer: { name: 'Fixture Member', canCurate }, workspaces: [] });
  render(await Page(params()));
};

beforeEach(() => {
  vi.clearAllMocks();
  requireCovenMembership.mockResolvedValue({
    workspace: WORKSPACE,
    membership: { workspaceId: WORKSPACE.id, userId: SESSION.userId, role: 'member' },
  });
  requireSession.mockResolvedValue(SESSION);
});

describe('the coven ingredient page', () => {
  it('looks the ingredient up inside the coven the address names', async () => {
    await open(covenRow());

    expect(requireCovenMembership).toHaveBeenCalledWith(WORKSPACE.slug);
    expect(getIngredient).toHaveBeenCalledWith(SESSION, ID, WORKSPACE.id);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Testwort');
  });

  it('renders nothing for a stranger, whom the guard refuses first', async () => {
    requireCovenMembership.mockImplementation(() => {
      throw new Error('not-found');
    });

    await expect(Page(params())).rejects.toThrow('not-found');
    expect(getIngredient).not.toHaveBeenCalled();
  });

  it.each([
    ['an id that names nothing visible to the coven', new NotFound('ingredient')],
    ['an id the service refuses', new Forbidden()],
  ])('answers 404 for %s', async (_case, refusal) => {
    getIngredient.mockRejectedValue(refusal);

    await expect(Page(params('00000000-0000-4000-8000-0000000000ff'))).rejects.toThrow('not-found');
    // The lookup was made with this coven's id, so the refusal is the
    // service's and not the page never having asked.
    expect(getIngredient).toHaveBeenCalledWith(
      SESSION,
      '00000000-0000-4000-8000-0000000000ff',
      WORKSPACE.id,
    );
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('rethrows a failure that is not a refusal', async () => {
    getIngredient.mockRejectedValue(new Error('database down'));

    await expect(Page(params())).rejects.toThrow('database down');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('gives a compendium entry the link to its public page', async () => {
    await open(compendiumRow());

    expect(screen.getByRole('link', { name: 'View in the Compendium' })).toHaveAttribute(
      'href',
      '/compendium/ingredients/testwort-fixtura-testalis',
    );
    expect(screen.queryByText('Local')).toBeNull();
  });

  it('gives a coven member no Edit on a compendium entry', async () => {
    await open(compendiumRow());

    expect(edits()).toHaveLength(0);
  });

  it('gives a curator Edit on a compendium entry, to the admin screen', async () => {
    await open(compendiumRow(), true);

    const target = new URL(edits()[0]!.getAttribute('href')!, 'http://fixture.test');
    expect(edits()).toHaveLength(1);
    expect(target.pathname).toBe('/admin/compendium');
    expect(target.searchParams.get('edit')).toBe('testwort-fixtura-testalis');
  });

  it("gives the coven's own entry neither the public link nor Edit, even to a curator", async () => {
    await open(covenRow(), true);

    expect(screen.getByText('Local')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'View in the Compendium' })).toBeNull();
    expect(edits()).toHaveLength(0);
  });
});

describe('the coven ingredient page title', () => {
  it('names the public page as canonical for a compendium entry', async () => {
    getIngredient.mockResolvedValue(compendiumRow());

    expect(await generateMetadata(params())).toEqual({
      title: 'Testwort',
      alternates: { canonical: '/compendium/ingredients/testwort-fixtura-testalis' },
    });
  });

  it("names no canonical for the coven's own entry", async () => {
    getIngredient.mockResolvedValue(covenRow());

    expect(await generateMetadata(params())).toEqual({ title: 'Testwort' });
  });
});
