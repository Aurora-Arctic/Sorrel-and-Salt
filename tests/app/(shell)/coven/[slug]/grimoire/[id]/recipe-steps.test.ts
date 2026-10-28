import { describe, expect, it } from 'vitest';
import { recipeStepsOf } from '@/app/(shell)/coven/[slug]/grimoire/[id]/recipe-steps';
import type { SpellStepView } from '@/modules/grimoire';

// MB.6: the service's step views as the recipe draws them. Invented names throughout.

const base = {
  id: 's',
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
const step = (over: Record<string, unknown>) => ({ ...base, ...over }) as unknown as SpellStepView;
const linked = (id: string, name: string, canonicalName: string | null, form: string, over = {}) =>
  step({
    id: `step-${id}`,
    ingredientId: id,
    variantId: `${id}-v`,
    quantity: '2',
    unit: 'tsp',
    ingredient: { id, name, canonicalName, workspaceId: 'w', deleted: false },
    variant: { id: `${id}-v`, form, deleted: false },
    ...over,
  });

describe('recipeStepsOf', () => {
  it('keeps the order given and tells an instruction from an ingredient from a one-off', () => {
    const steps = recipeStepsOf(
      [
        linked('a', 'Testwort', 'Testus wortus', 'dried leaf'),
        step({ id: 'i', body: 'Stir three times' }),
        step({ id: 'o', name: 'Fixture ash', form: 'powder' }),
      ],
      'fixture-coven',
    );
    expect(steps.map((s) => s.kind)).toEqual(['ingredient', 'instruction', 'ingredient']);
    expect(steps[0]).toMatchObject({
      name: 'Testwort',
      form: 'dried leaf',
      quantity: '2',
      unit: 'tsp',
      href: '/coven/fixture-coven/ingredients/a',
      oneOff: false,
    });
    expect(steps[1]).toMatchObject({ body: 'Stir three times' });
    expect(steps[2]).toMatchObject({
      name: 'Fixture ash',
      form: 'powder',
      href: null,
      oneOff: true,
    });
  });

  it('adds the formal name only where two steps share a label', () => {
    const steps = recipeStepsOf(
      [
        linked('a', 'Fixture Mint', 'Mentha testa', 'herb'),
        linked('b', 'Fixture Mint', 'Mentha altera', 'oil'),
        linked('c', 'Testwort', 'Testus wortus', 'herb'),
      ],
      'c1',
    );
    expect(steps.map((s) => s.kind === 'ingredient' && s.formal)).toEqual([
      'Mentha testa',
      'Mentha altera',
      null,
    ]);
  });

  it('does not link a deleted ingredient, and marks it', () => {
    const [only] = recipeStepsOf(
      [
        linked('a', 'Testwort', null, 'herb', {
          ingredient: {
            id: 'a',
            name: 'Testwort',
            canonicalName: null,
            workspaceId: 'w',
            deleted: true,
          },
        }),
      ],
      'c1',
    );
    expect(only).toMatchObject({ href: null, deleted: true });
  });

  it('names an ingredient the viewer cannot read, rather than dropping the step', () => {
    const [only] = recipeStepsOf([step({ ingredientId: 'x', variantId: 'x-v' })], 'c1');
    expect(only).toMatchObject({ kind: 'ingredient', name: 'Unavailable Ingredient', href: null });
  });
});
