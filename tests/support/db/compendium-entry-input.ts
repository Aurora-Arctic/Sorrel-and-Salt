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

/** What `createCompendiumEntry` and `updateCompendiumEntry` take. */
type CompendiumEntryInput = Parameters<typeof createCompendiumEntry>[1];

/**
 * The compendium entry fixture for the files that write compendium entries. Reads the live curated
 * forms by folded name once per file: every form is a pick, so `entry` picks the row each form's
 * text names unless the test states its `formId`, as the admin's autofill would.
 */
export function useCompendiumEntryInput(sql: () => postgres.Sql) {
  let formIds: Map<string, string>;
  beforeAll(async () => {
    const rows = await sql()`
      select ingredient_forms.id, lower(ingredient_forms.name) as fold from ingredient_forms
      join ingredient_form_groups on ingredient_form_groups.id = group_id
      where ingredient_forms.deleted_at is null and ingredient_form_groups.deleted_at is null`;
    formIds = new Map(rows.map((row) => [row.fold as string, row.id as string]));
  });

  /**
   * The fixture as an admin's input: everything but the tier and the category
   * names, its substitutes and deities typed, and each form picked by its text
   * unless the variant states its `formId` (`null` for a typed one). One
   * curated form, Herb, unless the test states `variants`: the fixture's own
   * default is invented, so no curated row holds it.
   */
  return function entry(overrides: Overrides<IngredientFixture> = {}): CompendiumEntryInput {
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
