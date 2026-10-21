'use client';

import { type ReactElement, useState } from 'react';
import Modal from '../Modal';
import { StockDialogModal } from '../StockDialog';
import type { StockData } from '../StockDialog/types';
import CovenChoice from './coven-choice';

// Edit Stock from a compendium entry's three dots (M9.12; the owner's call, 2026-10-21): the
// coven card's own dialog, opened from a menu item. With one coven that may update stock it
// opens at once; with two or more it first asks which, the way Annotate does. The jars and forms
// are the page's, read per viewer through the services, so nothing here reads or caches
// anything. The dialog reads the page again when it saves (`StockDialogForm`), so the card and
// the check follow. claude-docs/components/stock-dialog.md.

/** One coven that may update stock, with what its dialog shows. */
export interface StockPlace {
  workspaceId: string;
  name: string;
  stock: StockData;
}

export default function EditStock({
  places,
  ingredientId,
  ingredientName,
  defaultWorkspaceId,
  onClose,
  returnTo,
}: {
  /** The holding covens that permit updating stock; at least one. */
  places: readonly StockPlace[];
  ingredientId: string;
  /** The entry as the compendium calls it: the dialog's title. */
  ingredientName: string;
  defaultWorkspaceId: string;
  onClose: () => void;
  returnTo: () => HTMLElement | null | undefined;
}): ReactElement {
  const start = (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0])
    .workspaceId;
  const [chosen, setChosen] = useState(start);
  // Two or more: the question first. One: straight to the dialog.
  const [asked, setAsked] = useState(places.length === 1);
  const place = places.find(({ workspaceId }) => workspaceId === chosen) ?? places[0];

  if (asked) {
    return (
      <StockDialogModal
        workspaceId={place.workspaceId}
        ingredientId={ingredientId}
        ingredientName={ingredientName}
        forms={place.stock.forms}
        jars={place.stock.jars}
        onClose={onClose}
        returnTo={returnTo}
      />
    );
  }
  return (
    <Modal title="Edit Stock" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <div className="form">
          <CovenChoice
            options={places.map(({ workspaceId, name }) => ({ id: workspaceId, name }))}
            chosen={chosen}
            onChoose={setChosen}
          />
          <div className="modal__actions">
            <button type="button" className="btn btn--solid" onClick={() => setAsked(true)}>
              Continue
            </button>
            <button type="button" className="btn btn--quiet" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
