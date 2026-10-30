import type { ReactElement } from 'react';
import IconTip from '../IconTip';
import { StockIcon } from '../StockBadge';
import { UnitsDifferIcon, NotEnoughIcon } from './supply-icon';
import type { StepSupply } from './steps/supply';

// The cupboard's verdict as a symbol alone in a button named by its words, whose IconTip says why;
// it only carries the tip to focus. Used in the In the Cupboard panel and the Quick Look
// (claude-docs/components/spell-recipe.md, "The side column").

/** The kinds that draw a mark: One-Off and No Jar are told in words, and nothing has none. */
export type VerdictKind = 'out' | 'short' | 'units-differ' | 'low';

const OutIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out className={className} />
);
const LowIcon = ({ className }: { className: string }): ReactElement => (
  <StockIcon out={false} className={className} />
);

const VERDICTS: Record<
  VerdictKind,
  { words: string; tone: string; Icon: (props: { className: string }) => ReactElement; tip: string }
> = {
  out: {
    words: 'Out',
    tone: 'out',
    Icon: OutIcon,
    tip: 'The jar is empty, so there is nothing to put in.',
  },
  short: {
    words: 'Not Enough',
    tone: 'low',
    Icon: NotEnoughIcon,
    tip: 'The jar holds less than this step needs.',
  },
  'units-differ': {
    words: 'Units Differ',
    tone: 'muted',
    Icon: UnitsDifferIcon,
    tip: 'The units don’t match, so it can’t tell if you have enough.',
  },
  low: {
    words: 'Low',
    tone: 'low',
    Icon: LowIcon,
    tip: 'The jar is at or below the coven’s Low mark.',
  },
};

/** The kind `supply` draws as a mark, or null where it draws none. */
export const verdictOf = (supply: StepSupply | null): VerdictKind | null =>
  supply !== null && supply.kind in VERDICTS ? (supply.kind as VerdictKind) : null;

export function VerdictMark({ kind }: { kind: VerdictKind }): ReactElement {
  const { words, tone, Icon, tip } = VERDICTS[kind];
  return (
    <span className={`spell-inventory__verdict is-${tone}`}>
      <IconTip tip={tip}>
        <button type="button" className="spell-inventory__mark" aria-label={words}>
          <Icon className="spell-inventory__icon" />
        </button>
      </IconTip>
    </span>
  );
}
