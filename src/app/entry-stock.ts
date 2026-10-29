import 'server-only';
import type { StockData } from '@/components/StockDialog/types';
import { stockDialogOf } from '@/app/coven-stock';
import { getSession } from '@/lib/request-session';
import { heldFormsOf, stockOf, variantsOf, type StockKey } from '@/modules/ingredients';

// What Edit Stock in the compendium's three dots reads: the forms an entry comes in and the jars a
// coven holds of it. Per viewer, so never inside the cached compendium read (rule 6); one call to each
// service for the whole page. See claude-docs/components/stock-dialog.md.

/** The key a coven's stock of an entry is found under in what `readEntryStock` returns. */
export const stockKey = (workspaceId: string, ingredientId: string): string =>
  `${workspaceId}:${ingredientId}`;

/** A pair to read: `own` where the entry is the coven's own, whose forms are read in that coven. */
export type StockAsk = StockKey & { own?: boolean };

/**
 * The stock for each (coven, entry) pair under `stockKey`; a pair the service refuses is left out,
 * so no dialog is offered. None for a visitor.
 */
export async function readEntryStock(
  asked: readonly StockAsk[],
): Promise<ReadonlyMap<string, StockData>> {
  // The open entry can be on the page too, so a pair may come twice.
  const pairs = [
    ...new Map(asked.map((pair) => [stockKey(pair.workspaceId, pair.ingredientId), pair])).values(),
  ];
  const found = new Map<string, StockData>();
  if (pairs.length === 0) return found;
  const session = await getSession();
  if (!session) return found;

  // Forms are read per coven through its proof: a retired entry still lists its forms for a coven
  // whose cupboard names it. A coven's own entry has no cupboard row, so it is read in its own tier.
  const compendium = pairs.filter(({ own }) => !own);
  const own = pairs.filter(({ own: isOwn }) => isOwn);
  const [jars, compendiumForms, ownForms] = await Promise.all([
    stockOf(
      session,
      pairs.map(({ workspaceId, ingredientId }) => ({ workspaceId, ingredientId })),
    ),
    compendium.length > 0
      ? heldFormsOf(
          session,
          compendium.map(({ workspaceId, ingredientId }) => ({ workspaceId, ingredientId })),
        )
      : [],
    own.length > 0
      ? variantsOf(
          session,
          own.map(({ workspaceId, ingredientId }) => ({ id: ingredientId, workspaceId })),
        )
      : [],
  ]);
  const formsOf = new Map([
    ...compendium.map(
      (pair, i) => [stockKey(pair.workspaceId, pair.ingredientId), compendiumForms[i]] as const,
    ),
    ...own.map((pair, i) => [stockKey(pair.workspaceId, pair.ingredientId), ownForms[i]] as const),
  ]);

  pairs.forEach(({ ingredientId, workspaceId }, i) => {
    const held = jars[i];
    const variants = formsOf.get(stockKey(workspaceId, ingredientId));
    if (held instanceof Error || variants === undefined || variants instanceof Error) return;
    found.set(stockKey(workspaceId, ingredientId), stockDialogOf(variants, held));
  });
  return found;
}
