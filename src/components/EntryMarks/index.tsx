import type { ReactElement } from 'react';
import type { EntryMarksProps } from './types';

// The badges saying whose an ingredient entry is: Local, From the Compendium,
// Annotated, No Longer in the Compendium. One component so the entry page's
// head and the ingredient card cannot drift (M8.14). It takes the kind and the
// two flags as props and works none of them out from the data. It renders the
// badges bare, with no wrapper, so a caller can set the Toxic mark in the same
// row. claude-docs/components/entry-marks.md.
const EntryMarks = ({
  kind,
  annotated = false,
  retired = false,
}: EntryMarksProps): ReactElement => {
  const held = kind === 'cupboard';
  return (
    <>
      {kind === 'own' && <span className="badge badge--local">Local</span>}
      {/* Where the row lives, as Local is, and in a neutral tint: neither is a warning. */}
      {held && !retired && <output className="badge badge--low-stock">From the Compendium</output>}
      {held && annotated && <output className="badge badge--low-stock">Annotated</output>}
      {/* A compendium entry the curators retired, read because this coven's
          cupboard names it (M12.24). An `output`, so it carries the status
          role: on the page from the start, never announced. */}
      {retired && <output className="badge badge--retired">No Longer in the Compendium</output>}
    </>
  );
};

export default EntryMarks;
export type { EntryKind, EntryMarksProps } from './types';
