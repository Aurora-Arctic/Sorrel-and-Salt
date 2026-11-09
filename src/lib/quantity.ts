/**
 * A stored quantity as the person would write it: "1.000" is "1" and "2.500" is "2.5", so only the
 * decimals that carry information show. A plain string edit, not a Number round trip, which would
 * rewrite "1e3" and lose a quantity past 15 digits; text that is not a plain decimal passes through.
 */
export const plainQuantity = (quantity: string | number): string => {
  const text = String(quantity).trim();
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
};

/** The amount and unit as one phrase, "2 tsp"; a missing or empty unit leaves the amount alone. */
export const formatQuantity = (quantity: string | number, unit?: string | null): string =>
  unit ? `${plainQuantity(quantity)} ${unit}` : plainQuantity(quantity);
