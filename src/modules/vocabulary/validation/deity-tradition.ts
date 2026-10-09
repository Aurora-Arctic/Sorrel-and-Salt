import { z } from 'zod';

// A deity tradition as an admin writes one (MB.132), a form group's shape. No
// slug: it is derived from the name by src/lib/slugify.ts, never written
// beside it, so one in the input is dropped. No colour: a tradition labels a
// suggestion, it colours no chip.
export const DeityTraditionInput = z.object({
  name: z
    .string({ error: 'Give the tradition a name' })
    .trim()
    .min(1, { error: 'Give the tradition a name' }),
  description: z
    .string({ error: 'Describe the tradition' })
    .trim()
    .min(1, { error: 'Describe the tradition' }),
});

export type DeityTraditionInput = z.output<typeof DeityTraditionInput>;
