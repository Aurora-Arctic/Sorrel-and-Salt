import type { Route } from 'next';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

/**
 * One compendium entry as the list shows it: its classification, its identity
 * — the formal name and the form, each null for none — and the address that
 * opens it to edit.
 */
export interface CompendiumListEntry {
  id: string;
  name: string;
  slug: string;
  /** Its naming system, shown by the label the filter gives it. */
  nomenclature: NomenclatureKind;
  canonicalName: string | null;
  form: string | null;
  editHref: Route;
}

export interface CompendiumListProps {
  entries: readonly CompendiumListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: CompendiumListFilter;
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/**
 * The list's filter as asked: the name query and a classification, each
 * blank for none, and whether to show only the entries that cite no reference.
 */
export interface CompendiumListFilter {
  query: string;
  nomenclature: NomenclatureKind | '';
  withoutReferences: boolean;
}

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export interface CompendiumPlace {
  query?: string;
  nomenclature?: NomenclatureKind | '';
  withoutReferences?: boolean;
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or an entry's by slug. */
export type CompendiumDialog = 'new' | { edit: string };

/** What the filter form starts from: the page's filter. */
export type CompendiumListFilterProps = Pick<CompendiumListProps, 'filter'>;
