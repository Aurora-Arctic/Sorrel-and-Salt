import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// The stock a compendium page hands Edit Stock (M9.12; the owner's call, 2026-10-21): the forms
// each entry comes in and the jars a coven holds of it, read per viewer through the services in
// one batch for the page, never from the cached compendium read. The session and the two services
// are mocked: what they answer is their own tests'. Here: the batching, the shape handed on, and
// that a refusal leaves the entry without stock rather than failing the page.

const getSession = vi.fn();
vi.mock('@/lib/request-session', () => ({ getSession }));
const stockOf = vi.fn();
const variantsOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({ stockOf, variantsOf }));

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
  it('reads every pair in one stock call and every entry once in one forms call', async () => {
    stockOf.mockResolvedValue([[jar('j1', 'v1')], [], []]);
    variantsOf.mockResolvedValue([[variant('v1', 'dried leaf')], [variant('v2', 'root')]]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w2' },
      { ingredientId: 'e2', workspaceId: 'w1' },
    ]);

    expect(stockOf).toHaveBeenCalledTimes(1);
    expect(variantsOf).toHaveBeenCalledTimes(1);
    // The entries are asked as the compendium's own tier, once each, however many covens hold them.
    expect(variantsOf).toHaveBeenCalledWith(SESSION, [
      { id: 'e1', workspaceId: null },
      { id: 'e2', workspaceId: null },
    ]);
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
    variantsOf.mockResolvedValue([[variant('v1', 'root')]]);

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
    expect(variantsOf).not.toHaveBeenCalled();
  });

  it('leaves a coven the service refused without stock, and keeps the rest of the batch', async () => {
    // Why it could have been some: the entry's forms were read all the same.
    stockOf.mockResolvedValue([new Forbidden(), []]);
    variantsOf.mockResolvedValue([[variant('v1', 'root')]]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e1', workspaceId: 'w2' },
    ]);

    expect(read.has(stockKey('w1', 'e1'))).toBe(false);
    expect(read.has(stockKey('w2', 'e1'))).toBe(true);
  });

  it('leaves an entry whose forms the service refused without stock', async () => {
    stockOf.mockResolvedValue([[], []]);
    variantsOf.mockResolvedValue([new Forbidden(), [variant('v2', 'root')]]);

    const read = await readEntryStock([
      { ingredientId: 'e1', workspaceId: 'w1' },
      { ingredientId: 'e2', workspaceId: 'w1' },
    ]);

    expect(read.has(stockKey('w1', 'e1'))).toBe(false);
    expect(read.has(stockKey('w1', 'e2'))).toBe(true);
  });
});
