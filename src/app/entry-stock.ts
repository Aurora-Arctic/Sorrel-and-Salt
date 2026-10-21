import 'server-only';
import type { StockData } from '@/components/StockDialog/types';
import { getSession } from '@/lib/request-session';
import { stockOf, variantsOf, type StockKey } from '@/modules/ingredients';
import { formLabel } from '@/modules/ingredients/validation/form-label';

// What Edit Stock in the compendium's three dots reads (M9.12; the owner's call, 2026-10-21): the
// forms an entry comes in and the jars a coven holds of it, so the dialog opens at once with
// both. Per viewer, so read per request through the services and never inside the cached
// compendium read (CLAUDE.md rule 6). One call to each service for the whole page, whatever the
// number of entries and covens, so a longer page costs no more reads. The same mapping as the
// coven's Ingredients page makes for its pencil (`stockOf` in its `page.tsx`), kept apart so
// that page stays as it is. claude-docs/components/stock-dialog.md.

/** The key a coven's stock of an entry is found under in what `readEntryStock` returns. */
export const stockKey = (workspaceId: string, ingredientId: string): string =>
  `${workspaceId}:${ingredientId}`;

/**
 * The stock for each (coven, entry) pair asked, under `stockKey`. A pair is left out when the
 * service refuses its coven's jars or its entry's forms: the dialog then is not offered, and
 * a write the role may not make is refused by the service anyway. None for a visitor.
 */
export async function readEntryStock(
  asked: readonly StockKey[],
): Promise<ReadonlyMap<string, StockData>> {
  // The open entry can be on the page too, so a pair may come twice.
  const pairs = [
    ...new Map(asked.map((pair) => [stockKey(pair.workspaceId, pair.ingredientId), pair])).values(),
  ];
  const found = new Map<string, StockData>();
  if (pairs.length === 0) return found;
  const session = await getSession();
  if (!session) return found;

  const entryIds = [...new Set(pairs.map(({ ingredientId }) => ingredientId))];
  const [jars, forms] = await Promise.all([
    stockOf(session, pairs),
    variantsOf(
      session,
      entryIds.map((id) => ({ id, workspaceId: null })),
    ),
  ]);
  const formsOf = new Map(entryIds.map((id, i) => [id, forms[i]]));

  pairs.forEach(({ ingredientId, workspaceId }, i) => {
    const held = jars[i];
    const variants = formsOf.get(ingredientId);
    if (held instanceof Error || variants === undefined || variants instanceof Error) return;
    found.set(stockKey(workspaceId, ingredientId), {
      forms: variants.map(({ id, form }) => ({ variantId: id, label: formLabel(form) })),
      jars: held.map((jar) => ({
        id: jar.id,
        variantId: jar.variantId,
        quantity: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
        unit: jar.unit,
        threshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
      })),
    });
  });
  return found;
}
