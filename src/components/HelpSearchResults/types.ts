export interface HelpSearchResult {
  kind: 'faq' | 'article' | 'term';
  /** `public`, or a staff audience: a row that is not public is labelled Staff. */
  audience: string;
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpSearchResultsProps {
  query: string;
  results: HelpSearchResult[];
}
