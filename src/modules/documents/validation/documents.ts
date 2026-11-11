import { z } from 'zod';
import { trimEnds } from '../../../lib/formats';
import { requiredRowId, requiredText } from '../../../lib/validation';

export const DocumentInput = z.object({
  title: requiredText('Write a title'),
  lede: requiredText('Write a lede', trimEnds),
});

export const SummariesInput = z.object({
  summaries: z.array(
    z.object({
      versionId: requiredRowId('Choose a document version from the list'),
      summary: requiredText('Write what changed', trimEnds),
    }),
  ),
});
