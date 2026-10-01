import type { Session } from '@/lib/session';
import type { CategoryInput } from '@/modules/vocabulary/validation/category';

/** A compendium entry, as story 14's queries select it. */
export interface Entry {
  id: string;
  name: string;
  canonicalName: string | null;
  nomenclature: string;
  folkNames: string[];
  categories: { name: string; group: { name: string } }[];
}

/** What a write answers: the row, of which these stories read the id. */
export interface Row {
  id: string;
}

/** The global category vocabulary's writes — admin only, every one. */
export interface CategoryWrites {
  createCategory(session: Session, input: CategoryInput): Promise<Row>;
  updateCategory(session: Session, id: string, input: CategoryInput): Promise<Row>;
  deleteCategory(session: Session, id: string): Promise<void>;
}

/** The audit stamps these stories read back off a row, as raw SQL names them. */
export interface Stamps {
  created_by: string;
  updated_by: string;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
}
