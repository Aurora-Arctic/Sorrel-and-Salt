'use client';

import { useState, type ReactElement } from 'react';
import { buildCardSheetsPdf } from '@/lib/invitation-cards';
import type { DiscardGuard } from '../Modal/types';
import { ConfirmQuestion } from '../Modal';
import { dayInUtc, printedDateOf } from '../../lib/utc';
import Notice from '../Notice';
import { batchName } from './batches';
import { saveFile } from './save-file';
import { CARDS_PER_SHEET } from '../../lib/invitation-cards/limits';

// What the mint answered, shown once. The tokens live in this component's props alone: nothing here stores them,
// and the print PDF is the only way to keep them.

export interface MintedBatch {
  batchId: string;
  expiresAt: Date | string;
  tokens: string[];
}

const linkOf = (token: string): string => `${window.location.origin}/i/${token}`;

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
  const [saved, setSaved] = useState(false);
  const name = batchName(batch.batchId);
  const sheets = Math.ceil(batch.tokens.length / CARDS_PER_SHEET);

  const downloadPdf = async (): Promise<void> => {
    setBuilding(true);
    setFailed(false);
    try {
      const bytes = await buildCardSheetsPdf({
        links: batch.tokens.map(linkOf),
        expiresAt: new Date(batch.expiresAt),
      });
      saveFile(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `cards-${name}.pdf`);
      setSaved(true);
      onDownloaded();
    } catch {
      setFailed(true);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="form">
      <div aria-live="polite">
        {saved ? (
          <Notice kind="success" inRegion>
            Saved as cards-{name}.pdf. Keep that file: it is the only copy of these cards.
          </Notice>
        ) : (
          <Notice kind="warn">
            Download the PDF now. It is the only copy of these cards and cannot be made again.
          </Notice>
        )}
      </div>
      <p>
        {batch.tokens.length} cards on {sheets} {sheets === 1 ? 'sheet' : 'sheets'}, batch {name},
        expiring {dayInUtc(printedDateOf(new Date(batch.expiresAt)))}.
      </p>
      {failed ? <Notice kind="error">The PDF could not be built. Try again.</Notice> : null}
      <div className="modal__actions">
        <button
          type="button"
          className="btn btn--solid"
          disabled={building}
          aria-busy={building}
          onClick={() => void downloadPdf()}
        >
          {building ? 'Building PDF' : saved ? 'Download Again' : 'Download PDF'}
        </button>
        <button type="button" className="btn btn--quiet" onClick={() => guard.request(onDone)}>
          Done
        </button>
      </div>
      {guard.asking && (
        <ConfirmQuestion
          question="You haven't downloaded the PDF. These cards can't be printed later."
          details={<p>The cards stay minted. To cancel them, revoke the batch from the list.</p>}
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
