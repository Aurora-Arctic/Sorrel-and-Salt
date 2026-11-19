/** Which heading a page's title is: `article` is a page that stands under the Help heading when it is staff help and is the page's heading under the public help header; the others are fixed. */
export type HelpArticleTitleLevel = 'h1' | 'h2' | 'article';

export interface HelpArticleTitleProps {
  title: string;
  /** The heading the title is, `h2` unless set. */
  level?: HelpArticleTitleLevel;
  /** Where a keeper edits the page: the pencil shows only with it. */
  editHref?: string;
  /** What the pencil edits, as its tip names it. */
  editName?: string;
}

export interface HelpPageHeadProps {
  heading?: string;
}
