'use client';

import type { ReactElement } from 'react';
import { SortableColumn } from '@/lib/sortable/column';
import type { SortableStepsProps } from './types';

// The jar's steps in order, each moved by a handle on the dnd-kit setup of `src/lib/sortable`; keyboard Space or Enter lifts, arrows, Home and End move, Escape cancels
// (claude-docs/components/spell-builder.md, "Reordering").

export function SortableSteps({ ids, names, onMove, children }: SortableStepsProps): ReactElement {
  return (
    <SortableColumn ids={ids} names={names} onMove={onMove} unequalHeights>
      <ol className="spell-steps__list" aria-label="Steps">
        {children}
      </ol>
    </SortableColumn>
  );
}
