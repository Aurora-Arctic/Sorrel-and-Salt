import type { ReactElement } from 'react';
import { dayWords } from '../DateField/day';
import SpellMarks from '../SpellMarks';
import { WORKINGS_ID } from '../SpellRecipe/sections';
import DeleteWorkingAction from './delete-working';
import type { SpellWorkingsProps, WorkingView } from './types';
import './index.scss';

// A spell's history on its recipe page: one row per working, newest day first. A working is not a
// step, so the row is its own, and a complete working's deduction lines are plain lines beneath it.
// Complete on a draft row is the page's to give (`completeAction`).

const Working = ({
  working,
  workspaceId,
  completeAction,
  editAction,
}: {
  working: WorkingView;
  workspaceId: string;
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
          {working.canChange && (
            <DeleteWorkingAction workspaceId={workspaceId} workingId={working.id} name={day} />
          )}
        </div>
      </div>
      {working.status === 'draft' &&
        working.warnings?.map((line) => (
          <p key={line} className="meta">
            {line}
          </p>
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
  workspaceId,
  workings,
  completeAction,
  editAction,
  headingAction,
}: SpellWorkingsProps): ReactElement => (
  <section
    id={WORKINGS_ID}
    className="spell-workings page-frame__section"
    aria-labelledby="spell-workings-title"
  >
    <div className="spell-workings__title">
      <h2 id="spell-workings-title">Workings</h2>
      {headingAction}
    </div>
    {workings.length === 0 ? (
      <p className="meta">This spell has not been worked yet.</p>
    ) : (
      <ul className="spell-workings__list" aria-labelledby="spell-workings-title">
        {workings.map((working) => (
          <Working
            key={working.id}
            working={working}
            workspaceId={workspaceId}
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
