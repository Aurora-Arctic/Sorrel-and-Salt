import { useId, type ReactElement } from 'react';
import InfoTip from '../InfoTip';
import { Icon } from '../IconTip/icons';
import type { SourcingScoreProps } from './types';
import './index.scss';

// See claude-docs/components/sourcing-score.md.

const MAXIMUM = 100;

const signed = (points: number): string =>
  points > 0 ? `+${points}` : points < 0 ? `−${-points}` : '0';

type Kind = 'gain' | 'cost' | 'none';

const kindOf = (points: number): Kind => (points > 0 ? 'gain' : points < 0 ? 'cost' : 'none');

const KIND_ORDER: readonly Kind[] = ['gain', 'cost', 'none'];

const Glyph = ({ kind }: { kind: Kind }): ReactElement => (
  <Icon className="sourcing-score__glyph" viewBox="0 0 24 24" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    {kind === 'gain' && <path d="M8 12l3 3 5-6" />}
    {kind === 'cost' && <path d="M8 12h8" />}
  </Icon>
);

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

export default function SourcingScore({
  sourcing,
  headingLevel = 4,
}: SourcingScoreProps): ReactElement {
  const heading = useId();
  const tip = useId();
  const Heading = `h${headingLevel}` as const;

  const gained = sourcing.facts.reduce((sum, { points }) => sum + Math.max(points, 0), 0);
  const cost = sourcing.facts.reduce((sum, { points }) => sum - Math.min(points, 0), 0);
  // The bar never passes its track: gains stop at the maximum and costs take only what is left.
  const gainShare = Math.min(gained, MAXIMUM);
  const costShare = Math.min(cost, MAXIMUM - gainShare);

  return (
    <section aria-labelledby={heading} className="sourcing-score">
      <div className="sourcing-score__head">
        <Heading id={heading} className="sourcing-score__heading">
          Sourcing Score: {sourcing.score}
        </Heading>
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
