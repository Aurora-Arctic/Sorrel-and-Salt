export interface LayerRow {
  spellId?: string;
  ingredientId?: string | null;
  /** The form laid; the ingredient's first seeded variant when left out of a linked layer. */
  variantId?: string | null;
  name?: string | null;
  form?: string | null;
  quantity?: string | null;
  unit?: string | null;
  layerOrder?: number;
  note?: string | null;
}
