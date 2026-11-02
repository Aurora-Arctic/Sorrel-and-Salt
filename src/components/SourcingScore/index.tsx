'use client';

import { useId, useState, type ReactElement } from 'react';
import InfoTip from '../InfoTip';
import { ChevronIcon } from '../IconTip/icons';
import type { SourcingScoreProps } from './types';
import './index.scss';

// A compendium entry's sourcing score for a curator: the total as the heading, a bar of what was
// gained and what it cost out of the maximum, then each fact that made it with its points, so the
// sum can be checked by eye. The `head` variant is the entry page's: the total, and the facts behind
// a disclosure (claude-docs/components/sourcing-score.md).

/** The most an entry can score, which the bar is drawn out of (`sourcing-weights.ts`). */
const MAXIMUM = 100;

/** Points with their sign: a gain `+10`, a loss `−3` with a true minus sign, none `0`. */
const signed = (points: number): string =>
  points > 0 ? `+${points}` : points < 0 ? `−${-points}` : '0';

type Kind = 'gain' | 'cost' | 'none';

const kindOf = (points: number): Kind => (points > 0 ? 'gain' : points < 0 ? 'cost' : 'none');

// Gains first, then costs, then the facts that earned nothing; each group keeps the order it came in.
const KIND_ORDER: readonly Kind[] = ['gain', 'cost', 'none'];

// A 1rem stroke circle: ticked for a gain, dashed for a cost, empty for nothing yet.
const Glyph = ({ kind }: { kind: Kind }): ReactElement => (
  <svg
    className="sourcing-score__glyph"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" />
    {kind === 'gain' && <path d="M8 12l3 3 5-6" />}
    {kind === 'cost' && <path d="M8 12h8" />}
  </svg>
);

/** The facts as rows: gains, then costs, then the zeros. */
function Facts({
  sourcing,
  className,
}: {
  sourcing: SourcingScoreProps['sourcing'];
  className: string;
}): ReactElement {
  const facts = KIND_ORDER.flatMap((kind) =>
    sourcing.facts.filter(({ points }) => kindOf(points) === kind),
  );
  return (
    <ul className={className}>
      {facts.map(({ fact, label, points }) => (
        <li key={fact} className={`sourcing-score__fact sourcing-score__fact--${kindOf(points)}`}>
          <Glyph kind={kindOf(points)} />
          <span>{label}</span>
          <span className="sourcing-score__points">{signed(points)}</span>
        </li>
      ))}
    </ul>
  );
}

const TIP = (
  <>
    How well the entry is sourced, out of {MAXIMUM}. Each fact&rsquo;s points are capped on their
    own, so the list adds up to the total.
  </>
);

// The entry page's head row: the total always shown, the facts behind a native disclosure.
function HeadScore({ sourcing }: SourcingScoreProps): ReactElement {
  const heading = useId();
  const tip = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="sourcing-score-head">
      <div className="sourcing-score__head">
        <h2 id={heading} className="sourcing-score-head__heading">
          Sourcing Score: {sourcing.score}
        </h2>
        <InfoTip id={tip} label="Sourcing Score">
          {TIP}
        </InfoTip>
      </div>
      <details
        className="sourcing-score-head__details"
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="sourcing-score-head__summary">
          <span className="sourcing-score-head__chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
          {open ? 'Hide the Facts' : 'Show the Facts'}
        </summary>
        <Facts sourcing={sourcing} className="sourcing-score-head__facts" />
      </details>
    </div>
  );
}

export default function SourcingScore({
  sourcing,
  variant = 'panel',
}: SourcingScoreProps): ReactElement {
  const heading = useId();
  const tip = useId();
  if (variant === 'head') return <HeadScore sourcing={sourcing} />;

  const gained = sourcing.facts.reduce((sum, { points }) => sum + Math.max(points, 0), 0);
  const cost = sourcing.facts.reduce((sum, { points }) => sum - Math.min(points, 0), 0);
  // The bar never passes its track: gains stop at the maximum and costs take only what is left.
  const gainShare = Math.min(gained, MAXIMUM);
  const costShare = Math.min(cost, MAXIMUM - gainShare);

  return (
    <section aria-labelledby={heading} className="sourcing-score">
      <div className="sourcing-score__head">
        <h4 id={heading} className="sourcing-score__heading">
          Sourcing Score: {sourcing.score}
        </h4>
        <InfoTip id={tip} label="Sourcing Score">
          {TIP}
        </InfoTip>
      </div>
      <div
        role="img"
        aria-label={`Gained ${gained}, cost ${cost}, out of ${MAXIMUM}`}
        className="sourcing-score__bar"
      >
        <span className="sourcing-score__gain" style={{ width: `${gainShare}%` }} />
        <span className="sourcing-score__cost" style={{ width: `${costShare}%` }} />
      </div>
      {/* The bar's numbers in text, so colour is never the only carrier; the bar's label says them to a screen reader. */}
      <p className="sourcing-score__key" aria-hidden="true">
        Gained +{gained} · Cost −{cost} · Out of {MAXIMUM}
      </p>
      <Facts sourcing={sourcing} className="sourcing-score__facts" />
    </section>
  );
}
