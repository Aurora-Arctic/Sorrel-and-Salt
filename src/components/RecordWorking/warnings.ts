import type { NotDeductedReason } from '../../gql/graphql';

// Why a step took nothing from a jar, in words. A plain module (no `'use client'`) so a server
// component can build the same lines the dialog shows (claude-docs/components/record-working.md).

const REASON: Record<NotDeductedReason, string> = {
  UNITS_DIFFER: 'units differ',
  JAR_NOT_MEASURED: 'the jar has no amount',
  NO_QUANTITY: 'the step has no amount',
  UNSTOCKED: 'not in stock',
  CUSTOM: 'a one-off ingredient',
};

/** Why a step took nothing, said where the step is listed. */
export const NOT_DEDUCTED: Record<NotDeductedReason, string> = {
  UNITS_DIFFER: `Not deducted: ${REASON.UNITS_DIFFER}`,
  JAR_NOT_MEASURED: `Not deducted: ${REASON.JAR_NOT_MEASURED}`,
  NO_QUANTITY: `Not deducted: ${REASON.NO_QUANTITY}`,
  UNSTOCKED: `Not deducted: ${REASON.UNSTOCKED}`,
  CUSTOM: `Not deducted: ${REASON.CUSTOM}`,
};

/** What a draft working says beside Complete: how many steps it would skip, the reasons staying in the Complete dialog. */
export function skipSummary(count: number): string | null {
  if (count === 0) return null;
  return `Completing skips ${count} ${count === 1 ? 'step' : 'steps'}`;
}
