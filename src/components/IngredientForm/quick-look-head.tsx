import { detailsHeading } from '../IngredientEntry/details';
import Skeleton from '../Skeleton';
import type { Duplicate } from './types';

// The head a Quick Look shows before its entry arrives, split from the dialog so the frame that
// opens while the dialog's code loads can draw the same head.

/** The names a Quick Look's head shows before the entry arrives; the formal name's two fields come together or not at all. */
export type QuickLookNames = Pick<Duplicate, 'name'> &
  (
    | Pick<Duplicate, 'canonicalName' | 'nomenclature'>
    | { canonicalName?: never; nomenclature?: never }
  );

/**
 * The head before the entry arrives: the details' own head if the formal name is known; if not, a
 * line skeleton where it goes while the read is out, and nothing after a failed read, never
 * "Not yet looked up", which would say the entry has none.
 */
export function pendingHeading(
  entry: QuickLookNames,
  loading = true,
): ReturnType<typeof detailsHeading> {
  if (entry.canonicalName !== undefined && entry.nomenclature !== undefined) {
    return detailsHeading({
      ...entry,
      canonicalName: entry.canonicalName,
      nomenclature: entry.nomenclature,
    });
  }
  return { title: entry.name, formalName: loading ? <Skeleton shape="line" /> : undefined };
}
