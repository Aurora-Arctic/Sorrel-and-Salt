import type { Route } from 'next';
import { describe, expect, it } from 'vitest';
import { recipeStepsOf } from '@/app/(shell)/coven/[slug]/grimoire/[id]/recipe-steps';
import type { SpellStepView } from '@/modules/grimoire';

// MB.6: the service's step views as the recipe draws them. Invented names throughout.

/** The page the steps are drawn on, which the Quick Look eye adds `?entry=` to. */
const HERE = '/coven/c1/grimoire/sp' as Route;

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
    ingredient: {
      id,
      name,
      canonicalName,
      nomenclature: 'botanical',
      toxic: false,
      safetyNotes: null,
      workspaceId: 'w',
      deleted: false,
    },
    variant: { id: `${id}-v`, form, toxic: false, safetyNotes: null, deleted: false },
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
      '/coven/fixture-coven/grimoire/sp' as Route,
    );
    expect(steps.map((s) => s.kind)).toEqual(['ingredient', 'instruction', 'ingredient']);
    expect(steps[0]).toMatchObject({
      name: 'Testwort',
      form: 'dried leaf',
      quantity: '2',
      unit: 'tsp',
      look: {
        href: '/coven/fixture-coven/grimoire/sp?entry=a',
        name: 'Testwort',
        canonicalName: 'Testus wortus',
        nomenclature: 'botanical',
      },
      safety: {
        toxic: false,
        safetyNotes: null,
        variants: [{ form: 'dried leaf', toxic: false, safetyNotes: null }],
      },
      oneOff: false,
    });
    expect(steps[1]).toMatchObject({ body: 'Stir three times' });
    expect(steps[2]).toMatchObject({
      name: 'Fixture ash',
      form: 'powder',
      look: null,
      safety: null,
      oneOff: true,
    });
  });

  it('adds the eye to an address that already has a query with &', () => {
    const [only] = recipeStepsOf(
      [linked('a', 'Testwort', null, 'root')],
      '/coven/c1/grimoire?spell=sp' as Route,
    );
    expect(only).toMatchObject({ look: { href: '/coven/c1/grimoire?spell=sp&entry=a' } });
  });

  it("carries the ingredient's and the form's safety, so the recipe can mark the step", () => {
    const [toxicForm, noted] = recipeStepsOf(
      [
        linked('a', 'Testwort', null, 'oil', {
          variant: { id: 'a-v', form: 'oil', toxic: true, safetyNotes: null, deleted: false },
        }),
        linked('b', 'Fixture Rue', null, 'herb', {
          ingredient: {
            id: 'b',
            name: 'Fixture Rue',
            canonicalName: null,
            nomenclature: 'none',
            toxic: false,
            safetyNotes: 'Wash hands after.',
            workspaceId: 'w',
            deleted: false,
          },
        }),
      ],
      HERE,
    );
    expect(toxicForm).toMatchObject({
      safety: { toxic: false, variants: [{ form: 'oil', toxic: true }] },
    });
    expect(noted).toMatchObject({ safety: { safetyNotes: 'Wash hands after.' } });
  });

  it('adds the formal name only where two steps share a label', () => {
    const steps = recipeStepsOf(
      [
        linked('a', 'Fixture Mint', 'Mentha testa', 'herb'),
        linked('b', 'Fixture Mint', 'Mentha altera', 'oil'),
        linked('c', 'Testwort', 'Testus wortus', 'herb'),
      ],
      HERE,
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
      HERE,
    );
    expect(only).toMatchObject({ look: null, deleted: true });
  });

  it('names an ingredient the viewer cannot read, rather than dropping the step', () => {
    const [only] = recipeStepsOf([step({ ingredientId: 'x', variantId: 'x-v' })], HERE);
    expect(only).toMatchObject({
      kind: 'ingredient',
      name: 'Unavailable Ingredient',
      look: null,
      safety: null,
    });
  });
});
