import type { HelpTermSource } from '../../lib/help-marks';

export interface HelpSubpageLink {
  title: string;
  summary: string | null;
  href: string;
}

export type HelpGuideStep = Pick<HelpSubpageLink, 'title' | 'href'>;

export interface HelpArticleViewProps {
  /** The page's title, drawn as a level-two heading beneath the search box. */
  title: string;
  /** The level-one heading: Help, or Staff Help on a staff page. */
  heading?: string;
  /** Markdown, rendered with raw HTML as text. */
  body: string;
  subpages: HelpSubpageLink[];
  /** The glossary, which the body's `[[Term]]` marks are matched against; a mark it lacks is drawn as its text. */
  terms?: HelpTermSource[];
  /** On a sub page, the guide above it, linked between the search box and the title. */
  parent?: HelpGuideStep;
  /** The pages either side of this one in its guide (`guideSteps`), linked at the page's foot. */
  steps?: { previous?: HelpGuideStep; next?: HelpGuideStep };
}
