import { useId, type ReactElement } from 'react';
import type { SourcingScoreProps } from './types';
import './index.scss';

// A compendium entry's sourcing score for a curator: the total as the heading, then each fact that
// made it with its points, so the sum can be checked by eye (claude-docs/components/sourcing-score.md).

/** Points with their sign: a gain `+10`, a loss `−3` with a true minus sign, none `0`. */
const signed = (points: number): string =>
  points > 0 ? `+${points}` : points < 0 ? `−${-points}` : '0';

export default function SourcingScore({ sourcing }: SourcingScoreProps): ReactElement {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="sourcing-score">
      <h3 id={heading} className="sourcing-score__heading">
        Sourcing Score: {sourcing.score}
      </h3>
      <ul className="sourcing-score__facts">
        {sourcing.facts.map(({ fact, label, points }) => (
          <li key={fact}>
            {label}: {signed(points)}
          </li>
        ))}
      </ul>
    </section>
  );
}
