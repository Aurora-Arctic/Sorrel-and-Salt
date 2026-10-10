import { z } from 'zod';
import { requiredRowId } from '../../../lib/validation';

// A category as an admin writes one. No slug: it is derived from the name by
// src/lib/slugify.ts, never written beside it, so one in the input is dropped.
export const CategoryInput = z.object({
  name: z
    .string({ error: 'Give the category a name' })
    .trim()
    .min(1, { error: 'Give the category a name' }),
  description: z
    .string({ error: 'Describe the category' })
    .trim()
    .min(1, { error: 'Describe the category' }),
  groupId: requiredRowId('Choose a group'),
});

export type CategoryInput = z.output<typeof CategoryInput>;
