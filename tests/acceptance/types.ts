/** A compendium entry, as story 14's queries select it. */
export interface Entry {
  id: string;
  name: string;
  canonicalName: string | null;
  nomenclature: string;
  folkNames: string[];
  categories: { name: string; group: { name: string } }[];
}

/** A near match, as story 16's warning names it. */
export interface Duplicate {
  id: string;
  name: string;
  canonicalName: string | null;
}

/** The audit stamps these stories read back off a row, as raw SQL names them. */
export interface Stamps {
  created_by: string;
  updated_by: string;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
}
