export type HelpArticleKind = 'faq' | 'article' | 'term';
export type HelpAudience = 'public' | 'staff' | 'keeper';

/** The widest audience a reader is admitted to: it reads that audience and every narrower-reach one below it. */
export type HelpReach = HelpAudience;

export interface HelpArticle {
  id: string;
  kind: HelpArticleKind;
  audience: HelpAudience;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  position: number | null;
  parentId: string | null;
  /** Whether readers see the row; a keeper sees it either way. */
  shown: boolean;
  /** The parent's slug, which a page address is built from; null for a top-level row. */
  parentSlug: string | null;
}

export type HelpArticleWithChildren = HelpArticle & { children: HelpArticle[] };

export interface HelpArticleInput {
  kind: HelpArticleKind;
  title: string;
  body: string;
  audience?: HelpAudience | null;
  summary?: string | null;
  position?: number | null;
  parentId?: string | null;
  /** The articles this one holds, in order; left out, its children stay as they are. */
  childIds?: readonly string[] | null;
}

export interface HelpArticlePatch {
  title?: string | null;
  body?: string | null;
  audience?: HelpAudience | null;
  summary?: string | null;
  position?: number | null;
  parentId?: string | null;
  childIds?: readonly string[] | null;
}

export type HelpListing = 'shown' | 'hidden' | 'all';

/** What the keeper's list narrows by; each left out admits every row. */
export interface HelpKeeperFilter {
  /** Shown rows, hidden rows, or both, by each row's own flag: a shown child of a hidden parent lists as shown. */
  listing?: HelpListing | null;
  /** Words the title contains, in any case. */
  query?: string | null;
  kind?: HelpArticleKind | null;
  audience?: HelpAudience | null;
}
