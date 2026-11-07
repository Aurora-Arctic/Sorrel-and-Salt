import { ingredientSlug } from '@/lib/slugify';
import { toColumns } from './columns';
import { mergeFixture, stated } from './merge';
import type {
  IngredientFixture,
  Nomenclature,
  Overrides,
  VariantFixture,
  VariantInput,
} from './types';

// `null` for `none`, which must not have one under `ingredients_nomenclature_declares_canonical_name`, and for `unknown`, which may go either way. Every name is invented (CLAUDE.md, Testing).
const CANONICAL_NAME_BY_NOMENCLATURE: Record<Nomenclature, string | null> = {
  botanical: 'Fixtura testalis',
  fungal: 'Fixturomyces testalis',
  zoological: 'Fixturus testalis',
  mineral: 'Fixturite var. test',
  chemical: 'Fixturium chloride',
  unknown: null,
  none: null,
};

// The default form is invented: a real one, `Herb` or `Oil`, is safe only until a curated row spells it.
export function makeVariant(overrides: Partial<VariantFixture> = {}): VariantFixture {
  return { form: 'Testform', ...overrides };
}

// Categories are names an input cannot send, so a test states `categoryIds` itself.
export function variantInput(
  variant: VariantFixture,
  overrides: Partial<VariantInput> = {},
): VariantInput {
  return {
    form: variant.form,
    formId: variant.formId ?? '',
    description: variant.description ?? '',
    safetyNotes: variant.safetyNotes ?? '',
    toxic: variant.toxic ?? false,
    elements: variant.elements ?? [],
    celestialBodies: variant.celestialBodies ?? [],
    zodiacSigns: variant.zodiacSigns ?? [],
    colors: variant.colors ?? [],
    categoryIds: [],
    substitutes: (variant.substitutes ?? []).map((name) => ({ ingredientId: null, name })),
    references: [],
    ...overrides,
  };
}

const DEFAULTS: IngredientFixture = {
  workspaceId: null,
  name: 'Testwort',
  canonicalName: CANONICAL_NAME_BY_NOMENCLATURE.botanical,
  nomenclature: 'botanical',
  variants: [makeVariant()],
  description: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
  safetyNotes: null,
  toxic: false,
  substitutes: [],
  deities: [],
  folkNames: [],
  categories: [],
};

// A stated `canonicalName` is left as given, so a test can write the row the CHECK rejects.
export function makeIngredient(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const ingredient = mergeFixture(DEFAULTS, overrides);

  if (!stated(overrides, 'canonicalName')) {
    ingredient.canonicalName = CANONICAL_NAME_BY_NOMENCLATURE[ingredient.nomenclature];
  }

  return ingredient;
}

// The child collections are destructured off by name, since `celestialBodies` and the other lists are `text[]` columns too.
export function ingredientColumns(fixture: IngredientFixture): Record<string, unknown> {
  const {
    variants: _variants,
    folkNames: _folkNames,
    substitutes: _substitutes,
    deities: _deities,
    categories: _categories,
    ...row
  } = fixture;

  return {
    ...toColumns(row),
    slug: ingredientSlug(fixture.name, fixture.canonicalName),
  };
}
