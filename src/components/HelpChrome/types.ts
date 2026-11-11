export interface HelpArticleTitleProps {
  title: string;
  /** Where a keeper edits the page: the pencil shows only with it. */
  editHref?: string;
  /** What the pencil edits, as its tip names it. */
  editName?: string;
}

export interface HelpPageHeadProps {
  heading?: string;
  /** The help layout's header already holds the heading and search box, so the page draws neither. */
  framed?: boolean;
}
