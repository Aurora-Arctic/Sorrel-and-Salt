import { z } from 'zod';

// A curated deity as an admin writes one (MB.132), a form's shape with its
// tradition in place of a group. No slug: it is derived from the name by
// src/lib/slugify.ts, never written beside it, so one in the input is dropped.
// No `endRedirect`, which a form's input carries: a deity is no part of a
// compendium entry's address, so its rename ends no redirect.
export const DeityInput = z.object({
  name: z
    .string({ error: 'Give the deity a name' })
    .trim()
    .min(1, { error: 'Give the deity a name' }),
  description: z
    .string({ error: 'Describe the deity' })
    .trim()
    .min(1, { error: 'Describe the deity' }),
  traditionId: z.uuid({ error: 'Choose a tradition' }),
});

export type DeityInput = z.output<typeof DeityInput>;
