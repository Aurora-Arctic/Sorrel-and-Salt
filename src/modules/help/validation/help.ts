import { z } from 'zod';
import { trimEnds } from '@/lib/formats';
import { RowId, optionalText, requiredText } from '@/lib/validation';

const Kind = z.enum(['faq', 'article', 'guide', 'term']);
const Audience = z.enum(['public', 'staff', 'keeper']);
const Position = z
  .number()
  .int('Give the position as a whole number')
  .nonnegative('Give the position as 0 or more')
  .nullish();

const ChildIds = z
  .array(RowId, 'Choose articles as the children')
  .refine((ids) => new Set(ids).size === ids.length, 'Choose each child once')
  .nullish();

export const HelpArticleInput = z.object({
  kind: Kind,
  title: requiredText('Give the article a title'),
  body: requiredText('Give the article a body', trimEnds),
  audience: Audience.nullish(),
  summary: optionalText(trimEnds),
  searchTerms: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
  childIds: ChildIds,
});

// Every kind parses, so a save restating its own kind passes; the service refuses any change but article and guide.
export const HelpArticlePatch = z.object({
  kind: Kind.nullish(),
  title: requiredText('Give the article a title').nullish(),
  body: requiredText('Give the article a body', trimEnds).nullish(),
  audience: Audience.nullish(),
  summary: optionalText(trimEnds),
  searchTerms: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
  childIds: ChildIds,
});
