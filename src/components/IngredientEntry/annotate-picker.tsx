'use client';

import type { ReactElement } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import { ANNOTATE_HEADING } from './annotate-heading';
import CovenPickModal from './coven-pick-modal';
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
  const go = (chosen: string): void => {
    const href = (places.find(({ workspaceId }) => workspaceId === chosen) ?? places[0])
      .annotateHref;
    onClose();
    if (opener) opener.open(href, ANNOTATE_HEADING);
    else navigate(href);
  };
  return (
    <CovenPickModal
      title="Annotate"
      places={places}
      defaultWorkspaceId={defaultWorkspaceId}
      onContinue={go}
      onClose={onClose}
      returnTo={returnTo}
    />
  );
}
