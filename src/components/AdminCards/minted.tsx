'use client';

import { useState, type ReactElement } from 'react';
import { buildCardSheetsPdf, cardQrSvg } from '@/lib/invitation-cards';
import Notice from '../Notice';

// What the mint answered, shown once. The tokens live in this component's props alone: nothing here stores them.

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
  onDone,
}: {
  batch: MintedBatch;
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
    } catch {
      setFailed(true);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="form">
      <Notice kind="warn">
        These codes cannot be shown again. Download them now: closing this dialog loses them.
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
      <ul className="admin-cards__minted">
        {batch.tokens.map((token, index) => {
          const svg = cardQrSvg(linkOf(token));
          const label = `Card ${index + 1}`;
          return (
            <li key={token}>
              <img
                alt={`Code for ${label}`}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                width={96}
                height={96}
              />
              <button
                type="button"
                className="btn"
                aria-label={`Download ${label}`}
                onClick={() =>
                  saveFile(
                    new Blob([svg], { type: 'image/svg+xml' }),
                    `card-${name}-${index + 1}.svg`,
                  )
                }
              >
                Download
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn" onClick={onDone}>
        Done
      </button>
    </div>
  );
};

export default MintedCards;
