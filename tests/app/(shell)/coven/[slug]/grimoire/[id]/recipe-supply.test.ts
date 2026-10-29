import { describe, expect, it, vi } from 'vitest';
import { Forbidden } from '@/lib/errors';

// The verdict the spell's Quick Look marks on each ingredient step, judged by the
// builder's own `supplyOf` against the coven's jar of the step's form. The stock service is
// mocked; what it refuses is its own tests'.

const stockOf = vi.fn();
vi.mock('@/modules/ingredients', () => ({ stockOf }));

const { readStepSuppliesOf } =
  await import('@/app/(shell)/coven/[slug]/grimoire/[id]/recipe-supply');

const session = { user: { id: 'fixture-user' } } as never;
const COVEN = 'c0ffee00-0000-4000-8000-000000000001';
const row = {
  spellId: 'sp',
  ingredientId: null,
  variantId: null,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  body: null,
  note: null,
  ingredient: null,
  variant: null,
};
const linked = (id: string, quantity: string, unit: string) => ({
  ...row,
  id,
  ingredientId: 'ing-1',
  variantId: 'v-1',
  quantity,
  unit,
  ingredient: {
    id: 'ing-1',
    workspaceId: null,
    name: 'Testwort',
    canonicalName: null,
    nomenclature: 'none',
    deleted: false,
  },
  variant: {
    id: 'v-1',
    ingredientId: 'ing-1',
    workspaceId: null,
    form: 'dried leaf',
    deleted: false,
  },
});
const jar = (
  quantityOnHand: string | null,
  unit = 'g',
  lowStockThreshold: string | null = null,
) => [[{ id: 'jar-1', variantId: 'v-1', unit, quantityOnHand, lowStockThreshold }]];
const read = (views: unknown[]) => readStepSuppliesOf(session, COVEN, views as never[]);

describe('readStepSuppliesOf', () => {
  it("reads the coven's jars once and marks every step on a form short of their summed need", async () => {
    stockOf.mockResolvedValue(jar('5'));
    const supplies = await read([linked('s-1', '3', 'g'), linked('s-2', '3', 'g')]);

    expect(stockOf).toHaveBeenCalledTimes(1);
    expect(stockOf).toHaveBeenCalledWith(session, [{ ingredientId: 'ing-1', workspaceId: COVEN }]);
    expect(supplies).toEqual(
      new Map([
        ['s-1', 'short'],
        ['s-2', 'short'],
      ]),
    );
  });

  it('marks nothing where the jar holds enough, and clears once it does', async () => {
    stockOf.mockResolvedValue(jar('6'));
    expect(await read([linked('s-1', '3', 'g'), linked('s-2', '3', 'g')])).toEqual(new Map());
  });

  it('marks an empty jar Out, a jar at its Low mark Low, and units of two dimensions Units Differ', async () => {
    stockOf.mockResolvedValueOnce(jar('0'));
    expect(await read([linked('s-1', '1', 'g')])).toEqual(new Map([['s-1', 'out']]));
    stockOf.mockResolvedValueOnce(jar('10', 'g', '10'));
    expect(await read([linked('s-1', '1', 'g')])).toEqual(new Map([['s-1', 'low']]));
    stockOf.mockResolvedValueOnce(jar('10', 'ml'));
    expect(await read([linked('s-1', '1', 'g')])).toEqual(new Map([['s-1', 'units-differ']]));
  });

  it('marks no step with no jar, no one-off and no instruction, and reads no stock for them alone', async () => {
    stockOf.mockResolvedValue([[]]);
    expect(await read([linked('s-1', '1', 'g')])).toEqual(new Map());

    stockOf.mockClear();
    const oneOff = {
      ...row,
      id: 's-2',
      name: 'Fixture Dust',
      form: 'dust',
      quantity: '1',
      unit: 'g',
    };
    const instruction = { ...row, id: 's-3', body: 'Stir.' };
    expect(await read([oneOff, instruction])).toEqual(new Map());
    expect(stockOf).not.toHaveBeenCalled();
  });

  it('marks nothing for an ingredient whose stock the service withholds', async () => {
    stockOf.mockResolvedValue([new Forbidden()]);
    expect(await read([linked('s-1', '1', 'g')])).toEqual(new Map());
  });
});
