// Beside the converter rather than in the module's types.ts, which reaches the
// repository: the converter imports only schema/units.ts, so it can load
// anywhere (claude-docs/db/stock.md, "One module owns the units").

/** Why a conversion was refused: across dimensions, or with a count unit. */
export type ConversionRefusal = 'dimension' | 'count';

/**
 * A conversion's outcome, which the caller must test: a refusal carries no
 * `value`, so it cannot be read as a number by mistake.
 */
export type UnitConversion = { ok: true; value: number } | { ok: false; reason: ConversionRefusal };

/** An exact decimal: `digits` ÷ 10^`scale`. */
export type Decimal = { digits: bigint; scale: number };
