// The stock and recipe amount rule as plain functions: `quantity` in validation.ts runs `amountProblem`, and a client
// field's check runs `quantityProblem`, so a page that checks an amount need not load zod.

import { MAX_QUANTITY, QUANTITY_SCALE } from '../modules/ingredients/schema/quantities';
import { parseQuantity } from './formats';

export const QUANTITY_FORMAT_MESSAGE = 'Enter an amount as a number, like 2.5';

/** What an amount box says beneath its label. */
export const QUANTITY_HINT = 'A number, like 2.5';

/** What is wrong with a number as an amount, if anything: from 0 to what the columns hold, with up to three decimals. `label` names the field in the messages that need it. */
export function amountProblem(amount: number, label: string): string | undefined {
  if (!Number.isFinite(amount)) return QUANTITY_FORMAT_MESSAGE;
  if (amount < 0) return `${label} cannot be negative`;
  if (amount > MAX_QUANTITY) {
    return `${label} is too large — the most it can be is ${MAX_QUANTITY.toLocaleString('en', { maximumFractionDigits: QUANTITY_SCALE })}`;
  }
  if (Number(amount.toFixed(QUANTITY_SCALE)) !== amount) {
    return `${label} can have up to three decimal places`;
  }
  return undefined;
}

/** `amountProblem` for typed text; blank is no amount, so nothing is wrong with it. */
export function quantityProblem(text: string, label: string): string | undefined {
  const amount = parseQuantity(text);
  return amount === null ? undefined : amountProblem(amount, label);
}
