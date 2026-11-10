import { z } from 'zod';
import { limitMessage } from '../../../lib/formats';
import { requiredText } from '../../../lib/validation';

export const NAME_MAX_LENGTH = 100;

export const NameInput = z.object({
  name: requiredText('Enter a name').max(NAME_MAX_LENGTH, {
    error: limitMessage(NAME_MAX_LENGTH),
  }),
});

export type NameInput = z.output<typeof NameInput>;
