import { slugify } from '../../../lib/slugify';
import type { SeedHelpArticle } from '../types';

type Audience = SeedHelpArticle['audience'];

/** An FAQ question, public, at its place in the list. */
export function faq(position: number, title: string, body: string): SeedHelpArticle {
  return {
    seedKey: `faq/${slugify(title)}`,
    kind: 'faq',
    audience: 'public',
    title,
    summary: null,
    body,
    position,
    parent: null,
  };
}

/** A glossary term: public, with no position and no parent. */
export function term(title: string, body: string): SeedHelpArticle {
  return {
    seedKey: `term/${slugify(title)}`,
    kind: 'term',
    audience: 'public',
    title,
    summary: null,
    body,
    position: null,
    parent: null,
  };
}

/** A top-level article. */
export function article(
  position: number,
  title: string,
  summary: string,
  body: string,
  audience: Audience = 'public',
): SeedHelpArticle {
  return {
    seedKey: `article/${slugify(title)}`,
    kind: 'article',
    audience,
    title,
    summary,
    body,
    position,
    parent: null,
  };
}

/** A sub page of `parent`, at the parent's audience unless one is given. */
export function subPage(
  parent: SeedHelpArticle,
  position: number,
  title: string,
  summary: string,
  body: string,
  audience: Audience = parent.audience,
): SeedHelpArticle {
  return {
    seedKey: `${parent.seedKey}/${slugify(title)}`,
    kind: 'article',
    audience,
    title,
    summary,
    body,
    position,
    parent: parent.seedKey,
  };
}
