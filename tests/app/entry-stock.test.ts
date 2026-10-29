import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';

// The stock a compendium page hands Edit Stock: the forms
// each entry comes in and the jars a coven holds of it, read per viewer through the services in
// one batch for the page, never from the cached compendium read. The session and the two services
// are mocked: what they answer is their own tests'. Here: the batching, the shape handed on, and
// that a refusal leaves the entry without stock rather than failing the page.

const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));
const stockOf = vi.fn();
const variantsOf = vi.fn();
const heldFormsOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({ stockOf, variantsOf, heldFormsOf }));

const { readEntryStock, stockKey } = await import('@/app/entry-stock');

const SESSION = { userId: 'u-fixture', role: 'user' };
const jar = (id: string, variantId: string) => ({
  id,
  variantId,
  quantityOnHand: '50.5',
  unit: 'g',
  lowStockThreshold: null,
});
const variant = (id: string, form: string) => ({ id, form });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(SESSION);
});

describe('readEntryStock', () => {
  it('reads every pair in one stock call and one forms call', async () => {
    stockOf.mockResolvedValue([[jar('j1', 'v1')], [], []]);
    heldFormsOf.mockResolvedValue([
      [variant('v1', 'dried leaf')],
      [variant('v1', 'dried leaf')],
      [variant('v2', 'root')],
    ]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w2' },
      { ingredientId: 'e2', workspaceId: 'w1' },
    ]);

    expect(stockOf).toHaveBeenCalledTimes(1);
    // A compendium entry's forms are read per coven, through that coven's proof, so a retired
    // entry a coven still holds reads for it and for no other.
    expect(heldFormsOf).toHaveBeenCalledTimes(1);
    expect(heldFormsOf).toHaveBeenCalledWith(SESSION, [
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w2' },
      { ingredientId: 'e2', workspaceId: 'w1' },
    ]);
    expect(variantsOf).not.toHaveBeenCalled();
    expect(read.get(stockKey('w1', 'e1'))).toEqual({
      forms: [{ variantId: 'v1', label: 'Dried Leaf' }],
      jars: [{ id: 'j1', variantId: 'v1', quantity: 50.5, unit: 'g', threshold: null }],
    });
    expect(read.get(stockKey('w2', 'e1'))).toEqual({
      forms: [{ variantId: 'v1', label: 'Dried Leaf' }],
      jars: [],
    });
    expect(read.get(stockKey('w1', 'e2'))?.forms).toEqual([{ variantId: 'v2', label: 'Root' }]);
  });

  it('reads a pair asked twice once', async () => {
    stockOf.mockResolvedValue([[]]);
    heldFormsOf.mockResolvedValue([[variant('v1', 'root')]]);

    await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w1' },
    ]);

    expect(stockOf).toHaveBeenCalledWith(SESSION, [{ ingredientId: 'e1', workspaceId: 'w1' }]);
  });

  it('reads nothing for no pair, and nothing for a visitor', async () => {
    expect((await readEntryStock([])).size).toBe(0);
    getSession.mockResolvedValue(null);
    expect((await readEntryStock([{ ingredientId: 'e1', workspaceId: 'w1' }])).size).toBe(0);

    expect(stockOf).not.toHaveBeenCalled();
    expect(heldFormsOf).not.toHaveBeenCalled();
    expect(variantsOf).not.toHaveBeenCalled();
  });

  it('leaves a coven the service refused without stock, and keeps the rest of the batch', async () => {
    // Why it could have been some: the entry's forms were read all the same.
    stockOf.mockResolvedValue([new Forbidden(), []]);
    heldFormsOf.mockResolvedValue([[variant('v1', 'root')], [variant('v1', 'root')]]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w2' },
    ]);

    expect(read.has(stockKey('w1', 'e1'))).toBe(false);
    expect(read.has(stockKey('w2', 'e1'))).toBe(true);
  });

  it('gives a retired entry its holding coven stock, and a coven that does not hold it none', async () => {
    // Why the second could have been some: its coven's jars of the entry were read, and found
    // one. Only the forms, which the service reads through that coven's proof, are refused.
    stockOf.mockResolvedValue([[jar('j1', 'v1')], [jar('j2', 'v1')]]);
    heldFormsOf.mockResolvedValue([[variant('v1', 'dried leaf')], new NotFound('No such form')]);

    const read = await readEntryStock([
      { ingredientId: 'retired1', workspaceId: 'holds' },
      { ingredientId: 'retired1', workspaceId: 'does-not' },
    ]);

    expect(read.get(stockKey('holds', 'retired1'))).toEqual({
      forms: [{ variantId: 'v1', label: 'Dried Leaf' }],
      jars: [{ id: 'j1', variantId: 'v1', quantity: 50.5, unit: 'g', threshold: null }],
    });
    expect(read.has(stockKey('does-not', 'retired1'))).toBe(false);
  });

  it("asks a coven's own entry's forms in that coven, beside a compendium entry's through the coven's proof", async () => {
    stockOf.mockResolvedValue([[], []]);
    heldFormsOf.mockResolvedValue([[variant('v1', 'root')]]);
    variantsOf.mockResolvedValue([[variant('v9', 'oil')]]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'own1', workspaceId: 'w1', own: true },
    ]);

    // The own entry's tier is its coven, or the service would refuse it as the compendium's; it
    // has no cupboard row to hold, so it is not asked of the held read.
    expect(heldFormsOf).toHaveBeenCalledWith(SESSION, [{ ingredientId: 'e1', workspaceId: 'w1' }]);
    expect(variantsOf).toHaveBeenCalledWith(SESSION, [{ id: 'own1', workspaceId: 'w1' }]);
    expect(read.get(stockKey('w1', 'own1'))?.forms).toEqual([{ variantId: 'v9', label: 'Oil' }]);
    expect(read.get(stockKey('w1', 'e1'))?.forms).toEqual([{ variantId: 'v1', label: 'Root' }]);
    // The jars are asked of the coven for both, with no tier in the key the stock service sees.
    expect(stockOf).toHaveBeenCalledWith(SESSION, [
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'own1', workspaceId: 'w1' },
    ]);
  });
});
