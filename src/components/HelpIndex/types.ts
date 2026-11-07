import type { HelpSubpageLink } from '../HelpArticleView/types';

export interface HelpFaqEntry {
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
}

export interface HelpIndexProps {
  faq: HelpFaqEntry[];
  articles: HelpSubpageLink[];
  /** Shown above the FAQ when the page is the staff index. */
  heading?: string;
}
