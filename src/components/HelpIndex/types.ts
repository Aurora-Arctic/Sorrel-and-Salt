import type { HelpTermSource } from '../../lib/help-marks';
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
  /** The glossary, which the answers' `[[Term]]` marks are matched against; a mark it lacks is drawn as its text. */
  terms?: HelpTermSource[];
}
