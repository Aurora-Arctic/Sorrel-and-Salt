import { z } from 'zod';

// A curated form as an admin writes one (M5.6a). No slug: it is derived from
// the name and the group's name by src/lib/slugify.ts, never written beside
// them, so one in the input is dropped. `endRedirect` is the admin's
// confirmation that a rename may move a compendium entry onto an address
// another entry's redirect still runs from (MB.82).
export const IngredientFormValueInput = z.object({
  name: z
    .string({ error: 'Give the form a name' })
    .trim()
    .min(1, { error: 'Give the form a name' }),
  description: z
    .string({ error: 'Describe the form' })
    .trim()
    .min(1, { error: 'Describe the form' }),
  groupId: z.uuid({ error: 'Choose a group' }),
  endRedirect: z.boolean().optional(),
});

export type IngredientFormValueInput = z.output<typeof IngredientFormValueInput>;
