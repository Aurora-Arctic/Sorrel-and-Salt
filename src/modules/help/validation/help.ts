import { z } from 'zod';
import { RowId, optionalText, requiredText } from '@/lib/validation';
import { helpArticleKind, helpAudience } from '../schema/help-articles';

const Kind = z.enum(helpArticleKind.enumValues);
const Audience = z.enum(helpAudience.enumValues);
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

// Every kind parses, so a save restating its own kind passes; the service refuses any change but article and guide.
export const HelpArticlePatch = z.object({
  kind: Kind.nullish(),
  title: requiredText('Give the article a title').nullish(),
  body: requiredText('Give the article a body').nullish(),
  audience: Audience.nullish(),
  summary: optionalText(),
  searchTerms: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
  childIds: ChildIds,
});
