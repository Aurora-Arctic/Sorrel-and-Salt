import { quantityText } from '@/lib/validation';
import type { SaveStockInput } from '../../gql/graphql';
import type { StockFormValues } from '../StockFields';
import { stockAmountsOf, stockFormValues } from '../StockFields';
import type { FieldErrors, Resolver } from 'react-hook-form';
import type { StockBatchRows, StockDialogValues, StockForm, StockJar, StockRow } from './types';

// The rows as `saveStock` takes them, and the way back from an issue's path to its row. Only what changed is sent, so no jar
// is ever in two lists, which the service refuses (claude-docs/components/stock-dialog.md, "Saving").

const AMOUNTS: readonly (keyof StockFormValues)[] = ['quantityOnHand', 'unit', 'lowStockThreshold'];

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

export const changed = (row: StockFormValues, opening: StockFormValues): boolean =>
  AMOUNTS.some((key) => row[key] !== opening[key]);

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

/**
 * The amount errors of the rows to be saved, by row and field, so a bad amount is said at its field before
 * anything is sent. A row marked removed is not read.
 */
export function amountErrors(rows: readonly StockRow[]): Record<number, Record<string, string>> {
  const found: Record<number, Record<string, string>> = {};
  rows.forEach((row, index) => {
    if (row.removed) return;
    for (const [key, label] of [
      ['quantityOnHand', 'Quantity'],
      ['lowStockThreshold', 'Low Stock At'],
    ] as const) {
      const result = quantityText(label).safeParse(row[key]);
      if (!result.success) {
        found[index] = { ...found[index], [key]: result.error.issues[0]?.message ?? '' };
      }
    }
  });
  return found;
}

export const amountResolver: Resolver<StockDialogValues> = (values) => {
  const found = amountErrors(values.rows);
  if (Object.keys(found).length === 0) return { values, errors: {} };
  const rows: unknown[] = [];
  for (const [index, fields] of Object.entries(found)) {
    rows[Number(index)] = Object.fromEntries(
      Object.entries(fields).map(([key, message]) => [key, { type: 'validate', message }]),
    );
  }
  return { values: {}, errors: { rows } as FieldErrors<StockDialogValues> };
};
