import { describe, expect, it } from 'vitest';
import { supplyOf } from '@/components/SpellBuilder/steps/supply';
import type { StepJar } from '@/components/SpellBuilder/steps/types';

// M10.19, story 54: what the cupboard says about a step. Every row of the rule, as a
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

  it('counts a form the coven holds no jar of as out of stock', () => {
    expect(supplyOf(step({ jar: null }))).toEqual({ kind: 'out', jar: null });
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
