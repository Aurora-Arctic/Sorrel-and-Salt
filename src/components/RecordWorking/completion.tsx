'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import type { WorkingDeductionPreviewQuery } from '../../gql/graphql';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { graphqlQuery, graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import JarLine from '../JarLine';
import Notice from '../Notice';
import Skeleton from '../Skeleton';
import { stockState } from '../StockBadge/stock-state';
import { withUnit } from '../StockBadge/stock-words';
import './index.scss';
import type { WorkingCompletionProps, WorkingStep } from './types';
import { SKIP_REASON } from './warnings';

// The step before a working is completed: what completing it would take from each jar, read from
// `workingDeductionPreview`, and a Confirm that runs `completeWorking`. The preview and the
// completion share one plan on the server, so what is shown is what is taken
// (claude-docs/components/record-working.md).

export const WorkingDeductionPreviewDocument = graphql(`
  query WorkingDeductionPreview($workspaceId: ID!, $spellId: ID!) {
    workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {
      deductions {
        before
        inventoryItemId
        lowStockThreshold
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

type Plan = WorkingDeductionPreviewQuery['workingDeductionPreview'];
type Taken = Plan['deductions'][number];
type Skipped = Plan['warnings'][number];
type PreviewRow = { step: WorkingStep; taken: Taken } | { step: WorkingStep; skipped: Skipped };

const amount = (quantity: number, unit: string) => withUnit(Number(quantity.toFixed(3)), unit);

/** One line of the preview: the step's jar as the recipe page's In the Cupboard panel draws it, then what the step takes from it. */
function DeductionLine({ row, onSaved }: { row: PreviewRow; onSaved: () => void }): ReactElement {
  const { step } = row;
  const taken = 'taken' in row ? row.taken : null;
  const skipped = 'skipped' in row ? row.skipped : null;
  const oneOff = step.oneOff === true || skipped?.reason === 'CUSTOM';
  const unstocked = skipped?.reason === 'UNSTOCKED';
  const short = taken !== null && taken.shortfall > 0;
  const held = taken ? { quantity: taken.before, threshold: taken.lowStockThreshold } : null;
  // Short is Low whatever the Low mark says: the jar is emptied.
  const state = short ? 'low' : held ? stockState(held.quantity, held.threshold) : 'ok';
  const tone = oneOff ? 'ok' : unstocked ? 'empty' : state;
  const form = step.form ?? '';
  return (
    <JarLine
      seed={step.seed ?? step.name}
      kind={form}
      held={held}
      tone={tone}
      oneOff={oneOff}
      name={step.name}
      press={
        step.stock
          ? {
              ...step.stock,
              // The same dialog and handler as a jar on the recipe page's In the Cupboard panel.
              ariaLabel: ['Edit Stock', step.stock.ingredientName, form && formLabel(form)]
                .filter(Boolean)
                .join(', '),
              onSaved,
            }
          : undefined
      }
      words={
        taken ? (
          <>
            <span>
              takes <b>{amount(taken.quantity, taken.unit)}</b>
            </span>
            <span>
              {' · '}have {amount(taken.before, taken.unit)}
            </span>
            <span>
              {' · '}left {amount(Math.max(taken.before - taken.quantity, 0), taken.unit)}
            </span>
            {short && (
              <span className="working-deductions__short">
                {' · '}short by {amount(taken.shortfall, taken.unit)}
              </span>
            )}
          </>
        ) : oneOff ? (
          'one-off · not kept'
        ) : unstocked ? (
          'have no jar · takes nothing'
        ) : (
          `${SKIP_REASON[skipped!.reason]} · takes nothing`
        )
      }
    />
  );
}

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
    ? steps.flatMap((step): PreviewRow[] => {
        const taken = plan.deductions.find((deduction) => deduction.stepId === step.id);
        const skipped = plan.warnings.find((warning) => warning.stepId === step.id);
        return taken ? [{ step, taken }] : skipped ? [{ step, skipped }] : [];
      })
    : [];
  // A step the spell no longer lists, which the preview still names.
  const orphans = plan
    ? plan.warnings.filter((warning) => !steps.some((step) => step.id === warning.stepId))
    : [];
  const done = complete.isSuccess;
  return (
    <div className="form">
      {failure && <Notice kind="error">{failure}</Notice>}
      {!plan ? (
        <Skeleton shape="line" count={steps.length || 1} />
      ) : (
        <>
          <p>
            {done
              ? 'Working completed. This is what was taken from the coven’s jars.'
              : 'Completing this working takes the following from the coven’s jars.'}
          </p>
          <ul aria-label="Deductions" className="working-deductions">
            {rows.map((row) => (
              <DeductionLine key={row.step.id} row={row} onSaved={() => void preview.refetch()} />
            ))}
            {orphans.map((warning) => (
              <JarLine
                key={warning.stepId}
                seed=""
                kind=""
                held={null}
                tone="empty"
                name={warning.stepName ?? 'A removed step'}
                words={`${SKIP_REASON[warning.reason]} · takes nothing`}
              />
            ))}
          </ul>
          {rows.length + orphans.length === 0 && <p>Nothing will be taken from any jar.</p>}
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
