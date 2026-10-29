import 'server-only';
import type { StockData } from '@/components/StockDialog/types';
import { stockDialogOf } from '@/app/coven-stock';
import { getSession } from '@/lib/request-session';
import { heldFormsOf, stockOf, variantsOf, type StockKey } from '@/modules/ingredients';

// What Edit Stock in the compendium's three dots reads: the forms an entry comes in and the jars a
// coven holds of it, so the dialog opens at once with both. Per viewer, so read per request through
// the services and never inside the cached compendium read (CLAUDE.md rule 6). One call to each
// service for the whole page, whatever the number of entries and covens (a compendium entry's forms
// are read per coven, through its proof, in one call). `stockDialogOf` maps rows to what the dialog
// reads and is shared with the coven's own pages (claude-docs/components/stock-dialog.md).

/** The key a coven's stock of an entry is found under in what `readEntryStock` returns. */
export const stockKey = (workspaceId: string, ingredientId: string): string =>
  `${workspaceId}:${ingredientId}`;

/** A pair to read: `own` where the entry is the coven's own, whose forms are read in that coven. */
export type StockAsk = StockKey & { own?: boolean };

/**
 * The stock for each (coven, entry) pair asked, under `stockKey`. A pair is left out when the
 * service refuses its coven's jars or its entry's forms: the dialog is then not offered, and a
 * write the role may not make is refused by the service anyway. None for a visitor.
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

  // The forms of a compendium entry are read per coven, through that coven's proof: stock is per
  // coven, so a retired entry still lists its forms for a coven whose cupboard names it, and none
  // for any other. A coven's own entry has no cupboard row to hold, so its forms are read in its
  // own tier (the service refuses a coven's entry asked as the compendium's).
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
