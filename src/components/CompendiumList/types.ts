import type { Route } from 'next';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { PickerCategory } from '../CategoryPicker/types';
import type { SearchCursor, SearchFilter } from '../../lib/search-param-table';
import type { COMPENDIUM_PARAMS } from './params';
import type { UpdatedStamp } from '../DataTable/types';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/**
 * One compendium entry as the list shows it: its classification, its identity
 * — the formal name, null for none — its live forms, and the address that
 * opens it to edit.
 */
export interface CompendiumListEntry extends UpdatedStamp {
  id: string;
  name: string;
  slug: string;
  /** Its naming system, shown by the label the filter gives it. */
  nomenclature: NomenclatureKind;
  canonicalName: string | null;
  /** Its live forms, in form order: `[]` for an entry with none. */
  forms: CompendiumListForm[];
  editHref: Route;
  /** The head of its edit modal, which a press shows at once while the form loads (M9.18). */
  editHeading: ModalHeading;
}

/** One live form of an entry: its text, and its curated group's icon name, null for a form with none. */
export interface CompendiumListForm {
  name: string;
  icon: FormGroupIcon | null;
}

export interface CompendiumListProps extends Partial<PagerHrefs<Route>> {
  entries: readonly CompendiumListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: CompendiumListFilter;
  /** The curated forms, in name order, which the Form box offers. */
  forms: readonly CompendiumFormChoice[];
  /** Every live category, which the Categories box offers and the address names by slug. */
  categories: readonly CompendiumCategoryChoice[];
  /** Where this page stands among them all, for the pager. */
  position?: PagePosition;
}

/**
 * One category the Categories box offers: the picker's own, with the slug
 * the address carries, `?categories=protection`, since the address names a
 * category by it and the page turns it into the id the compendium filters by.
 */
export interface CompendiumCategoryChoice extends PickerCategory {
  slug: string;
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
 * each blank for none, whether to show only the entries that cite no
 * reference, the elements an entry may hold, and the categories it must all
 * be filed under, by slug. Read from the address by the
 * parameter table (./params.ts), whose entries it is made of.
 */
export type CompendiumListFilter = SearchFilter<typeof COMPENDIUM_PARAMS.entries>;

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export type CompendiumPlace = Partial<CompendiumListFilter> & SearchCursor;

/** What the filter form starts from: the page's filter, and the forms and categories it offers. */
export type CompendiumListFilterProps = Pick<
  CompendiumListProps,
  'filter' | 'forms' | 'categories'
>;
