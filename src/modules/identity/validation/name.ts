import { z } from 'zod';
import { limitedText } from '../../../lib/validation';

export const NAME_MAX_LENGTH = 100;

export const NameInput = z.object({
  name: limitedText('Enter a name', NAME_MAX_LENGTH),
});

export type NameInput = z.output<typeof NameInput>;
