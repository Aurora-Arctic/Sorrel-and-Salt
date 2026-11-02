import type { SourcingScore } from '@/modules/ingredients';

export interface SourcingScoreProps {
  /** The entry's score and every fact that made it, as the curator read returns them. */
  sourcing: SourcingScore;
  /** `panel`, the edit dialog's, shows the bar and every fact; `head`, the entry page's, shows the total with the facts behind a disclosure. */
  variant?: 'panel' | 'head';
}
