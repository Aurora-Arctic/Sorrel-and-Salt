import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A curated form as an admin writes one (M5.6a). No slug: it is derived from
// the name and the group's name by src/lib/slugify.ts, never written beside
// them, so one in the input is dropped. `endRedirect` is the admin's
// confirmation that a rename may move a compendium entry onto an address
// another entry's redirect still runs from (MB.82).
export const IngredientFormValueInput = curatedValueInput('form').extend({
  groupId: requiredRowId('Choose a group'),
  endRedirect: z.boolean().optional(),
});

export type IngredientFormValueInput = z.output<typeof IngredientFormValueInput>;
