import type { ReactElement } from 'react';
import type { EntryMarksProps } from './types';
import TipMark from './tip-mark';
import './index.scss';

// The badges saying whose an ingredient entry is: Local, Compendium,
// Annotated, Retired (New and Updated are RecencyMark, which sits elsewhere). One component so the entry page's
// head and the ingredient card cannot drift (M8.14). It takes the kind and the
// two flags as props and works none of them out from the data. It renders the
// badges bare, with no wrapper, so a caller can set the Toxic mark in the same
// row. claude-docs/components/entry-marks.md.
const EntryMarks = ({
  kind,
  annotated = false,
  retired = false,
  inCoven = false,
}: EntryMarksProps): ReactElement => {
  const held = kind === 'cupboard';
  return (
    <>
      {kind === 'own' && <span className="badge badge--local">Local</span>}
      {/* Where the row lives, as Local is, and in a neutral tint: neither is a warning.
          Every compendium entry in a coven wears it, held or not (the owner's call,
          2026-10-19), and Annotated sits beside it; the page's shelf mark says which
          the cupboard holds. On the public compendium every entry is one, so none does. */}
      {(held || (kind === 'compendium' && inCoven)) && !retired && (
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
export { default as RecencyMark } from './recency-mark';
export type { RecencyMarkProps } from './types';
