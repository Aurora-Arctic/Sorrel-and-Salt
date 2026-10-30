'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import type { NotDeductedReason, WorkingDeductionPreviewQuery } from '../../gql/graphql';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import type { WorkingCompletionProps } from './types';

// The step before a working is completed: what completing it would take from each jar, read from
// `workingDeductionPreview`, and a Confirm that runs `completeWorking`. The preview and the
// completion share one plan on the server, so what is shown is what is taken
// (claude-docs/components/record-working.md).

export const WorkingDeductionPreviewDocument = graphql(`
  query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {
    workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {
      deductions {
        inventoryItemId
        quantity
        shortfall
        stepId
        unit
      }
      warnings {
        position
        reason
        stepId
        stepName
      }
    }
  }
`);

export const CompleteWorkingDocument = graphql(`
  mutation CompleteWorking($workspaceId: ID!, $id: ID!) {
    completeWorking(workspaceId: $workspaceId, id: $id) {
      working {
        id
        status
        completedAt
      }
      warnings {
        position
        reason
        stepId
        stepName
      }
    }
  }
`);

/** Why a step took nothing, said where the step is listed. */
export const NOT_DEDUCTED: Record<NotDeductedReason, string> = {
  UNITS_DIFFER: 'Not deducted: units differ',
  JAR_NOT_MEASURED: 'Not deducted: the jar has no amount',
  NO_QUANTITY: 'Not deducted: the step has no amount',
  UNSTOCKED: 'Not deducted: not in stock',
  CUSTOM: 'Not deducted: a one-off ingredient',
};

type Plan = WorkingDeductionPreviewQuery['workingDeductionPreview'];
type PreviewRow =
  | { id: string; name: string; taken: Plan['deductions'][number] }
  | { id: string; name: string; skipped: Plan['warnings'][number] };

const amount = (quantity: number, unit: string) => `${Number(quantity.toFixed(3))} ${unit}`;

export default function WorkingCompletion({
  workspaceId,
  spellId,
  workingId,
  steps,
  onCompleted,
  onBack,
}: WorkingCompletionProps): ReactElement {
  const { refresh } = usePendingNavigation();
  const [failure, setFailure] = useState<string>();
  const preview = useQuery({
    ...graphqlQuery(WorkingDeductionPreviewDocument, { workspaceId, spellId }),
    // Read afresh each time: stock may have moved since the last look.
    staleTime: 0,
    gcTime: 0,
    throwOnError: false,
  });
  const complete = useMutation({
    mutationFn: () => graphqlRequest(CompleteWorkingDocument, { workspaceId, id: workingId }),
    onSuccess: () => {
      refresh();
      onCompleted?.();
    },
    onError: (error) => setFailure(readGraphqlFailure(error).alert ?? GENERIC_FAILURE),
  });

  if (preview.isError) {
    return (
      <div className="form">
        <Notice kind="error">{GENERIC_FAILURE}</Notice>
        <div className="modal__actions">
          <button type="button" className="btn btn--quiet" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  }
  const plan = preview.data?.workingDeductionPreview;
  const rows: PreviewRow[] = plan
    ? steps.flatMap(({ id, name }): PreviewRow[] => {
        const taken = plan.deductions.find((deduction) => deduction.stepId === id);
        const skipped = plan.warnings.find((warning) => warning.stepId === id);
        return taken ? [{ id, name, taken }] : skipped ? [{ id, name, skipped }] : [];
      })
    : [];
  // A step the spell no longer lists, which the preview still names.
  const orphans = plan
    ? plan.warnings.filter((warning) => !steps.some((step) => step.id === warning.stepId))
    : [];
  const done = complete.isSuccess;
  const left = complete.data?.completeWorking.warnings ?? [];
  return (
    <div className="form">
      {failure && <Notice kind="error">{failure}</Notice>}
      {!plan ? (
        <p role="status">Reading the jars</p>
      ) : (
        <>
          <p>
            {done
              ? 'Working completed. This is what was taken from the coven’s jars.'
              : 'Completing this working takes the following from the coven’s jars.'}
          </p>
          <ul aria-label="Deductions" className="working-deductions">
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong>{' '}
                {'taken' in row ? (
                  <>
                    {amount(row.taken.quantity, row.taken.unit)}
                    {row.taken.shortfall > 0 && (
                      <> (the jar is short by {amount(row.taken.shortfall, row.taken.unit)})</>
                    )}
                  </>
                ) : (
                  NOT_DEDUCTED[row.skipped.reason]
                )}
              </li>
            ))}
            {orphans.map((warning) => (
              <li key={warning.stepId}>
                <strong>{warning.stepName ?? 'A removed step'}</strong>{' '}
                {NOT_DEDUCTED[warning.reason]}
              </li>
            ))}
          </ul>
          {rows.length + orphans.length === 0 && <p>Nothing will be taken from any jar.</p>}
          {done && left.length > 0 && <p>{left.length} step(s) took nothing, as listed above.</p>}
        </>
      )}
      <div className="modal__actions">
        {done ? (
          <button type="button" className="btn btn--solid" onClick={onBack}>
            Done
          </button>
        ) : (
          <>
            <BusyButton
              className="btn btn--solid"
              busy={complete.isPending}
              busyLabel="Completing"
              disabled={!plan || complete.isPending}
              onClick={() => {
                setFailure(undefined);
                complete.mutate();
              }}
            >
              Confirm
            </BusyButton>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={complete.isPending}
              onClick={onBack}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
