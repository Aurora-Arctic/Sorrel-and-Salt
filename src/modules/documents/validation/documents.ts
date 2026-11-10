import { z } from 'zod';
import { trimEnds } from '../../../lib/formats';
import { requiredText } from '../../../lib/validation';

export const DocumentInput = z.object({
  title: requiredText('Write a title'),
  lede: requiredText('Write a lede', trimEnds),
});
