'use client';

import { type ReactElement, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import Modal from '../Modal';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { ANNOTATE_HEADING } from './annotate-heading';
import CovenChoice from './lazy-coven-choice';
import type { CupboardPlace } from './types';

export default function AnnotatePicker({
  places,
  defaultWorkspaceId,
  onClose,
  returnTo,
}: {
  places: readonly Pick<CupboardPlace, 'workspaceId' | 'name' | 'annotateHref'>[];
  defaultWorkspaceId: string;
  onClose: () => void;
  returnTo: () => HTMLElement | null | undefined;
}): ReactElement {
  const opener = useRouteModalOpener();
  const { navigate } = usePendingNavigation();
  const [chosen, setChosen] = useState(
    (places.find(({ workspaceId }) => workspaceId === defaultWorkspaceId) ?? places[0]).workspaceId,
  );
  const go = (): void => {
    const href = (places.find(({ workspaceId }) => workspaceId === chosen) ?? places[0])
      .annotateHref;
    onClose();
    if (opener) opener.open(href, ANNOTATE_HEADING);
    else navigate(href);
  };
  return (
    <Modal title="Annotate" onClose={onClose} returnTo={returnTo}>
      {(close) => (
        <div className="form">
          <CovenChoice
            options={places.map(({ workspaceId, name }) => ({ id: workspaceId, name }))}
            chosen={chosen}
            onChoose={setChosen}
          />
          <div className="modal__actions">
            <button type="button" className="btn btn--solid" onClick={go}>
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
