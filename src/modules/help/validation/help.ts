import { z } from 'zod';
import { RowId, optionalText, requiredText } from '@/lib/validation';

const Kind = z.enum(['faq', 'article', 'term']);
const Audience = z.enum(['public', 'staff', 'keeper']);
const Position = z.number().int().nullish();

// A slug is optional text here; the service runs it through slugify and refuses what leaves nothing.
const Slug = z.string().nullish();

export const HelpArticleInput = z.object({
  kind: Kind,
  title: requiredText('Give the article a title'),
  body: requiredText('Give the article a body'),
  audience: Audience.nullish(),
  slug: Slug,
  summary: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
});

// `kind` is not here: an article keeps its kind, so a term never becomes an article beneath a parent.
export const HelpArticlePatch = z.object({
  title: requiredText('Give the article a title').nullish(),
  body: requiredText('Give the article a body').nullish(),
  audience: Audience.nullish(),
  slug: Slug,
  summary: optionalText(),
  position: Position,
  parentId: RowId.nullish(),
});
