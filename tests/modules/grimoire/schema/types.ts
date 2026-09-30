export interface SpellCategoryPair {
  spellId: string;
  categoryId: string;
}

export interface LayerRow {
  spellId?: string;
  ingredientId?: string | null;
  name?: string | null;
  form?: string | null;
  quantity?: string | null;
  unit?: string | null;
  layerOrder?: number;
  note?: string | null;
}
