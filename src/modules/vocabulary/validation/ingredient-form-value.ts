import type { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A curated form as an admin writes one. No slug: it is derived from
// the name and the group's name by src/lib/slugify.ts, never written beside
// them, so one in the input is dropped. No `endRedirect` either:
// a rename moves no compendium entry's address, so ends no redirect.
export const IngredientFormValueInput = curatedValueInput('form').extend({
  groupId: requiredRowId('Choose a group'),
});

export type IngredientFormValueInput = z.output<typeof IngredientFormValueInput>;
