import { QUANTITY_SCALE } from '../schema/quantities';
import {
  dimensionOf,
  type Unit,
  type UnitDimension,
  type UNITS_BY_DIMENSION,
} from '../schema/units';
import type { Decimal, UnitConversion } from './types';

// Converts an amount between two units of one dimension, and refuses every
// other pair as a result the caller must test (DESIGN.md §11). Built from the
// two schema files that import nothing, so it reaches no database code
// (claude-docs/db/stock.md, "Converting between units").

type Convertible = Exclude<UnitDimension, 'count'>;

// Each unit's size in its dimension's base unit, milligrams for weight and
// millilitres for volume. Spoons and cups are metric,
// as a British kitchen measures them, and both fluid ounces are listed.
// Decimal text rather than numbers, so 29.5735295625 is held exactly and not
// as the nearest double. Keyed by dimension, so no factor joins two: count has
// none, and there is no density table. `satisfies` makes a unit added to the
// vocabulary a type error here until it is given a size.
const SIZE_IN_BASE_UNIT = {
  weight: { mg: '1', g: '1000', kg: '1000000', oz: '28349.523125', lb: '453592.37' },
  volume: {
    ml: '1',
    l: '1000',
    tsp: '5',
    tbsp: '15',
    fl_oz_uk: '28.4130625',
    fl_oz_us: '29.5735295625',
    cup: '250',
  },
} as const satisfies {
  [D in Convertible]: Record<(typeof UNITS_BY_DIMENSION)[D][number], string>;
};

// A number's shortest text, which `String` gives: `0.1` reads as the decimal
// 0.1 the caller meant, not the double nearest it. Large and small values
// come with an exponent, `1e+21` and `1e-7`. Every finite number at or above
// zero matches, and `unitConvert` lets no other through.
const DECIMAL = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/;

function decimalOf(text: string): Decimal {
  const [, whole, fraction = '', exponent = '0'] = DECIMAL.exec(text) as RegExpExecArray;
  const digits = BigInt(`${whole}${fraction}`);
  const scale = fraction.length - Number(exponent);

  return scale < 0 ? { digits: digits * 10n ** BigInt(-scale), scale: 0 } : { digits, scale };
}

// One map across both dimensions is safe: no unit belongs to two.
const SIZES = new Map<string, Decimal>(
  Object.values(SIZE_IN_BASE_UNIT).flatMap((sizes) =>
    Object.entries(sizes).map(([unit, size]): [string, Decimal] => [unit, decimalOf(size)]),
  ),
);

// Half up, as Postgres rounds a positive numeric, so what this returns is what
// the column would store. Both parts are at or above zero, the denominator
// above it.
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/**
 * `value` in `from`, converted to `to` and rounded once, at the end, to the
 * stock columns' three decimals. Weight converts to weight and volume to
 * volume; any other pair is refused, never guessed. Throws only on a negative
 * or non-finite value, which the stock schema refuses before a caller gets
 * here.
 */
export function unitConvert(value: number, from: Unit, to: Unit): UnitConversion {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Cannot convert ${value}`);

  const dimension = dimensionOf(from);
  if (dimension === 'count' || dimensionOf(to) === 'count') return { ok: false, reason: 'count' };
  if (dimensionOf(to) !== dimension) return { ok: false, reason: 'dimension' };

  // value × source ÷ target, as one fraction of whole numbers in thousandths
  // of `to`: exact through the base unit, with nothing rounded on the way.
  const amount = decimalOf(String(value));
  const source = SIZES.get(from) as Decimal;
  const target = SIZES.get(to) as Decimal;
  const numerator = amount.digits * source.digits * 10n ** BigInt(target.scale + QUANTITY_SCALE);
  const denominator = target.digits * 10n ** BigInt(amount.scale + source.scale);

  return { ok: true, value: Number(divideRounded(numerator, denominator)) / 10 ** QUANTITY_SCALE };
}
