'use client';

import { type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import IconTip from '../IconTip';
import { useModalHeaderSlot } from '../Modal/header-slot';
import { useFormHistoryContext } from './form-history-context';
import { RedoIcon, UndoIcon } from '../IconTip';

/**
 * A form's Undo and Redo buttons and the live region saying what each did, read from `FormHistoryContext`; off when there is nothing to do
 * (claude-docs/components/field.md, "Undo and redo").
 */
export function FormHistoryButtons(): ReactElement | null {
  const history = useFormHistoryContext();
  const headerSlot = useModalHeaderSlot();
  if (!history) return null;
  const { undo, redo, canUndo, canRedo, announcement, undoButton, redoButton } = history;

  const buttons = (
    <span className="form-history">
      <IconTip tip="Undo">
        <button
          ref={undoButton}
          type="button"
          className="btn btn--quiet btn--small"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          <UndoIcon />
        </button>
      </IconTip>
      <IconTip tip="Redo">
        <button
          ref={redoButton}
          type="button"
          className="btn btn--quiet btn--small"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          <RedoIcon />
        </button>
      </IconTip>
    </span>
  );

  return (
    <>
      {headerSlot ? createPortal(buttons, headerSlot) : buttons}
      {/* Labelled, so that it is told from the list fields' own regions. */}
      <output className="visually-hidden" aria-label="Edit History">
        {announcement}
      </output>
    </>
  );
}
