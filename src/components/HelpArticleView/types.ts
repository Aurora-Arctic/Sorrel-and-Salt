export interface HelpSubpageLink {
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpArticleViewProps {
  title: string;
  /** Markdown, rendered with raw HTML as text. */
  body: string;
  subpages: HelpSubpageLink[];
}
