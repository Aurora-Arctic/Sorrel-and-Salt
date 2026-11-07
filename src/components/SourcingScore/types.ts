import type { SourcingScore } from '@/modules/ingredients';

export interface SourcingScoreProps {
  sourcing: SourcingScore;
  /** The heading's level: 4 under the edit dialog's Sources section; 3 on the entry page, under its References h2. The look is the same. */
  headingLevel?: 3 | 4;
}
