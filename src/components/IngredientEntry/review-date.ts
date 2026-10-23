import type { IngredientDetail } from '@/modules/ingredients';

/**
 * The entry's review mark as the badge takes it (M14.8; `EntryMarks`' `reviewedAt`): an ISO
 * string once a curator has marked a compendium entry reviewed, `null` while it needs review,
 * and `undefined` for a coven's own entry, which nobody reviews. Read off the entry row, whose
 * date reaches a client component as a string after the compendium's cache (a Date before it),
 * so both are accepted. The date only: the row never carries who marked it.
 */
export function reviewedAtOf({
  entry,
}: Pick<IngredientDetail, 'entry'>): string | null | undefined {
  if (entry.workspaceId !== null) return undefined;
  const at: Date | string | null | undefined = entry.curatorReviewedAt;
  if (!at) return null;
  const moment = new Date(at);
  return Number.isNaN(moment.getTime()) ? null : moment.toISOString();
}
