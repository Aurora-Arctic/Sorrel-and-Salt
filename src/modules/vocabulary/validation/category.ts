import { z } from 'zod';
import { curatedValueInput, requiredRowId } from '../../../lib/validation';

export const CategoryInput = curatedValueInput('category').extend({
  groupId: requiredRowId('Choose a group'),
});

export type CategoryInput = z.output<typeof CategoryInput>;
