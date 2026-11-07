export interface HelpSearchResult {
  kind: 'faq' | 'article' | 'term';
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpSearchResultsProps {
  query: string;
  results: HelpSearchResult[];
}
