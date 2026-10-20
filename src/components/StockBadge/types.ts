/** What a jar's quantity and threshold say about it. */
export type StockState = 'out' | 'low' | 'ok';

export interface StockBadgeProps {
  /** The jar's quantity on hand; `null` is held but not weighed, which gets no badge. */
  quantity: number | null | undefined;
  /** The jar's low-stock threshold; `null` or 0 turns the Low Stock warning off, so no Low badge. */
  threshold: number | null | undefined;
  /** The jar's unit as its row spells it, written after the quantity and the threshold. */
  unit?: string | null;
}
