import type { ReactElement } from 'react';
import { dayWords } from '../DateField/day';
import Notice from '../Notice';
import SpellMarks from '../SpellMarks';
import { WORKINGS_ID, WORKINGS_TITLE_ID } from '../SpellRecipe/sections';
import type { SpellWorkingsProps, WorkingView } from './types';
import './index.scss';

// A spell's history on its recipe page: one row per working, newest day first. A working is not a
// step, so the row is its own, and a complete working's deduction lines are plain lines beneath it.
// Complete on a draft row is the page's to give (`completeAction`); a row carries no bin, since the
// Edit dialog holds Delete Working beside the working it shows.

const Working = ({
  working,
  completeAction,
  editAction,
}: {
  working: WorkingView;
  completeAction: SpellWorkingsProps['completeAction'];
  editAction: SpellWorkingsProps['editAction'];
}): ReactElement => {
  const day = dayWords(working.workedOn);
  const showsComplete = working.status === 'draft' && Boolean(working.editable);
  return (
    <li>
      <div className="spell-workings__head">
        <h3>
          <time dateTime={working.workedOn}>{day}</time>
        </h3>
        <SpellMarks status={working.status} visibility={working.visibility} />
        <div className="spell-workings__actions">
          {showsComplete && completeAction?.(working.id, working.workedOn, day)}
          {working.editable &&
            editAction?.(working.editable, day, showsComplete, working.canChange)}
        </div>
      </div>
      {working.status === 'draft' &&
        working.warnings?.map((line) => (
          <Notice key={line} kind="warn" quiet className="spell-workings__warning">
            {line}
          </Notice>
        ))}
      <p className="meta">
        {working.recordedBy ? `Recorded by ${working.recordedBy}` : 'Recorded'}
        {working.participants.length > 0 && ` · With ${working.participants.join(', ')}`}
      </p>
      {working.note && <p className="spell-workings__note">{working.note}</p>}
      {working.deductions.length > 0 && (
        <ol className="spell-workings__deductions" aria-label="Deductions">
          {working.deductions.map((line) => (
            <li key={line.id} className="spell-workings__deduction">
              <span>{line.name}</span>
              <span>
                {line.quantity} {line.unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
};

const SpellWorkings = ({
  workings,
  completeAction,
  editAction,
  headingAction,
}: SpellWorkingsProps): ReactElement => (
  <section
    id={WORKINGS_ID}
    className="spell-workings page-frame__section"
    aria-labelledby={WORKINGS_TITLE_ID}
  >
    <div className="spell-workings__title">
      <h2 id={WORKINGS_TITLE_ID}>Workings</h2>
      {headingAction}
    </div>
    {workings.length === 0 ? (
      <p className="meta">This spell has not been worked yet.</p>
    ) : (
      <ul className="spell-workings__list" aria-labelledby={WORKINGS_TITLE_ID}>
        {workings.map((working) => (
          <Working
            key={working.id}
            working={working}
            completeAction={completeAction}
            editAction={editAction}
          />
        ))}
      </ul>
    )}
  </section>
);

export default SpellWorkings;
export type { SpellWorkingsProps, WorkingView, WorkingDeductionView } from './types';
