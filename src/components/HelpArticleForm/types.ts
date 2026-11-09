import type { Route } from 'next';

export type HelpFormKind = 'faq' | 'article' | 'term';
export type HelpFormAudience = 'public' | 'staff' | 'keeper';

/** An article a guide may take as a sub page: one that holds none of its own. */
export interface HelpSubPageChoice {
  id: string;
  title: string;
  audience: HelpFormAudience;
  /** The guide it sits in now, or null at the top level. */
  parentId: string | null;
  parentTitle: string | null;
}

/** A live top-level article: a guide a row can sit under. */
export interface HelpGuideChoice {
  id: string;
  title: string;
  /** The guide's address segment, which a sub page's address begins with. */
  slug: string;
  audience: HelpFormAudience;
  /** How many live sub pages it holds now. */
  subPages: number;
}

/** The row a keeper edits, as the page opens it. */
export interface HelpArticleFormValue {
  id: string;
  kind: HelpFormKind;
  title: string;
  slug: string;
  summary: string | null;
  searchTerms: string | null;
  body: string;
  audience: HelpFormAudience;
  parentId: string | null;
  position: number | null;
  shown: boolean;
  /** Its live sub pages, in their order. */
  subPages: readonly HelpSubPageChoice[];
}

export interface HelpArticleFormProps {
  /** The row being edited; left out for a new one. */
  article?: HelpArticleFormValue;
  /** Every live guide, in reading order. */
  guides: readonly HelpGuideChoice[];
  /** Every live article that holds no sub pages, in reading order: what Sub Pages offers. */
  candidates: readonly HelpSubPageChoice[];
  /** A new row's guide, from the outline's Add Sub Page. */
  presetParentId?: string;
  /** Where Cancel, a save and a delete go: the outline at this row's guide. */
  returnHref: Route;
}

/** What the fields hold: the parent is `''` for none, and the position is the text typed. */
export interface HelpFormValues {
  kind: HelpFormKind;
  title: string;
  summary: string;
  searchTerms: string;
  body: string;
  audience: HelpFormAudience;
  parentId: string;
  position: string;
  childIds: string[];
  shown: boolean;
}

/** What the edit page's View link reads of a row and of its guide to find, or rule out, the row's reader page. */
export interface HelpViewLinkProps {
  article: { kind: string; audience: string; slug: string; shown: boolean };
  /** The row's guide, or null at the top level. */
  parent: { slug: string; shown: boolean } | null;
}
