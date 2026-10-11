import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { inventoryItems } from '@/modules/ingredients/schema/inventory-items';
import { MAX_QUANTITY } from '@/modules/ingredients/schema/quantities';
import { StockInput } from '@/modules/ingredients/validation/stock';

// What the schema adds over src/lib/validation.ts, whose optionalText and
// CalendarDay the source and the acquired date are: the two amounts, one
// builder, so one row of each refusal, and the unit list.

function failedPaths(input: unknown) {
  const result = StockInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('StockInput', () => {
  it('takes a full row', () => {
    const input = {
      quantityOnHand: 12.5,
      unit: 'g',
      lowStockThreshold: 10,
      source: ' foraged by the creek ',
      acquiredDate: '2026-09-01',
    };

    expect(StockInput.parse(input)).toEqual({ ...input, source: 'foraged by the creek' });
  });

  // `0` is out of stock and null is "we have this, unweighed"
  // (claude-docs/db/stock.md, "Nullability"); both are values, and neither is
  // refused.
  it('takes zero, and takes nothing at all', () => {
    expect(StockInput.safeParse({ quantityOnHand: 0, lowStockThreshold: 0 }).success).toBe(true);
    expect(StockInput.safeParse({}).success).toBe(true);
    expect(StockInput.safeParse({ quantityOnHand: null, unit: null }).success).toBe(true);
  });

  it('refuses a negative amount, at its field', () => {
    expect(failedPaths({ quantityOnHand: -0.5 })).toEqual([['quantityOnHand']]);
  });

  // numeric(12, 3) holds nine digits before the point; past that Postgres
  // refuses with a raw overflow, so the refusal is said here instead.
  it('takes the largest amount the column holds, and refuses one past it', () => {
    expect(StockInput.safeParse({ lowStockThreshold: 999_999_999.999 }).success).toBe(true);
    expect(failedPaths({ lowStockThreshold: 1_000_000_000 })).toEqual([['lowStockThreshold']]);
  });

  it('reads the ceiling from the column, not a second number', () => {
    const column = getTableConfig(inventoryItems).columns.find(
      (candidate) => candidate.name === 'quantity_on_hand',
    ) as unknown as { precision: number; scale: number };

    expect(MAX_QUANTITY).toBe(10 ** (column.precision - column.scale) - 10 ** -column.scale);
  });

  it('refuses an amount that is not a number', () => {
    for (const value of ['3', Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(failedPaths({ quantityOnHand: value }), String(value)).toEqual([['quantityOnHand']]);
    }
  });

  // The units module's list, so the one list is what is accepted.
  it('takes a unit the units module names, and refuses one it does not', () => {
    expect(StockInput.safeParse({ unit: 'fl_oz' }).success).toBe(true);
    for (const unit of ['gram', 'fl oz', 'handful', 'G']) {
      expect(failedPaths({ unit }), unit).toEqual([['unit']]);
    }
  });
});
