export interface HelpSubpageLink {
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpArticleViewProps {
  /** The page's title, drawn as a level-two heading beneath the search box. */
  title: string;
  /** The level-one heading: Help, or Staff Help on a staff page. */
  heading?: string;
  /** Markdown, rendered with raw HTML as text. */
  body: string;
  subpages: HelpSubpageLink[];
}
