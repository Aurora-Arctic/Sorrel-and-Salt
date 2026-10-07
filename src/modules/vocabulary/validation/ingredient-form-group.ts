import { z } from 'zod';

// A form group as an admin writes one (M5.6b). No slug: it is derived from the
// name by src/lib/slugify.ts, never written beside it, so one in the input is
// dropped. No colour: a form group sections a dropdown, it colours no chip.
export const IngredientFormGroupInput = z.object({
  name: z
    .string({ error: 'Give the group a name' })
    .trim()
    .min(1, { error: 'Give the group a name' }),
  description: z
    .string({ error: 'Describe the group' })
    .trim()
    .min(1, { error: 'Describe the group' }),
});

export type IngredientFormGroupInput = z.output<typeof IngredientFormGroupInput>;
