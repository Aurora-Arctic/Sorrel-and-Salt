import 'server-only';
import type { StockDialogProps } from '@/components/StockDialog/types';
import type { Session } from '@/lib/session';
import { stockOf, type StockRow } from '@/modules/ingredients';
import { formLabel } from '@/modules/ingredients/validation/form-label';

// The coven's jars of one entry, as the pages that draw Edit Stock read them (the coven's Ingredients
// and the entry page). One file so both agree on amounts, numeric strings in the row and numbers on
// screen. Per request, never cached (rule 6). See claude-docs/components/stock-dialog.md.

/** The coven's jars of the entry, read under the stock service's own check. */
export async function covenJarsOf(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<StockRow[]> {
  const [jars] = await stockOf(session, [{ ingredientId, workspaceId }]);
  if (jars === undefined || jars instanceof Error) throw jars ?? new Error('No answer');
  return jars;
}

/** What the Edit Stock dialog reads of an entry: every form it comes in, and the coven's jars. */
export const stockDialogOf = (
  variants: readonly { id: string; form: string }[],
  jars: readonly StockRow[],
): Pick<StockDialogProps, 'forms' | 'jars'> => ({
  forms: variants.map(({ id, form }) => ({ variantId: id, label: formLabel(form) })),
  jars: jars.map((jar) => ({
    id: jar.id,
    variantId: jar.variantId,
    quantity: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
    unit: jar.unit,
    threshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
  })),
});
