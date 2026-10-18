import { builder } from '../../../graphql/builder';
import type { CupboardEntryNode, CupboardEntryRow } from '../types';
import { IngredientElementEnum, IngredientRef } from './ingredient';

// A coven's cupboard entry over the wire (M12.14): the coven's own say over
// one compendium entry, read beside the entry rather than merged into it, so
// a client can show both. Who may read it is the cupboard-entry service's
// check, through the loader (claude-docs/graphql/schema.md, "Cupboard
// entries: CupboardEntry and Ingredient.cupboardEntry").

/** The seven overrides; any one set makes the entry annotated. */
const OVERRIDES = [
  'label',
  'description',
  'safetyNotes',
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
] as const satisfies readonly (keyof CupboardEntryRow)[];

export const CupboardEntryRef = builder.objectRef<CupboardEntryNode>('CupboardEntry').implement({
  description:
    "A coven's own say over one compendium entry it holds. A null field is the compendium's value; an empty list is one the coven cleared.",
  fields: (t) => ({
    id: t.exposeID('id'),
    label: t.exposeString('label', {
      nullable: true,
      description: "What the coven calls the entry; null is the compendium's name.",
    }),
    description: t.exposeString('description', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    celestialBodies: t.exposeStringList('celestialBodies', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
    annotated: t.boolean({
      description: 'True when the coven has set any of the seven overrides.',
      resolve: (entry) => OVERRIDES.some((column) => entry[column] !== null),
    }),
    compendiumName: t.exposeString('compendiumName', {
      description: "The compendium entry's own name, whatever the coven's label.",
    }),
  }),
});

builder.objectField(IngredientRef, 'cupboardEntry', (t) =>
  t.field({
    type: CupboardEntryRef,
    nullable: true,
    description:
      "The coven's cupboard entry for this compendium entry; null for one it does not hold and for a coven's own ingredient.",
    args: { workspaceId: t.arg.id({ required: true }) },
    resolve: async (row, { workspaceId }, { loaders }) => {
      const entry = await loaders.cupboardEntryByIngredient.load({
        ingredientId: row.id,
        workspaceId,
      });
      return entry && { ...entry, compendiumName: row.name };
    },
  }),
);
