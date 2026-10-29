import { builder } from '../../../graphql/builder';
import type { BuilderTypes } from '../../../graphql/types';
import type {
  CompendiumFacets,
  FacetCount,
  IngredientFacets,
  ReviewFacetValue,
  WorkspaceIngredientFacets,
} from '../types';
import { IngredientElementEnum, IngredientSourceEnum, ToxicFilterEnum } from './ingredient';

// How many entries each search filter value would list, for
// the compendium (`compendiumFacets`, in compendium.ts, which adds the No Refs
// count) and a coven's list (`workspaceIngredientFacets`, in
// workspace-ingredient-list.ts). One small
// object type per value type, so each `value` is typed as the argument it
// would be sent back as (claude-docs/graphql/schema.md, "compendiumFacets and
// workspaceIngredientFacets").

const COUNT_DESCRIPTION =
  'How many entries the list would hold with this value as the only one chosen of its kind, the rest of the filter unchanged.';

export const NameFacetCountRef = builder.objectRef<FacetCount>('NameFacetCount').implement({
  description: 'A form, zodiac sign or celestial body, and how many entries it would list.',
  fields: (t) => ({
    value: t.exposeString('value', {
      description: 'The value as the matching argument takes it.',
    }),
    count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
  }),
});

export const IdFacetCountRef = builder.objectRef<FacetCount>('IdFacetCount').implement({
  description: 'A curated deity or category, by id, and how many entries it would list.',
  fields: (t) => ({
    value: t.exposeID('value', {
      description: 'The curated row’s id, as deityIds or categoryIds takes it.',
    }),
    count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
  }),
});

export const ElementFacetCountRef = builder
  .objectRef<IngredientFacets['elements'][number]>('ElementFacetCount')
  .implement({
    description: 'An element, and how many entries it would list.',
    fields: (t) => ({
      value: t.expose('value', {
        type: IngredientElementEnum,
        description: 'The element, as elements takes it.',
      }),
      count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
    }),
  });

export const ToxicFacetCountRef = builder
  .objectRef<IngredientFacets['toxic'][number]>('ToxicFacetCount')
  .implement({
    description: 'A toxic setting other than any, and how many entries it would list.',
    fields: (t) => ({
      value: t.expose('value', {
        type: ToxicFilterEnum,
        description: 'toxic or not_toxic, as toxic takes it.',
      }),
      count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
    }),
  });

export const SourceFacetCountRef = builder
  .objectRef<WorkspaceIngredientFacets['source'][number]>('SourceFacetCount')
  .implement({
    description: 'A source, local or compendium, and how many entries it would list.',
    fields: (t) => ({
      value: t.expose('value', {
        type: IngredientSourceEnum,
        description: 'local or compendium, as source takes it.',
      }),
      count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
    }),
  });

const FACETS_DESCRIPTION =
  'Each kind is counted under the rest of the filter, leaving out that kind’s own choice, except categories under categoryMode all, which are counted with the chosen ones.';

/**
 * The seven kinds, written once for both types. Generic over the parent so
 * `CompendiumFacets`, which adds a field, takes them as they are.
 */
function facetFields<Parent extends IngredientFacets>(
  t: PothosSchemaTypes.ObjectFieldBuilder<BuilderTypes, Parent>,
) {
  return {
    forms: t.field({
      type: [NameFacetCountRef],
      description:
        'Every form some entry comes in, and every chosen form, most entries first, then by name. A form is spelled as its curated row, else as most entries spell it.',
      resolve: (facets) => facets.forms,
    }),
    deities: t.field({
      type: [IdFacetCountRef],
      description:
        'Every deity some entry is linked to, and every chosen one, most entries first, then by id.',
      resolve: (facets) => facets.deities,
    }),
    categories: t.field({
      type: [IdFacetCountRef],
      description:
        'Every category some entry or live form carries, and every chosen one, most entries first, then by id.',
      resolve: (facets) => facets.categories,
    }),
    zodiacSigns: t.field({
      type: [NameFacetCountRef],
      description: 'Every curated zodiac sign, by name, zeros included.',
      resolve: (facets) => facets.zodiacSigns,
    }),
    celestialBodies: t.field({
      type: [NameFacetCountRef],
      description: 'Every curated celestial body, by name, zeros included.',
      resolve: (facets) => facets.celestialBodies,
    }),
    elements: t.field({
      type: [ElementFacetCountRef],
      description: 'Every element, in the enum’s order, zeros included.',
      resolve: (facets) => facets.elements,
    }),
    toxic: t.field({
      type: [ToxicFacetCountRef],
      description: 'toxic, then not_toxic, zeros included.',
      resolve: (facets) => facets.toxic,
    }),
  };
}

// The coven's type carries the two settings only a coven's list has, and the
// compendium's carries No Refs, so the two stay separate types sharing
// `facetFields` rather than one type with nullable fields.
export const IngredientFacetsRef = builder
  .objectRef<WorkspaceIngredientFacets>('IngredientFacets')
  .implement({
    description: `How many of a coven’s ingredients each search filter value would list. ${FACETS_DESCRIPTION}`,
    fields: (t) => ({
      ...facetFields(t),
      source: t.field({
        type: [SourceFacetCountRef],
        description:
          'local, then compendium, zeros included: how many entries the list would hold with that source chosen, the rest of the filter kept, inStock and lowStockOnly included.',
        resolve: (facets) => facets.source,
      }),
      inStock: t.exposeInt('inStock', {
        description:
          'How many entries the list would hold with inStock on, the rest of the filter kept, source included: the same whether inStock is chosen or not.',
      }),
      lowStockOnly: t.exposeInt('lowStockOnly', {
        description:
          'How many entries the list would hold with lowStockOnly on, the rest of the filter kept, source included: the same whether lowStockOnly is chosen or not.',
      }),
    }),
  });

export const ReviewFacetCountRef = builder
  .objectRef<FacetCount<ReviewFacetValue>>('ReviewFacetCount')
  .implement({
    description: 'A Reviewed setting, and how many entries it would list (M14.8).',
    fields: (t) => ({
      value: t.boolean({
        description:
          'true for the reviewed entries, false for the ones needing review, as reviewed takes it.',
        resolve: (count) => count.value === 'reviewed',
      }),
      count: t.exposeInt('count', { description: COUNT_DESCRIPTION }),
    }),
  });

export const CompendiumFacetsRef = builder
  .objectRef<CompendiumFacets>('CompendiumFacets')
  .implement({
    description: `How many compendium entries each search filter value would list. ${FACETS_DESCRIPTION}`,
    fields: (t) => ({
      ...facetFields(t),
      withoutReferences: t.exposeInt('withoutReferences', {
        description:
          'How many entries cite no live reference, on themselves or a live form, under the rest of the filter: the same whether withoutReferences is chosen or not.',
      }),
      withoutForms: t.exposeInt('withoutForms', {
        description:
          'How many entries have no live form, under the rest of the filter: the same whether withoutForms is chosen or not.',
      }),
      reviewed: t.field({
        type: [ReviewFacetCountRef],
        nullable: true,
        description:
          'Reviewed, then needing review, under the rest of the filter, reviewed left out. Null to anyone but a curator or an admin: the review mark is theirs alone.',
        resolve: (facets) => facets.reviewed,
      }),
    }),
  });
