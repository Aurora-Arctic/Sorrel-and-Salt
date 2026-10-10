import { z } from 'zod';

/** The longest name the account page takes: room for any real name, not for a paragraph. */
export const NAME_MAX_LENGTH = 100;

// The name the site shows for an account, as its owner writes it (MB.88):
// trimmed, never blank, and bounded. Shared by NameForm and `setName`.
export const NameInput = z.object({
  name: z
    .string({ error: 'Enter a name' })
    .trim()
    .min(1, { error: 'Enter a name' })
    .max(NAME_MAX_LENGTH, { error: `Keep the name to ${NAME_MAX_LENGTH} characters` }),
});

export type NameInput = z.output<typeof NameInput>;
