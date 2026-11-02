import type { SourcingScore } from '@/modules/ingredients';

export interface SourcingScoreProps {
  /** The entry's score and every fact that made it, as the curator read returns them. */
  sourcing: SourcingScore;
}
