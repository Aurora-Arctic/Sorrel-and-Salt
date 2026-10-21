import type { SaveStockInput } from '../../gql/graphql';
import type { StockFormValues } from '../StockFields';
import { stockAmountsOf, stockFormValues } from '../StockFields';
import type { StockBatchRows, StockJar, StockRow } from './types';

// The rows as `saveStock` takes them, and the way back from an issue's path
// to the row it names. Only what changed is sent: a jar left as it opened is
// in no list, a staged removal is a delete whatever was typed into it first,
// and a row added and then removed was never a row. So no jar is ever in two
// lists, which the service refuses ("Each jar can be saved once").

const AMOUNTS: readonly (keyof StockFormValues)[] = ['quantityOnHand', 'unit', 'lowStockThreshold'];

/** The rows the dialog opens on: one per jar held, as it is. */
export function openingRows(jars: readonly StockJar[]): StockRow[] {
  return jars.map((jar) => ({
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

/**
 * The row field an issue names, from its path in the batch: an amount
 * (`update.0.input.unit`) beside its box, a new jar's form
 * (`create.0.variantId`, a form the coven already holds) on its row as a
 * whole. Anything else — a delete's, or the batch's own — goes to the alert.
 */
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
