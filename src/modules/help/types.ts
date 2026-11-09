export type HelpArticleKind = 'faq' | 'article' | 'guide' | 'term';
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
  /** A top-level article becomes a guide, and a guide holding no sub page an article; no other kind changes. */
  kind?: HelpArticleKind | null;
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
  /** Words the title or the body contains, in any case. */
  query?: string | null;
  kind?: HelpArticleKind | null;
  /** Rows of any of these kinds, as the top level mixes guides and articles; with `kind` too, a row passes both. */
  kinds?: readonly HelpArticleKind[] | null;
  audience?: HelpAudience | null;
  /** Top-level rows alone: the guides and articles with no parent, and no sub page among them. */
  topLevel?: boolean | null;
  /** A to Z by title, the default, or in position order, as readers meet them. */
  order?: 'title' | 'position' | null;
}

/** What a title change would leave pointing at the old address, read before the save is committed. */
export interface HelpRenameEffects {
  /** The address the row holds now, and the one the new title gives it; the same when the slug does not move. */
  oldPath: string;
  newPath: string;
  /** Every other live row whose body holds the old address or, for a term, marks the old title. */
  articles: HelpArticle[];
  /** The front page's quick link titles that read the old slug, which drop out once it moves. */
  quickLinks: string[];
}
