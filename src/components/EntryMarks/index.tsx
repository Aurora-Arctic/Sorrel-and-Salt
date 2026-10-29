import { Fragment, type ReactElement, type ReactNode } from 'react';
import { SafetyMark } from '../SafetyNote';
import { reviewDay } from '../IngredientEntry/review-date';
import type { EntryMarksProps } from './types';
import RecencyMark from './recency-mark';
import TipMark from './tip-mark';
import './index.scss';

/** A badge's place in the row, from its palette's colour: green, the neutral tints, red. */
type Tone = 'green' | 'neutral' | 'red';

interface Mark {
  key: string;
  tone: Tone;
  node: ReactNode;
}

const TONES: readonly Tone[] = ['green', 'neutral', 'red'];

// Green first and red last, each group in the order it was built (the owner's
// call, 2026-10-20). Sorted here, the one place every badge row is drawn, rather
// than by each caller's JSX order, as MenuButton's `greenFirst` does for menu items.
const byTone = (marks: readonly Mark[]): Mark[] =>
  TONES.flatMap((tone) => marks.filter((mark) => mark.tone === tone));

// An ingredient entry's badge row: whose it is (Local, Compendium, Annotated,
// Retired) and its one warning (Toxic, or else Caution). New and Updated are RecencyMark,
// which sits elsewhere. One component so the entry page's head and the
// ingredient card cannot drift (M8.14). It takes the kind and the flags as props
// and works none of them out from the data. It renders the badges bare, with no
// wrapper, inside the caller's own row. claude-docs/components/entry-marks.md.
const EntryMarks = ({
  kind,
  annotated = false,
  retired = false,
  inCoven = false,
  provenance = true,
  safety = true,
  reviewedAt,
  recency,
  toxic,
  safetyNotes,
  variants,
}: EntryMarksProps): ReactElement => {
  const held = kind === 'cupboard';
  const marks: Mark[] = [];
  let reviewed: ReactNode = null;
  if (kind === 'own') {
    marks.push({
      key: 'local',
      tone: 'green',
      node: <span className="badge badge--local">Local</span>,
    });
  }
  const shownAnnotated = provenance && held && annotated;
  // Where the row lives, as Local is, and in a neutral tint: neither is a warning.
  // Every compendium entry in a coven wears it, held or not (the owner's call,
  // 2026-10-19); the page's shelf mark says which the cupboard holds. On the
  // public compendium every entry is one, so none does. Annotated, which already
  // says the entry is the Compendium's, wins over it (the owner's call, 2026-10-20).
  if (provenance && (held || (kind === 'compendium' && inCoven)) && !retired && !shownAnnotated) {
    marks.push({
      key: 'compendium',
      tone: 'neutral',
      node: <output className="badge badge--low-stock">Compendium</output>,
    });
  }
  // A compendium entry the curators retired, read because this coven's
  // cupboard names it (M12.24): a button opening its own tip.
  if (retired) {
    marks.push({
      key: 'retired',
      tone: 'neutral',
      node: (
        <TipMark
          label="Retired"
          palette="retired"
          tip="No longer in the Compendium; your coven still has it."
        />
      ),
    });
  }
  if (shownAnnotated) {
    marks.push({
      key: 'annotated',
      tone: 'green',
      node: (
        <TipMark
          label="Annotated"
          palette="annotated"
          tip="From the Compendium, with your coven's own changes."
        />
      ),
    });
  }
  // The curators' review mark (M14.8): green with its day once reviewed, in the attention
  // colour while not. A coven's own entry is never reviewed, so it has neither.
  if (kind !== 'own' && reviewedAt !== undefined) {
    if (reviewedAt === null) {
      marks.push({
        key: 'review',
        tone: 'red',
        node: <output className="badge badge--attention">Needs Review</output>,
      });
    } else {
      // Reviewed By Curator stands last in the row, after every other badge, with its day in
      // the badge's tip rather than beside it (the owner's call, 2026-10-29).
      reviewed = (
        <TipMark
          label="Reviewed By Curator"
          palette="local"
          tip={`Reviewed ${reviewDay(reviewedAt)}`}
        />
      );
    }
  }
  // One safety badge, Toxic over Caution, drawing nothing when neither holds. The
  // card draws its own beside the name (`safety={false}`).
  if (safety) {
    marks.push({
      key: 'safety',
      tone: 'red',
      node: <SafetyMark toxic={toxic} safetyNotes={safetyNotes} variants={variants} />,
    });
  }
  return (
    <>
      {/* New or Updated before every badge, in reading order and on screen (the
          owner's call, 2026-10-20): here once, so no row that shares it can differ. */}
      <RecencyMark recency={recency} />
      {byTone(marks).map((mark) => (
        <Fragment key={mark.key}>{mark.node}</Fragment>
      ))}
      {reviewed}
    </>
  );
};

export default EntryMarks;
export type { EntryKind, EntryMarksProps } from './types';
export { default as RecencyMark } from './recency-mark';
export type { RecencyMarkProps } from './types';
