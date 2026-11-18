'use client';

import { type ReactElement, useContext } from 'react';
import { SortableMoveContext } from '@/lib/sortable/move';
import { useAnnounce } from '../ClickFeedback/status-region';
import { GripIcon } from '../Combobox/icons';
import { ChevronIcon } from '../IconTip/icons';
import type { GripHandleProps } from './types';
import './index.scss';

// The controls a sortable item is moved by: the grip, for pointer and keyboard drag from dnd-kit's listeners and the sort
// list's keys from src/lib/sortable, and beside it Move Up and Move Down, single presses for a person who cannot drag.

export default function GripHandle({
  sortable,
  name,
  className,
  describedBy,
  disabled,
  onFocus,
  onBlur,
  children,
}: GripHandleProps): ReactElement {
  const { setActivatorNodeRef, listeners, attributes, index, items } = sortable;
  const moving = useContext(SortableMoveContext);
  const announce = useAnnounce();
  // The button's own role stands; dnd-kit's would make it a second one. Its instructions follow `describedBy`.
  const { role: _role, 'aria-describedby': instructions, ...rest } = attributes;

  const unavailable = (by: -1 | 1) => disabled || index + by < 0 || index + by >= items.length;
  const press = (by: -1 | 1) => {
    if (!moving || unavailable(by)) return;
    moving.onMove(index, index + by);
    if (!moving.saysMove)
      announce(`${name} moved to position ${index + by + 1} of ${items.length}.`);
  };
  // aria-disabled, not disabled: a disabled button drops the focus a press at the end of the list had.
  const mover = (by: -1 | 1, label: string) => (
    <button
      type="button"
      className="grip-handle__move"
      aria-label={`${label} ${name}`}
      aria-disabled={unavailable(by) || undefined}
      onClick={() => press(by)}
    >
      <ChevronIcon className={by < 0 ? 'grip-handle__up' : 'grip-handle__down'} />
    </button>
  );

  return (
    <>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={className}
        {...rest}
        {...listeners}
        disabled={disabled}
        aria-label={`Move ${name}`}
        aria-describedby={[describedBy, instructions].filter(Boolean).join(' ') || undefined}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <GripIcon />
        {children}
      </button>
      {moving && (
        <>
          {mover(-1, 'Move Up')}
          {mover(1, 'Move Down')}
        </>
      )}
    </>
  );
}
