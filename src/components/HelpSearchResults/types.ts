import type { HelpArticleKind, HelpAudience } from '@/modules/help';

export interface HelpSearchResult {
  kind: HelpArticleKind;
  /** A row that is not public carries a chip naming its audience. */
  audience: HelpAudience;
  title: string;
  summary: string | null;
  href: string;
}

export interface HelpSearchResultsProps {
  query: string;
  results: HelpSearchResult[];
}
