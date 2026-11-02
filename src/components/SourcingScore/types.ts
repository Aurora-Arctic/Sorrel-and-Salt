import type { SourcingScore } from '@/modules/ingredients';

export interface SourcingScoreProps {
  /** The entry's score and every fact that made it, as the curator read returns them. */
  sourcing: SourcingScore;
  /** The heading's level: 4 under the edit dialog's Sources section; 3 on the entry page, under its References h2. The look is the same. */
  headingLevel?: 3 | 4;
}
