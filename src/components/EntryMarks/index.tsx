import type { ReactElement } from 'react';
import type { EntryMarksProps } from './types';
import TipMark from './tip-mark';
import './index.scss';

// The badges saying whose an ingredient entry is: Local, Compendium,
// Annotated, Retired. One component so the entry page's
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
      {/* Annotated says the entry is from the Compendium and changed, so it takes
          Compendium's place; an unannotated entry shows Compendium, bare. */}
      {held && !retired && !annotated && (
        <output className="badge badge--low-stock">Compendium</output>
      )}
      {/* A compendium entry the curators retired, read because this coven's
          cupboard names it (M12.24): a button opening its own tip. */}
      {retired && (
        <TipMark
          label="Retired"
          palette="retired"
          tip="No longer in the Compendium; your coven still has it."
        />
      )}
      {held && annotated && (
        <TipMark
          label="Annotated"
          palette="annotated"
          tip="From the Compendium, with your coven's own changes."
        />
      )}
    </>
  );
};

export default EntryMarks;
export type { EntryKind, EntryMarksProps } from './types';
