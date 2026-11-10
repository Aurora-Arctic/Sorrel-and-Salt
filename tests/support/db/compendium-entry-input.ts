import type postgres from 'postgres';
import { beforeAll } from 'vitest';
import type { createCompendiumEntry } from '@/modules/ingredients';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
  variantInput,
} from '../fixtures';

type CompendiumEntryInput = Parameters<typeof createCompendiumEntry>[1];

// Every form is a pick: `entry` picks the row each form's text names unless the test states `formId`, as the keeper's autofill would.
export function useCompendiumEntryInput(sql: () => postgres.Sql) {
  let formIds: Map<string, string>;
  beforeAll(async () => {
    const rows = await sql()`
      select ingredient_forms.id, lower(ingredient_forms.name) as fold from ingredient_forms
      join ingredient_form_groups on ingredient_form_groups.id = group_id
      where ingredient_forms.deleted_at is null and ingredient_form_groups.deleted_at is null`;
    formIds = new Map(rows.map((row) => [row.fold as string, row.id as string]));
  });

  return function entry(
    overrides: Overrides<IngredientFixture> = {},
  ): CompendiumEntryInput & { variants: NonNullable<CompendiumEntryInput['variants']> } {
    const fixture = makeIngredient({ variants: [makeVariant({ form: 'Herb' })], ...overrides });
    const {
      workspaceId: _tier,
      categories: _categories,
      substitutes,
      deities,
      variants,
      ...input
    } = fixture;
    return {
      ...input,
      substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
      deities: deities.map((name) => ({ deityId: null, name })),
      variants: variants.map((variant) =>
        variantInput(
          variant,
          variant.formId === undefined
            ? { formId: formIds.get(variant.form.trim().toLowerCase()) ?? '' }
            : {},
        ),
      ),
    };
  };
}
