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

/** What a draft working says beside Complete: how many ingredients completing would take nothing for, the reasons staying in the Complete dialog. */
export function skipSummary(count: number): string | null {
  if (count === 0) return null;
  return `Completing takes nothing from the jars for ${count} ${count === 1 ? 'ingredient' : 'ingredients'}.`;
}
