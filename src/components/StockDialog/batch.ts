import type { SaveStockInput } from '../../gql/graphql';
import type { StockFormValues } from '../StockFields';
import { stockAmountsOf, stockFormValues } from '../StockFields';
import type { StockBatchRows, StockForm, StockJar, StockRow } from './types';

// The rows as `saveStock` takes them, and the way back from an issue's path to its row. Only what changed is sent, so no jar
// is ever in two lists, which the service refuses (claude-docs/components/stock-dialog.md, "What is sent").

const AMOUNTS: readonly (keyof StockFormValues)[] = ['quantityOnHand', 'unit', 'lowStockThreshold'];

/** The rows the dialog opens on: one per jar held, by its form's name from A to Z, as the jars arrive in no fixed order. */
export function openingRows(jars: readonly StockJar[], forms: readonly StockForm[]): StockRow[] {
  const labelOf = (jar: StockJar) =>
    forms.find((form) => form.variantId === jar.variantId)?.label ?? '';
  return [...jars]
    .sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
    .map((jar) => ({
      jarId: jar.id,
      variantId: jar.variantId,
      removed: false,
      ...stockFormValues(jar),
    }));
}

/** Whether a row's amounts differ from a jar's as it opened: an update to send, and the list's Edited mark. */
export const changed = (row: StockFormValues, opening: StockFormValues): boolean =>
  AMOUNTS.some((key) => row[key] !== opening[key]);

/** The batch, and which row each create and update entry came from. */
export function stockBatch(
  rows: readonly StockRow[],
  jars: readonly StockJar[],
): { input: SaveStockInput; from: StockBatchRows } {
  const opening = new Map(jars.map((jar) => [jar.id, stockFormValues(jar)]));
  const input: SaveStockInput = { create: [], update: [], delete: [] };
  const from: StockBatchRows = { create: [], update: [] };
  rows.forEach((row, index) => {
    if (row.jarId === null) {
      input.create.push({ variantId: row.variantId, input: stockAmountsOf(row) });
      from.create.push(index);
    } else if (row.removed) {
      input.delete.push(row.jarId);
    } else {
      const was = opening.get(row.jarId);
      if (was && changed(row, was)) {
        input.update.push({ id: row.jarId, input: stockAmountsOf(row) });
        from.update.push(index);
      }
    }
  });
  return { input, from };
}

/** The row field an issue names, from its path in the batch: an amount beside its box, a new jar's form on its row; anything else goes to the alert. */
export function rowFieldOf(
  path: readonly (string | number)[],
  from: StockBatchRows,
): `rows.${number}.${keyof StockFormValues | 'variantId'}` | undefined {
  const [list, at, ...rest] = path;
  if (list !== 'create' && list !== 'update') return undefined;
  const row = from[list][Number(at)];
  if (row === undefined) return undefined;
  if (rest.length === 1 && rest[0] === 'variantId' && list === 'create') {
    return `rows.${row}.variantId`;
  }
  const amount = AMOUNTS.find((key) => key === rest[1]);
  return rest.length === 2 && rest[0] === 'input' && amount ? `rows.${row}.${amount}` : undefined;
}
