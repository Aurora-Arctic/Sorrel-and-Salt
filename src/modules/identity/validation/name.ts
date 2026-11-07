import { z } from 'zod';
import { requiredText } from '../../../lib/validation';

export const NAME_MAX_LENGTH = 100;

export const NameInput = z.object({
  name: requiredText('Enter a name').max(NAME_MAX_LENGTH, {
    error: `Keep the name to ${NAME_MAX_LENGTH} characters`,
  }),
});

export type NameInput = z.output<typeof NameInput>;
