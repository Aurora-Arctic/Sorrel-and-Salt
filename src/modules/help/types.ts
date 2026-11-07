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
}

export type HelpArticleWithChildren = HelpArticle & { children: HelpArticle[] };

export interface HelpArticleInput {
  kind: HelpArticleKind;
  title: string;
  body: string;
  audience?: HelpAudience | null;
  slug?: string | null;
  summary?: string | null;
  position?: number | null;
  parentId?: string | null;
}

export interface HelpArticlePatch {
  title?: string | null;
  body?: string | null;
  audience?: HelpAudience | null;
  slug?: string | null;
  summary?: string | null;
  position?: number | null;
  parentId?: string | null;
}
