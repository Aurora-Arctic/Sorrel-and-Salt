'use client';

import { type ReactElement, useState } from 'react';
import Modal from '../Modal';
import CovenChoice from './lazy-coven-choice';

/** Asks which coven, starting on the default one, then hands the choice to `onContinue`; each caller keeps its own next step. */
export default function CovenPickModal({
  title,
  places,
  defaultWorkspaceId,
  onContinue,
  onClose,
  returnTo,
}: {
  title: string;
  places: readonly { workspaceId: string; name: string }[];
  defaultWorkspaceId: string;
  onContinue: (workspaceId: string) => void;
  onClose: () => void;
  returnTo: () => HTMLElement | null | undefined;
}): ReactElement {
  const [chosen, setChosen] = useState(
    (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0]).workspaceId,
  );
  return (
    <Modal title={title} onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <div className="form">
          <CovenChoice
            options={places.map(({ workspaceId, name }) => ({ id: workspaceId, name }))}
            chosen={chosen}
            onChoose={setChosen}
          />
          <div className="modal__actions">
            <button type="button" className="btn btn--solid" onClick={() => onContinue(chosen)}>
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
