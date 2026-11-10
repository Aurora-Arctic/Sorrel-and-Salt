import type { HelpAudience } from '@/modules/help';

export interface HelpSearchResult {
  kind: 'faq' | 'article' | 'guide' | 'term';
  /** A row that is not public carries a chip naming its audience. */
  audience: HelpAudience;
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpSearchResultsProps {
  /** The line under the heading, the help front page's own. */
  lede?: string;
  query: string;
  results: HelpSearchResult[];
}
