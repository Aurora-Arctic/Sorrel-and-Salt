import type { unitConvert } from '@/modules/ingredients/validation/unit-convert';

export type ConversionRefusal = Extract<ReturnType<typeof unitConvert>, { ok: false }>['reason'];

/** What the converter says for each refusal `unitConvert` returns; the refusal itself is the app's. */
export const CONVERSION_REFUSALS: Readonly<Record<ConversionRefusal, string>> = {
  dimension:
    'These two units measure different things, and a unit converts only to one that measures the same thing.',
  count: 'A piece, a drop or a pinch is counted, not measured, so it converts to no other unit.',
};
