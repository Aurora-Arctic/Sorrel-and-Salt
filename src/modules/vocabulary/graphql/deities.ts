import { builder } from '../../../graphql/builder';
import type { DeityRow, DeityTraditionRow } from '../types';

// A curated deity and its tradition, as an ingredient's picked deity reads
// them (MB.167): the shape `IngredientFormValue` and its group have, since a
// tradition tells two same-named deities apart as a group does two forms.
// Public reference data, so no scope; no query lists them yet.

export const DeityTraditionRef = builder.objectRef<DeityTraditionRow>('DeityTradition').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
  }),
});

export const DeityRef = builder.objectRef<DeityRow>('Deity').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
    // The tradition is what tells two same-named deities apart: "Hecate (Greek)".
    tradition: t.field({
      type: DeityTraditionRef,
      resolve: (deity, _args, { loaders }) => loaders.deityTraditionsById.load(deity.traditionId),
    }),
  }),
});
