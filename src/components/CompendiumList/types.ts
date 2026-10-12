import type { Route } from 'next';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { PagerHrefs } from '../../app/(shell)/admin/types';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition } from '../../lib/types';

/**
 * One compendium entry as the list shows it: its classification, its identity
 * — the formal name, null for none — its live forms, and the address that
 * opens it to edit.
 */
export interface CompendiumListEntry {
  id: string;
  name: string;
  slug: string;
  /** Its naming system, shown by the label the filter gives it. */
  nomenclature: NomenclatureKind;
  canonicalName: string | null;
  /** Its live forms' text, in form order: `[]` for an entry with none. */
  forms: string[];
  editHref: Route;
  /** The head of its edit modal, which a press shows at once while the form loads (M9.18). */
  editHeading: ModalHeading;
}

export interface CompendiumListProps extends Partial<PagerHrefs> {
  entries: readonly CompendiumListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: CompendiumListFilter;
  /** The curated forms, in name order, which the Form box offers. */
  forms: readonly CompendiumFormChoice[];
  /** Where this page stands among them all, for the pager. */
  position?: PagePosition;
}

/**
 * One curated form the Form box offers: its name is both what the box shows
 * and what the address carries, `?form=Oil`, since the compendium filters a
 * form by its text.
 */
export interface CompendiumFormChoice {
  name: string;
}

/**
 * The list's filter as asked: the name query, a form and a classification,
 * each blank for none, and whether to show only the entries that cite no
 * reference.
 */
export interface CompendiumListFilter {
  query: string;
  form: string;
  nomenclature: NomenclatureKind | '';
  withoutReferences: boolean;
}

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export interface CompendiumPlace {
  query?: string;
  form?: string;
  nomenclature?: NomenclatureKind | '';
  withoutReferences?: boolean;
  after?: string;
  before?: string;
}

/** What the filter form starts from: the page's filter, and the forms it offers. */
export type CompendiumListFilterProps = Pick<CompendiumListProps, 'filter' | 'forms'>;
