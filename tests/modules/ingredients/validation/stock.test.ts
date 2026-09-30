import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { inventoryItems } from '@/modules/ingredients/schema/inventory-items';
import { MAX_QUANTITY } from '@/modules/ingredients/schema/quantities';
import { UNITS } from '@/modules/ingredients/schema/units';
import { StockInput } from '@/modules/ingredients/validation/stock';

function failure(input: unknown) {
  const result = StockInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map(({ path, message }) => ({ path, message })) ?? [];
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

  it('treats a blank source as absent', () => {
    expect(StockInput.parse({ source: '   ' })).toMatchObject({ source: null });
  });

  it.each(['quantityOnHand', 'lowStockThreshold'])(
    'refuses a negative %s with a message, pathed to it',
    (field) => {
      const issues = failure({ [field]: -0.5 });

      expect(issues).toHaveLength(1);
      expect(issues[0].path).toEqual([field]);
      expect(issues[0].message).toMatch(/negative/i);
    },
  );

  // numeric(12, 3) holds nine digits before the point; past that Postgres
  // refuses with a raw overflow, so the refusal is said here instead.
  it.each(['quantityOnHand', 'lowStockThreshold'])(
    'takes the largest %s the column holds, and refuses one past it',
    (field) => {
      expect(StockInput.safeParse({ [field]: 999_999_999.999 }).success).toBe(true);

      const issues = failure({ [field]: 1_000_000_000 });
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toEqual([field]);
      expect(issues[0].message).toMatch(/999,999,999\.999/);
    },
  );

  it('reads the ceiling from the column, not a second number', () => {
    const column = getTableConfig(inventoryItems).columns.find(
      (candidate) => candidate.name === 'quantity_on_hand',
    ) as unknown as { precision: number; scale: number };

    expect(MAX_QUANTITY).toBe(10 ** (column.precision - column.scale) - 10 ** -column.scale);
  });

  it.each(['quantityOnHand', 'lowStockThreshold'])('refuses a %s that is not a number', (field) => {
    expect(failure({ [field]: '3' })[0].path).toEqual([field]);
    expect(failure({ [field]: Number.NaN })[0].path).toEqual([field]);
    expect(failure({ [field]: Number.POSITIVE_INFINITY })[0].path).toEqual([field]);
  });

  // Read from the units module, so the one list is what is accepted.
  it('accepts every unit the units module holds', () => {
    for (const unit of UNITS) {
      expect(StockInput.safeParse({ unit }).success).toBe(true);
    }
  });

  it.each(['gram', 'fl oz', 'handful', 'G'])('refuses %s as a unit', (unit) => {
    expect(failure({ unit })[0].path).toEqual(['unit']);
  });

  it('refuses an acquired date that is not a calendar date', () => {
    expect(failure({ acquiredDate: '2026-02-30' })[0].path).toEqual(['acquiredDate']);
    expect(failure({ acquiredDate: '2026-09-01T10:00:00Z' })[0].path).toEqual(['acquiredDate']);
  });
});
