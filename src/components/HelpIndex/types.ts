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
  /** One line beneath the heading, inside the search band. */
  lede?: string;
  /** Links drawn beneath the search box; the public front page reads them through `quickLinks` (src/lib/help-quick-links.ts). */
  quickLinks?: HelpSubpageLink[];
  /** The glossary, which the answers' `[[Term]]` marks are matched against; a mark it lacks is drawn as its text. */
  terms?: HelpTermSource[];
  /** The index above this one, linked under the search box as a guide links back: the staff index's way to Help. */
  back?: { href: string; title: string };
  /** Draws the link to Staff Help beneath the quick links: a curator's or keeper's alone (`helpViewerOffers`). */
  staffHelp?: boolean;
}
