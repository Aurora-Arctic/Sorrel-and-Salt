'use client';

import type { ReactElement } from 'react';
import Notice from '../Notice';

// What the mint answered, shown once. The tokens live in this component's props alone: nothing here stores them.

export interface MintedBatch {
  batchId: string;
  expiresAt: Date | string;
  tokens: string[];
}

const MintedCards = ({
  batch,
  onDone,
}: {
  batch: MintedBatch;
  onDone: () => void;
}): ReactElement => (
  <div className="form">
    <Notice kind="warn">
      These codes cannot be shown again. Download them now: closing this dialog loses them.
    </Notice>
    <p>{batch.tokens.length} cards minted.</p>
    <button type="button" className="btn btn--solid" onClick={onDone}>
      Done
    </button>
  </div>
);

export default MintedCards;
