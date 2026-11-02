import { z } from 'zod';
import { requiredText } from '../../../lib/validation';

export const DocumentInput = z.object({
  title: requiredText('Write a title'),
  lede: requiredText('Write a lede'),
});
