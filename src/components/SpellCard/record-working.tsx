'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useRef, useState } from 'react';
import { graphql } from '../../gql';
import type { RecordWorkingSetupQuery } from '../../gql/graphql';
import { graphqlQuery } from '../../lib/graphql-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import { RecordButton } from '../IconTip';
import Modal from '../Modal';
import Notice from '../Notice';
import RecordWorkingForm from '../RecordWorking/form';
import type { WorkingStep } from '../RecordWorking';
import Skeleton from '../Skeleton';
import type { SpellCardRecordWorkingProps } from './types';

// Record a Working on a card: the dialog reads the spell's steps when it opens, as a list draws
// many cards and most are never recorded from
// (claude-docs/components/spell-card.md, "Record a Working, Edit and the More menu").

const RecordWorkingSetupDocument = graphql(`
  query RecordWorkingSetup($workspaceId: ID!, $spellId: ID!) {
    spell(id: $spellId, workspaceId: $workspaceId) {
      id
      steps {
        id
        name
        form
        ingredient {
          id
        }
        variant {
          id
        }
      }
    }
  }
`);

/** What the recipe page calls a linked ingredient it cannot read. */
const UNAVAILABLE_INGREDIENT = 'Unavailable Ingredient';

/** The spell's ingredient steps as the completion preview reads them; an instruction-only step has none. */
function workingStepsOf(steps: RecordWorkingSetupQuery['spell']['steps']): WorkingStep[] {
  return steps.flatMap((step): WorkingStep[] => {
    const linked = step.ingredient != null || step.variant != null;
    if (!linked && step.name == null) return [];
    const name = step.name ?? UNAVAILABLE_INGREDIENT;
    // The form as stored, which picks the jar's shape; the preview raises it where it shows it.
    const form = step.form;
    return [{ id: step.id, name, form, seed: step.ingredient?.id ?? name, oneOff: !linked }];
  });
}

function CardRecordWorkingDialog({
  workspaceId,
  spellId,
  spellVisibility,
  recorder,
  onClose,
  returnTo,
}: Omit<SpellCardRecordWorkingProps, 'spellName'> & {
  onClose: () => void;
  returnTo: () => HTMLElement | null;
}): ReactElement {
  const setup = useQuery({
    ...graphqlQuery(RecordWorkingSetupDocument, { workspaceId, spellId }),
    throwOnError: false,
  });
  return (
    <Modal title="Record a Working" onClose={onClose} returnTo={returnTo}>
      {(close) =>
        setup.data ? (
          <RecordWorkingForm
            workspaceId={workspaceId}
            spellId={spellId}
            spellVisibility={spellVisibility}
            recorder={recorder}
            steps={workingStepsOf(setup.data.spell.steps)}
            close={close}
          />
        ) : setup.isError ? (
          <Notice kind="error">{GENERIC_FAILURE}</Notice>
        ) : (
          <Skeleton shape="form" />
        )
      }
    </Modal>
  );
}

export default function CardRecordWorking({
  spellName,
  ...props
}: SpellCardRecordWorkingProps): ReactElement {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <RecordButton name={spellName} ref={trigger} onClick={() => setOpen(true)} />
      {open && (
        <CardRecordWorkingDialog
          {...props}
          onClose={() => setOpen(false)}
          returnTo={() => trigger.current}
        />
      )}
    </>
  );
}
