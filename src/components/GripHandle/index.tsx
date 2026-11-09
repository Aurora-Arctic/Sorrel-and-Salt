'use client';

import type { ReactElement } from 'react';
import { GripIcon } from '../Combobox/icons';
import type { GripHandleProps } from './types';

// The button a sortable item is moved by: pointer and keyboard drag come from dnd-kit's listeners, and the sort
// list's keys from src/lib/sortable.

export default function GripHandle({
  sortable,
  name,
  className,
  describedBy,
  onFocus,
  onBlur,
  children,
}: GripHandleProps): ReactElement {
  const { setActivatorNodeRef, listeners, attributes } = sortable;
  // The button's own role stands; dnd-kit's would make it a second one. Its instructions follow `describedBy`.
  const { role: _role, 'aria-describedby': instructions, ...rest } = attributes;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={className}
      {...rest}
      {...listeners}
      aria-label={`Move ${name}`}
      aria-describedby={[describedBy, instructions].filter(Boolean).join(' ') || undefined}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <GripIcon />
      {children}
    </button>
  );
}
