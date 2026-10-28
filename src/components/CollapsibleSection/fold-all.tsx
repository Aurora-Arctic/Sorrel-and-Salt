'use client';

import type { ReactElement, ReactPortal } from 'react';
import { createPortal } from 'react-dom';
import { useModalHeaderSlot } from '../Modal';
import type { FoldAllProps } from './types';

/**
 * Open All / Close All, the one control that opens or shuts every section of
 * a form (MB.115, the owner's call): Close All while any section is open, so a
 * press from any mix folds the form to its summary lines. In a modal it sits
 * beside the title, portalled into the header's slot ahead of Undo and Redo,
 * so render it before `FormHistoryButtons`; outside one, at the end of the
 * line above the first section. The ingredient form's and the spell
 * builder's (claude-docs/components/collapsible-section.md).
 */
export function FoldAll({ anyOpen, onToggle, disabled }: FoldAllProps): ReactElement | ReactPortal {
  const headerSlot = useModalHeaderSlot();
  const button = (
    <button
      type="button"
      className="btn btn--small btn--quiet"
      disabled={disabled}
      onClick={onToggle}
    >
      {anyOpen ? 'Close All' : 'Open All'}
    </button>
  );
  return headerSlot ? (
    createPortal(button, headerSlot)
  ) : (
    <div className="collapsible-sections__fold-all">{button}</div>
  );
}
