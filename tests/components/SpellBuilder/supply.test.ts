import { describe, expect, it } from 'vitest';
import { needOf, supplyOf } from '@/components/SpellBuilder/steps/supply';
import type { StepJar } from '@/components/SpellBuilder/steps/types';

// What the cupboard says about a step. Every row of the rule, as a
// function; the builder test proves each is drawn, and that the draw follows the amount.

const jar = (over: Partial<StepJar> = {}): StepJar => ({
  unit: 'g',
  quantity: 50,
  threshold: null,
  ...over,
});
const step = (over: Partial<Parameters<typeof supplyOf>[0]> = {}) => ({
  name: 'Fixture Rosewort',
  ingredientId: 'i1',
  variantId: 'v1',
  jar: jar(),
  quantity: '',
  unit: '',
  ...over,
});

describe('supplyOf', () => {
  it('says nothing for an instruction', () => {
    expect(
      supplyOf(step({ name: null, ingredientId: null, variantId: null, jar: null })),
    ).toBeNull();
  });

  it('marks a one-off, whatever the amount', () => {
    expect(
      supplyOf(step({ ingredientId: null, variantId: null, jar: null, quantity: '2', unit: 'g' })),
    ).toEqual({ kind: 'one-off' });
  });

  it('tells a form the coven holds no jar of from an empty jar (the owner, 2026-10-29)', () => {
    expect(supplyOf(step({ jar: null }))).toEqual({ kind: 'no-jar' });
  });

  it('counts an empty jar as out of stock, distinct from one that is merely short', () => {
    expect(supplyOf(step({ jar: jar({ quantity: 0 }), quantity: '1', unit: 'g' }))?.kind).toBe(
      'out',
    );
    expect(supplyOf(step({ jar: jar({ quantity: 5 }), quantity: '10', unit: 'g' }))?.kind).toBe(
      'short',
    );
  });

  it('compares in the jar’s unit, after converting', () => {
    expect(supplyOf(step({ quantity: '0.1', unit: 'kg' }))?.kind).toBe('short');
    expect(supplyOf(step({ quantity: '0.04', unit: 'kg' }))).toBeNull();
    expect(supplyOf(step({ quantity: '50', unit: 'g' }))).toBeNull();
  });

  it('refuses to compare across dimensions, with a count, or against a jar with no unit', () => {
    expect(supplyOf(step({ quantity: '1', unit: 'ml' }))).toEqual({ kind: 'units-differ' });
    expect(supplyOf(step({ quantity: '1', unit: 'piece' }))).toEqual({ kind: 'units-differ' });
    expect(supplyOf(step({ jar: jar({ unit: null }), quantity: '1', unit: 'g' }))).toEqual({
      kind: 'units-differ',
    });
  });

  it('compares nothing where the step names no amount, or the jar is not weighed', () => {
    expect(supplyOf(step())).toBeNull();
    expect(supplyOf(step({ quantity: '5' }))).toBeNull();
    expect(supplyOf(step({ jar: jar({ quantity: null }), quantity: '5', unit: 'g' }))).toBeNull();
  });

  it('flags a jar at or below its own threshold as low', () => {
    expect(supplyOf(step({ jar: jar({ threshold: 50 }) }))?.kind).toBe('low');
    expect(supplyOf(step({ jar: jar({ threshold: 10 }) }))).toBeNull();
  });
});

// A form laid in several steps is judged on the sum of what they all need.
describe('supplyOf across the steps on one form', () => {
  const held = jar({ quantity: 50 });
  const a = step({ jar: held, quantity: '30', unit: 'g' });
  const b = step({ jar: held, quantity: '30', unit: 'g' });

  it('is short where the steps together pass the jar though each alone fits', () => {
    expect(supplyOf(a)).toBeNull();
    expect(supplyOf(a, [a, b])?.kind).toBe('short');
    expect(supplyOf(b, [a, b])?.kind).toBe('short');
  });

  it('sums through unitConvert, so kilograms and grams add up', () => {
    const kg = step({ jar: held, quantity: '0.03', unit: 'kg' });
    expect(supplyOf(a, [a, kg])?.kind).toBe('short');
  });

  it('says Units Differ for every line of a form when one step cannot convert', () => {
    const ml = step({ jar: held, quantity: '1', unit: 'ml' });
    expect(supplyOf(a, [a, ml])).toEqual({ kind: 'units-differ' });
    expect(supplyOf(ml, [a, ml])).toEqual({ kind: 'units-differ' });
  });

  it('leaves another form out of the sum', () => {
    const other = step({ variantId: 'v2', jar: held, quantity: '30', unit: 'g' });
    expect(supplyOf(a, [a, other])).toBeNull();
  });
});

// One Line Per Form: what a form's steps need together.
describe('needOf', () => {
  const amount = (quantity: string, unit: string) => ({ quantity, unit });

  it('says nothing where no step has an amount, and a blank amount adds nothing', () => {
    expect(needOf([amount('', '')], 'g')).toBeNull();
    expect(needOf([amount('2', 'tsp'), amount('', 'tsp')], 'g')).toBe('2 tsp');
  });

  it('keeps a lone amount as it was typed', () => {
    expect(needOf([amount('1.50', 'g')], 'kg')).toBe('1.50 g');
  });

  it('sums amounts in one unit as they are, a count included', () => {
    expect(needOf([amount('1', 'tsp'), amount('2', 'tsp')], 'g')).toBe('3 tsp');
    expect(needOf([amount('1', 'pinch'), amount('2', 'pinch')], null)).toBe('3 pinch');
  });

  it("sums amounts in two units of one dimension in the jar's unit", () => {
    expect(needOf([amount('500', 'g'), amount('1', 'kg')], 'g')).toBe('1500 g');
  });

  it('lists amounts it cannot add without a guess', () => {
    expect(needOf([amount('1', 'tsp'), amount('2', 'pinch')], 'g')).toBe('1 tsp + 2 pinch');
    expect(needOf([amount('500', 'g'), amount('1', 'kg')], null)).toBe('500 g + 1 kg');
    expect(needOf([amount('1', 'tsp'), amount('5', 'g')], 'g')).toBe('1 tsp + 5 g');
  });
});
