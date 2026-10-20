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

/** One jar as the card's badge reads it: its form as stored and its two amounts. */
export interface StockOfForm {
  form: string;
  quantity: number | null | undefined;
  threshold: number | null | undefined;
}

/** The worst of a card's jars, and the forms in that state. */
export interface WorstStock {
  state: Exclude<StockState, 'ok'>;
  /** The forms as stored, in the order given; the badge writes them through `formLabel`. */
  forms: string[];
}

export interface CardStockBadgeProps {
  /** The coven's live jars of the entry. */
  jars: readonly StockOfForm[];
}
