import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { clearIngredientChildren } from '../loaders/ingredient-children';
import { promoteFolkName } from '../services/promote-folk-name';
import { IngredientRef } from './ingredient';

// Swaps an ingredient's display name with one of its common names (folk
// names). One mutation over both tiers, as `createReference` is: a null
// workspaceId names a compendium entry and takes the admin scope; otherwise
// any signed-in caller may ask and the membership check in the service decides.
const tierScope = (_root: unknown, { workspaceId }: { workspaceId?: string | null }) =>
  workspaceId == null ? { curator: true } : { signedIn: true };

builder.mutationField('promoteFolkName', (t) =>
  t.field({
    type: IngredientRef,
    description:
      "Makes a common name the ingredient's display name, and the old display name a common name. A null workspaceId names a compendium entry, under the admin proof.",
    args: {
      workspaceId: t.arg.id({ required: false }),
      id: t.arg.id({ required: true }),
      folkNameId: t.arg.id({ required: true }),
    },
    authScopes: tierScope,
    resolve: async (_root, { workspaceId, id, folkNameId }, { loaders, ...context }) => {
      const row = await promoteFolkName(sessionOf(context), workspaceId ?? null, id, folkNameId);
      // An earlier root field of this request may have read the folk names.
      clearIngredientChildren(loaders, row);
      return row;
    },
  }),
);
