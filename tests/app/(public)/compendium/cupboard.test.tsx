import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';
import type { PublicCupboardProps } from '@/components/IngredientEntry/types';
import { entryDetail } from '../../../support/entry-detail';

// The cupboard choices the public entry page hands the entry: which of the viewer's
// covens are offered, what each one's role permits, and which coven's Annotate dialog the
// address opens. The entry component, the cached read and the viewer are mocked, since what
// they do is their own tests' (tests/components/IngredientEntry/public-cupboard-actions.test.tsx
// draws the choices). The roles go through the real `rolePermits`, so a viewer's role is
// refused here exactly as the service refuses it. The per-viewer reads are the services', per
// request, beside the sessionless cached read (CLAUDE.md rule 6).

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

const viewerIfSignedIn = vi.fn();
const covenRolesIfSignedIn = vi.fn();
vi.mock('@/lib/viewer', () => ({ viewerIfSignedIn, covenRolesIfSignedIn }));
const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));

// What Edit Stock opens with is `entry-stock.ts`'s, tests/app/entry-stock.test.ts; here only which
// covens it is asked for.
const readEntryStock = vi.fn();
vi.mock('@/app/entry-stock', () => ({
  readEntryStock,
  stockKey: (workspaceId: string, ingredientId: string) => `${workspaceId}:${ingredientId}`,
}));

const readCompendiumEntry = vi.fn();
const covensHoldingEntry = vi.fn();
const getCupboardEntry = vi.fn();
vi.mock('@/modules/ingredients', () => ({
  readCompendiumEntry,
  covensHoldingEntry,
  getCupboardEntry,
  MAKE_IT_OURS_PERMISSION: { ingredient: ['create', 'delete'], inventory: ['update'] },
}));
vi.mock('@/modules/coven', async () => ({
  rolePermits: (await vi.importActual<typeof import('@/modules/coven')>('@/modules/coven'))
    .rolePermits,
}));
vi.mock('@/app/entry-values', () => ({ entryValues: vi.fn() }));

const entryComponent = vi.fn((_props: Record<string, unknown>) => null);
vi.mock('@/components/IngredientEntry', () => ({ default: entryComponent }));

const { default: Page } = await import('@/app/(public)/compendium/ingredients/[slug]/page');

const detail = entryDetail();
const ENTRY_ID = detail.entry.id;
const OWN = `/compendium/ingredients/${detail.entry.slug}`;
const SESSION = { user: { id: 'user-a' } };

const coven = (id: string, slug: string, canWrite = true) => ({
  id,
  slug,
  name: `Coven ${slug}`,
  canReadMembers: true,
  canWrite,
});
const signedIn = (...workspaces: ReturnType<typeof coven>[]) =>
  viewerIfSignedIn.mockResolvedValue({
    viewer: { name: 'Fixture Member', canCurate: false },
    workspaces,
  });
const roles = (entries: Record<string, string>) =>
  covenRolesIfSignedIn.mockResolvedValue(new Map(Object.entries(entries)));
const holding = (...ids: string[]) =>
  covensHoldingEntry.mockResolvedValue(
    ids.map((id) => ({ id, slug: id.replace('ws-', ''), name: `Coven ${id}` })),
  );

/** The props the page handed the entry, once it has drawn. */
async function entryProps(search: Record<string, string> = {}) {
  entryComponent.mockClear();
  const tree = await Page({
    params: Promise.resolve({ slug: detail.entry.slug }),
    searchParams: Promise.resolve(search),
  });
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const element = node as { type?: unknown; props?: { children?: unknown } };
    if (element.type === entryComponent) found.push(element.props as Record<string, unknown>);
    const children = element.props?.children;
    (Array.isArray(children) ? children : [children]).forEach(walk);
  };
  walk(tree);
  expect(found).toHaveLength(1);
  return found[0];
}

/** The cupboard choices the page handed the entry. */
const covensGiven = async (search: Record<string, string> = {}) =>
  (await entryProps(search)).covens as PublicCupboardProps | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  readCompendiumEntry.mockResolvedValue({ kind: 'entry', detail, movedAway: null });
  viewerIfSignedIn.mockResolvedValue(null);
  covenRolesIfSignedIn.mockResolvedValue(null);
  getSession.mockResolvedValue(SESSION);
  covensHoldingEntry.mockResolvedValue([]);
  getCupboardEntry.mockResolvedValue(null);
  readEntryStock.mockResolvedValue(new Map());
});

describe('the public entry page’s cupboard choices', () => {
  it('offers a signed-out visitor none, and reads nothing per viewer for them', async () => {
    expect(await covensGiven({ annotate: 'w' })).toBeUndefined();

    expect(covenRolesIfSignedIn).not.toHaveBeenCalled();
    expect(covensHoldingEntry).not.toHaveBeenCalled();
    expect(getCupboardEntry).not.toHaveBeenCalled();
  });

  it('offers none to someone who may write in no coven, and asks no coven', async () => {
    signedIn(coven('ws-w', 'w', false));
    roles({ 'ws-w': 'viewer' });

    expect(await covensGiven()).toBeUndefined();
  });

  it('offers none to a viewer, whose role permits no write even where a coven says it may', async () => {
    // The precondition: the coven is listed as writable, so only the role refuses it.
    signedIn(coven('ws-w', 'w', true));
    roles({ 'ws-w': 'viewer' });

    expect(await covensGiven()).toBeUndefined();
    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(SESSION, ENTRY_ID);
  });

  it('offers a member of one coven Add there, with the coven first', async () => {
    signedIn(coven('ws-w', 'w'));
    roles({ 'ws-w': 'member' });

    const covens = await covensGiven();

    expect(covens?.defaultWorkspaceId).toBe('ws-w');
    expect(covens?.covens).toEqual([
      expect.objectContaining({
        workspaceId: 'ws-w',
        covenSlug: 'w',
        held: false,
        canAdd: true,
        annotateHref: `${OWN}?annotate=w`,
      }),
    ]);
    expect(covens?.annotate).toEqual({ closeHref: OWN, opened: undefined });
  });

  it('says which coven holds the entry, the second one included, and what each role there permits', async () => {
    signedIn(coven('ws-w', 'w'), coven('ws-x', 'x'));
    roles({ 'ws-w': 'owner', 'ws-x': 'member' });
    holding('ws-x');

    const covens = await covensGiven();

    expect(covens?.defaultWorkspaceId).toBe('ws-w');
    expect(covens?.covens.map(({ workspaceId, held }) => [workspaceId, held])).toEqual([
      ['ws-w', false],
      ['ws-x', true],
    ]);
    expect(covens?.covens[1]).toMatchObject({ canAnnotate: true, canRemove: true });
  });

  it('reads a refusal of the held read as no coven holding it, still offering Add', async () => {
    signedIn(coven('ws-w', 'w'));
    roles({ 'ws-w': 'member' });
    covensHoldingEntry.mockRejectedValue(new Forbidden());

    expect((await covensGiven())?.covens[0]).toMatchObject({ held: false, canAdd: true });
  });

  it('opens the Annotate dialog of the holding coven the address names, read through the service', async () => {
    signedIn(coven('ws-w', 'w'), coven('ws-x', 'x'));
    roles({ 'ws-w': 'member', 'ws-x': 'member' });
    holding('ws-x');
    getCupboardEntry.mockResolvedValue({ label: 'Their Testwort' });

    const covens = await covensGiven({ annotate: 'x' });

    expect(getCupboardEntry).toHaveBeenCalledExactlyOnceWith(SESSION, 'ws-x', ENTRY_ID);
    expect(covens?.annotate.opened?.workspaceId).toBe('ws-x');
    expect(covens?.annotate.opened?.overrides.label).toBe('Their Testwort');
  });

  it('ignores a coven the address names that is not the viewer’s, reading nothing for it', async () => {
    // The precondition: the viewer's own coven holds the entry, so the same address naming
    // it would open the dialog (the test above).
    signedIn(coven('ws-x', 'x'));
    roles({ 'ws-x': 'member' });
    holding('ws-x');

    const covens = await covensGiven({ annotate: 'someone-elses' });

    expect(getCupboardEntry).not.toHaveBeenCalled();
    expect(covens?.annotate.opened).toBeUndefined();
    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(SESSION, ENTRY_ID);
  });

  it('ignores the address naming a coven of the viewer’s that does not hold the entry', async () => {
    signedIn(coven('ws-w', 'w'), coven('ws-x', 'x'));
    roles({ 'ws-w': 'member', 'ws-x': 'member' });
    holding('ws-x');

    expect((await covensGiven({ annotate: 'w' }))?.annotate.opened).toBeUndefined();
    expect(getCupboardEntry).not.toHaveBeenCalled();
  });
});

// The In Your Cupboard shelf before the name: shown when any coven of the viewer's holds
// the entry, viewers' covens included, from the one held read that feeds the choices too.
describe('the public entry page’s Edit Stock', () => {
  const STOCK = { forms: [{ variantId: 'v1', label: 'Leaf' }], jars: [] };

  it('hands the stock to a holding coven whose role may update it, asking for that coven alone', async () => {
    signedIn(coven('ws-w', 'w'), coven('ws-x', 'x'), coven('ws-y', 'y'));
    roles({ 'ws-w': 'owner', 'ws-x': 'member', 'ws-y': 'member' });
    holding('ws-w', 'ws-x');
    readEntryStock.mockResolvedValue(new Map([[`ws-w:${ENTRY_ID}`, STOCK]]));

    const covens = await covensGiven();

    expect(readEntryStock).toHaveBeenCalledExactlyOnceWith([
      { ingredientId: ENTRY_ID, workspaceId: 'ws-w' },
      { ingredientId: ENTRY_ID, workspaceId: 'ws-x' },
    ]);
    expect(covens?.covens.map(({ workspaceId, stock }) => [workspaceId, stock])).toEqual([
      ['ws-w', STOCK],
      ['ws-x', undefined],
      ['ws-y', undefined],
    ]);
  });

  it('asks for no stock where nothing is held, though the role could update it', async () => {
    signedIn(coven('ws-w', 'w'));
    roles({ 'ws-w': 'owner' });

    await covensGiven();

    expect(readEntryStock).toHaveBeenCalledExactlyOnceWith([]);
  });
});

describe('the public entry page’s shelf mark', () => {
  const heldInCovens = async () => (await entryProps()).heldInCovens;

  it('shows a member whose coven holds the entry the shelf, from the one held read', async () => {
    signedIn(coven('ws-w', 'w'));
    roles({ 'ws-w': 'member' });
    holding('ws-w');

    expect(await heldInCovens()).toBe(true);
    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(SESSION, ENTRY_ID);
  });

  it('shows a viewer the shelf where their coven holds it, though they may add nowhere', async () => {
    signedIn(coven('ws-w', 'w', false));
    roles({ 'ws-w': 'viewer' });
    holding('ws-w');

    expect(await heldInCovens()).toBe(true);
  });

  it('shows a member whose covens hold none of it no shelf', async () => {
    // The precondition: signed in and a member, so only the held read says no.
    signedIn(coven('ws-w', 'w'));
    roles({ 'ws-w': 'member' });

    expect(await heldInCovens()).toBe(false);
    expect(covensHoldingEntry).toHaveBeenCalledExactlyOnceWith(SESSION, ENTRY_ID);
  });

  it('shows a signed-out visitor no shelf, reading nothing held for them', async () => {
    holding('ws-w');

    expect(await heldInCovens()).toBe(false);
    expect(covensHoldingEntry).not.toHaveBeenCalled();
  });
});
