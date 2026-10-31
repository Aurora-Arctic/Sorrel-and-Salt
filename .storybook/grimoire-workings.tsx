import type { ReactElement } from 'react';
import RecordWorkingButton, { CompleteWorkingAction } from '../src/components/RecordWorking';
import EditWorkingAction from '../src/components/SpellWorkings/edit-working';
import SpellWorkings from '../src/components/SpellWorkings';
import type { WorkingView } from '../src/components/SpellWorkings/types';
import type { SpellVisibility } from '../src/modules/grimoire/types';
import { RECORDER, WORKING_STEPS } from './grimoire-fixtures';

// The Workings section with the recipe page's own controls, as the page passes them
// (src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx), shared by the Spell Workings and
// Spell Recipe stories.

export const FIXTURE_WORKSPACE = 'fixture-workspace';
export const FIXTURE_SPELL = 'fixture-spell';

/** Record a Working, for a role that may record one on a complete spell. */
export const RecordButton = ({
  visibility = 'workspace',
}: {
  visibility?: SpellVisibility;
}): ReactElement => (
  <RecordWorkingButton
    workspaceId={FIXTURE_WORKSPACE}
    spellId={FIXTURE_SPELL}
    spellName="Fixture Working"
    spellVisibility={visibility}
    recorder={RECORDER}
    steps={WORKING_STEPS}
  />
);

export const WorkingsSection = ({
  workings,
  canRecord = true,
  visibility = 'workspace',
}: {
  workings: readonly WorkingView[];
  canRecord?: boolean;
  visibility?: SpellVisibility;
}): ReactElement => (
  <SpellWorkings
    workings={workings}
    headingAction={canRecord ? <RecordButton visibility={visibility} /> : undefined}
    completeAction={(workingId, workedOn, name) => (
      <CompleteWorkingAction
        label={`Complete Working ${name}`}
        workspaceId={FIXTURE_WORKSPACE}
        spellId={FIXTURE_SPELL}
        workingId={workingId}
        workedOn={workedOn}
        steps={WORKING_STEPS}
      />
    )}
    editAction={(editable, name, plain, canDelete) => (
      <EditWorkingAction
        name={name}
        plain={plain}
        canDelete={canDelete}
        workspaceId={FIXTURE_WORKSPACE}
        spellId={FIXTURE_SPELL}
        spellVisibility={visibility}
        steps={WORKING_STEPS}
        working={editable}
      />
    )}
  />
);
