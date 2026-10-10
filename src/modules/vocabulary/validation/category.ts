import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

// A category as an admin writes one: a curated value under its group. No slug
// (curatedValueInput says why).
export const CategoryInput = curatedValueInput('category').extend({
  groupId: requiredRowId('Choose a group'),
});

export type CategoryInput = z.output<typeof CategoryInput>;
