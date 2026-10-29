import { Fragment, type ReactElement, type ReactNode } from 'react';
import { SafetyMark } from '../SafetyNote';
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

/** The day, as LastEdit prints one, in UTC so the server's zone cannot move it. */
const reviewDay = (at: string) =>
  new Date(at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

const TONES: readonly Tone[] = ['green', 'neutral', 'red'];

// Green first and red last, each group in the order it was built. Sorted here, the one
// place every badge row is drawn, rather than by each caller's JSX order, as
// MenuButton's `greenFirst` does for menu items.
const byTone = (marks: readonly Mark[]): Mark[] =>
  TONES.flatMap((tone) => marks.filter((mark) => mark.tone === tone));

// An ingredient entry's badge row: whose it is (Local, Compendium, Annotated, Retired) and its one
// warning (Toxic, else Caution); New and Updated are RecencyMark. Props only, no data work, so the
// entry page and the card cannot drift (claude-docs/components/entry-marks.md).
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
  if (kind === 'own') {
    marks.push({
      key: 'local',
      tone: 'green',
      node: <span className="badge badge--local">Local</span>,
    });
  }
  const shownAnnotated = provenance && held && annotated;
  // Where the row lives, as Local is, in a neutral tint, not a warning. Every compendium entry in a coven
  // wears it, held or not; on the public compendium none does. Annotated, which already says the entry is
  // the Compendium's, wins over it.
  if (provenance && (held || (kind === 'compendium' && inCoven)) && !retired && !shownAnnotated) {
    marks.push({
      key: 'compendium',
      tone: 'neutral',
      node: <output className="badge badge--low-stock">Compendium</output>,
    });
  }
  // A compendium entry the curators retired, read because this coven's cupboard names
  // it: a button opening its own tip.
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
  // The curators' review mark: green with its day once reviewed, in the attention
  // colour while not. A coven's own entry is never reviewed, so it has neither.
  if (kind !== 'own' && reviewedAt !== undefined) {
    marks.push(
      reviewedAt === null
        ? {
            key: 'review',
            tone: 'red',
            node: <output className="badge badge--attention">Needs Review</output>,
          }
        : {
            key: 'review',
            tone: 'green',
            node: (
              <output className="badge badge--local">
                Reviewed By Curator <time dateTime={reviewedAt}>{reviewDay(reviewedAt)}</time>
              </output>
            ),
          },
    );
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
      {/* New or Updated before every badge, in reading order and on screen: here once,
                so no row that shares it can differ. */}
      <RecencyMark recency={recency} />
      {byTone(marks).map((mark) => (
        <Fragment key={mark.key}>{mark.node}</Fragment>
      ))}
    </>
  );
};

export default EntryMarks;
export type { EntryKind, EntryMarksProps } from './types';
export { default as RecencyMark } from './recency-mark';
export type { RecencyMarkProps } from './types';
