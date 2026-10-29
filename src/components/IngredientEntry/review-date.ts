import type { IngredientDetail } from '@/modules/ingredients';

/** The entry's review mark: an ISO string once reviewed, `null` while it needs review, `undefined` for a coven's own entry; a Date from before the cache is accepted too. */
export function reviewedAtOf({
  entry,
}: Pick<IngredientDetail, 'entry'>): string | null | undefined {
  if (entry.workspaceId !== null) return undefined;
  const at: Date | string | null | undefined = entry.curatorReviewedAt;
  if (!at) return null;
  const moment = new Date(at);
  return Number.isNaN(moment.getTime()) ? null : moment.toISOString();
}
