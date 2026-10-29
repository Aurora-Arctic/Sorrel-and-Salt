import type { ReactElement } from 'react';
import { StockBadge } from '../../StockBadge';
import { withUnit } from '../../StockBadge/stock-words';
import type { StepSupply } from './supply';

// A step's supply, drawn (M10.19). Out and Low are StockBadge's own, so they read as
// they do on the card. The rest are words, so no state rests on colour: a one-off is
// marked One-Off, "gather this" not being the instruction for it.

export function SupplyMark({ supply }: { supply: StepSupply | null }): ReactElement | null {
  if (supply === null) return null;
  switch (supply.kind) {
    case 'no-jar':
      // No jar is told in words, not as a badge (the owner, 2026-10-29).
      return null;
    case 'out':
      return <StockBadge quantity={0} threshold={supply.jar.threshold} unit={supply.jar.unit} />;
    case 'low':
      return (
        <StockBadge
          quantity={supply.jar.quantity}
          threshold={supply.jar.threshold}
          unit={supply.jar.unit}
        />
      );
    case 'short':
      return (
        <span className="badge">
          Not Enough{' '}
          <span className="visually-hidden">: {withUnit(supply.held, supply.unit)} held</span>
        </span>
      );
    case 'units-differ':
      return <span className="badge badge--draft">Units Differ</span>;
    case 'one-off':
      return <span className="badge badge--local">One-Off</span>;
  }
}
