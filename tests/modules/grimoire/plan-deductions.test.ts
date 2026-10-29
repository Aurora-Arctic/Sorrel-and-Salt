import { beforeEach, describe, expect, it, vi } from 'vitest';
import { planDeductions, type PlanJar, type PlanStep } from '@/modules/grimoire/plan-deductions';

// Spying on the converter, not replacing it: the plan must still be the real one, and the spy
// shows that a count unit is compared by equality and never handed to it.
const convert = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/modules/ingredients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/ingredients')>();
  return {
    ...actual,
    unitConvert: (...args: Parameters<typeof actual.unitConvert>) => {
      convert.calls += 1;
      return actual.unitConvert(...args);
    },
  };
});

beforeEach(() => {
  convert.calls = 0;
});

const VARIANT = 'v1';
const step = (over: Partial<PlanStep> & { id: string }): PlanStep => ({
  position: 0,
  ingredientId: 'i1',
  variantId: VARIANT,
  name: null,
  quantity: '10',
  unit: 'g',
  ...over,
});
const jar = (over: Partial<PlanJar> = {}): PlanJar => ({
  id: 'jar1',
  variantId: VARIANT,
  quantityOnHand: '100',
  unit: 'g',
  ...over,
});

describe('planDeductions', () => {
  it('takes the step’s amount in the jar’s unit, converting', () => {
    const plan = planDeductions(
      [step({ id: 's1', quantity: '2', unit: 'kg' })],
      [jar({ quantityOnHand: '5000' })],
    );
    expect(plan).toEqual([
      {
        kind: 'take',
        stepId: 's1',
        inventoryItemId: 'jar1',
        amount: 2000,
        unit: 'g',
        shortfall: 0,
      },
    ]);
  });

  it('takes what the jar holds and records the rest as the shortfall', () => {
    const [entry] = planDeductions(
      [step({ id: 's1', quantity: '30' })],
      [jar({ quantityOnHand: '12.5' })],
    );
    expect(entry).toMatchObject({ kind: 'take', amount: 12.5, shortfall: 17.5 });
  });

  it('shares one jar between two steps laying the same form, in step order', () => {
    // Why: a spell may lay a form in several steps, so each must see what the one before left.
    const plan = planDeductions(
      [
        step({ id: 's2', position: 1, quantity: '8' }),
        step({ id: 's1', position: 0, quantity: '8' }),
      ],
      [jar({ quantityOnHand: '10' })],
    );
    expect(plan.map((entry) => entry.stepId)).toEqual(['s1', 's2']);
    expect(plan[0]).toMatchObject({ amount: 8, shortfall: 0 });
    expect(plan[1]).toMatchObject({ amount: 2, shortfall: 6 });
  });

  it('deducts nothing for an instruction-only step, and gives it no reason', () => {
    const plan = planDeductions(
      [step({ id: 's1', ingredientId: null, variantId: null, quantity: null, unit: null })],
      [jar()],
    );
    expect(plan).toEqual([{ kind: 'none', stepId: 's1' }]);
  });

  it.each([
    ['a custom step', { ingredientId: null, variantId: null, name: 'Testwort' }, [jar()], 'custom'],
    [
      'a custom step with no amount',
      { ingredientId: null, variantId: null, name: 'Testwort', quantity: null, unit: null },
      [jar()],
      'custom',
    ],
    ['an unstocked step', {}, [], 'unstocked'],
    ['a step with no quantity', { quantity: null, unit: null }, [jar()], 'no-quantity'],
    ['a step with a quantity and no unit', { unit: null }, [jar()], 'no-quantity'],
    [
      'a step in another dimension than the jar',
      { quantity: '1', unit: 'ml' },
      [jar()],
      'units-differ',
    ],
    [
      'a jar with no amount on hand',
      {},
      [jar({ quantityOnHand: null, unit: null })],
      'jar-not-measured',
    ],
  ] as const)('refuses %s with its reason', (_label, over, jars, reason) => {
    const [entry] = planDeductions([step({ id: 's1', ...over })], [...jars]);
    expect(entry).toEqual({ kind: 'skip', stepId: 's1', reason });
  });

  it('compares a count by unit and never passes it to unitConvert', () => {
    const same = planDeductions(
      [step({ id: 's1', quantity: '3', unit: 'piece' })],
      [jar({ quantityOnHand: '5', unit: 'piece' })],
    );
    expect(same[0]).toMatchObject({ kind: 'take', amount: 3, unit: 'piece', shortfall: 0 });

    const differ = planDeductions(
      [step({ id: 's1', quantity: '3', unit: 'pinch' })],
      [jar({ quantityOnHand: '5', unit: 'piece' })],
    );
    expect(differ[0]).toEqual({ kind: 'skip', stepId: 's1', reason: 'units-differ' });
    // Precondition: a weight step does reach the converter, so the zero above is the count rule at work.
    expect(convert.calls).toBe(0);
    planDeductions([step({ id: 's1' })], [jar()]);
    expect(convert.calls).toBe(1);
  });

  it('plans the same from the same inputs, which is what the preview and the completion share', () => {
    const steps = [
      step({ id: 's1', quantity: '4' }),
      step({ id: 's2', position: 1, ingredientId: null, variantId: null }),
    ];
    const jars = [jar({ quantityOnHand: '3' })];
    expect(planDeductions(steps, jars)).toEqual(planDeductions(steps, jars));
  });
});
