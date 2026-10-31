'use client';

import type { ReactElement, ReactPortal } from 'react';
import { createPortal } from 'react-dom';
import { useModalHeaderSlot } from '../Modal';
import type { FoldAllProps } from './types';

/**
 * Open All / Close All: Close All while any section is open. In a modal it is portalled into the
 * header's slot ahead of Undo and Redo, so render it before `FormHistoryButtons`; outside one, it sits
 * above the first section (claude-docs/components/collapsible-section.md).
 */
export function FoldAll({ anyOpen, onToggle, disabled }: FoldAllProps): ReactElement | ReactPortal {
  const headerSlot = useModalHeaderSlot();
  const button = (
    <button
      type="button"
      className="btn btn--quiet btn--small"
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
