export interface HelpArticleTitleProps {
  title: string;
  /** Where a keeper edits the page: the pencil shows only with it. */
  editHref?: string;
  /** What the pencil edits, as its tip names it. */
  editName?: string;
}

export interface HelpPageHeadProps {
  heading?: string;
}
