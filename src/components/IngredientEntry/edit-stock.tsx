'use client';

import { type ReactElement, useState } from 'react';
import Modal from '../Modal';
import { StockDialogModal } from '../StockDialog';
import type { StockData } from '../StockDialog/types';
import CovenChoice from './coven-choice';

// Edit Stock from a compendium entry's three dots: the coven card's own dialog, opened at once for
// one coven that may update stock and after asking which for two or more
// (claude-docs/components/ingredient-entry.md, "Structure").

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
  namesCoven = false,
  onClose,
  returnTo,
}: {
  places: readonly StockPlace[];
  ingredientId: string;
  ingredientName: string;
  defaultWorkspaceId: string;
  namesCoven?: boolean;
  onClose: () => void;
  returnTo: () => HTMLElement | null | undefined;
}): ReactElement {
  const start = (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0])
    .workspaceId;
  const [chosen, setChosen] = useState(start);
  const [asked, setAsked] = useState(places.length === 1);
  const place = places.find(({ workspaceId }) => workspaceId === chosen) ?? places[0];

  if (asked) {
    return (
      <StockDialogModal
        workspaceId={place.workspaceId}
        ingredientId={ingredientId}
        ingredientName={ingredientName}
        coven={namesCoven ? place.name : undefined}
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
