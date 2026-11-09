import { z } from 'zod';
import { RowId, optionalText, requiredText } from '@/lib/validation';

const Kind = z.enum(['faq', 'article', 'term']);
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
  body: requiredText('Give the article a body'),
  audience: Audience.nullish(),
  summary: optionalText(),
  searchTerms: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
  childIds: ChildIds,
});

// `kind` is not here: an article keeps its kind, so a term never becomes an article beneath a parent.
export const HelpArticlePatch = z.object({
  title: requiredText('Give the article a title').nullish(),
  body: requiredText('Give the article a body').nullish(),
  audience: Audience.nullish(),
  summary: optionalText(),
  searchTerms: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
  childIds: ChildIds,
});
