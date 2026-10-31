'use client';

import { useState, type ReactElement } from 'react';
import { buildCardSheetsPdf } from '@/lib/invitation-cards';
import type { DiscardGuard } from '../Modal/types';
import { ConfirmQuestion } from '../Modal';
import Notice from '../Notice';

// What the mint answered, shown once. The tokens live in this component's props alone: nothing here stores them,
// and the print PDF is the only way to keep them.

export interface MintedBatch {
  batchId: string;
  expiresAt: Date | string;
  tokens: string[];
}

const linkOf = (token: string): string => `${window.location.origin}/i/${token}`;

/** Hands the browser a file to save, through a short-lived object URL. */
const saveFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const MintedCards = ({
  batch,
  guard,
  onDownloaded,
  onDone,
}: {
  batch: MintedBatch;
  /** Asks before a way out while the PDF is not yet downloaded. */
  guard: DiscardGuard;
  onDownloaded: () => void;
  onDone: () => void;
}): ReactElement => {
  const [building, setBuilding] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = batch.batchId.slice(0, 8);

  const downloadPdf = async (): Promise<void> => {
    setBuilding(true);
    setFailed(false);
    try {
      const bytes = await buildCardSheetsPdf({
        links: batch.tokens.map(linkOf),
        expiresAt: new Date(batch.expiresAt),
      });
      saveFile(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `cards-${name}.pdf`);
      onDownloaded();
    } catch {
      setFailed(true);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="form">
      <Notice kind="warn">
        These codes cannot be shown again. Download the PDF now: it is the only copy.
      </Notice>
      <p>{batch.tokens.length} cards minted.</p>
      {failed ? <Notice kind="error">The PDF could not be built. Try again.</Notice> : null}
      <button
        type="button"
        className="btn btn--solid"
        disabled={building}
        aria-busy={building}
        onClick={() => void downloadPdf()}
      >
        {building ? 'Building PDF' : 'Download PDF'}
      </button>
      <button type="button" className="btn" onClick={() => guard.request(onDone)}>
        Done
      </button>
      {guard.asking && (
        <ConfirmQuestion
          question="You haven't downloaded the PDF. These cards can't be printed later."
          confirmLabel="Close Anyway"
          keepLabel="Keep Open"
          busy={false}
          onConfirm={async () => guard.discard()}
          onKeep={guard.keepEditing}
        />
      )}
    </div>
  );
};

export default MintedCards;
