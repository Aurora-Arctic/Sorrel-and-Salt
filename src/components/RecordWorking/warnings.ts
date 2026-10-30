import type { NotDeductedReason } from '../../gql/graphql';

// Why a step took nothing from a jar, in words. A plain module (no `'use client'`) so a server
// component can build the same lines the dialog shows (claude-docs/components/record-working.md).

export const SKIP_REASON: Record<NotDeductedReason, string> = {
  UNITS_DIFFER: 'units differ',
  JAR_NOT_MEASURED: 'the jar has no amount',
  NO_QUANTITY: 'the step has no amount',
  UNSTOCKED: 'not in stock',
  CUSTOM: 'a one-off ingredient',
};

/** Why a step took nothing, said where the step is listed. */
export const NOT_DEDUCTED: Record<NotDeductedReason, string> = {
  UNITS_DIFFER: `Not deducted: ${SKIP_REASON.UNITS_DIFFER}`,
  JAR_NOT_MEASURED: `Not deducted: ${SKIP_REASON.JAR_NOT_MEASURED}`,
  NO_QUANTITY: `Not deducted: ${SKIP_REASON.NO_QUANTITY}`,
  UNSTOCKED: `Not deducted: ${SKIP_REASON.UNSTOCKED}`,
  CUSTOM: `Not deducted: ${SKIP_REASON.CUSTOM}`,
};

/** What a draft working says beside Complete: how many items it would leave out of inventory, the reasons staying in the Complete dialog. */
export function skipSummary(count: number): string | null {
  if (count === 0) return null;
  return `Completing does not affect inventory for ${count} ${count === 1 ? 'item' : 'items'}`;
}
