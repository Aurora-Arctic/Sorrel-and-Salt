import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { FilterValue } from '../FilterForm/types';
import type { ComboboxOption } from '../Combobox/types';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** One ingredient the search box's dropdown offers: enough to label a row and to build the address a pick opens. */
export interface IngredientSearchMatch {
  id: string;
  slug: string;
  /** What the ingredient is called here. */
  name: string;
  /** Its formal name, null for none. */
  canonicalName: string | null;
}

/** A dropdown row: the combobox's option, carrying the match it stands for. */
export interface IngredientSearchOption extends ComboboxOption {
  match: IngredientSearchMatch;
}

export interface IngredientSearchProps extends Partial<PagerHrefs<Route>> {
  /** The consumer's client filter row, normally an `IngredientSearchForm`. */
  search: ReactNode;
  /** The consumer's own action, an Add or a Create: drawn beneath the filter row. */
  action?: ReactNode;
  /** The results: a table, cards or an empty state. */
  children: ReactNode;
  /** Where this page stands among them all, for the pager. */
  position?: PagePosition;
  /** The list's own root class, beside `list-frame`. */
  className?: string;
}

export interface IngredientSearchFormProps {
  /** The form's accessible name, title case: "Filter the Compendium". */
  label: string;
  /** The page itself: the form's native GET target and the unfiltered first page Clear opens. */
  action: Route;
  /** The text the list shows, which the box starts from. */
  query: string;
  /** Each value of the filter the page shows: Clear is drawn while any is set. */
  shown: readonly FilterValue[];
  /** The list with `query` set to `text` and the other filters kept, from the first page. */
  searchHref: (text: string) => Route;
  /** Where a picked match opens. */
  pickHref: (match: IngredientSearchMatch) => Route;
  /**
   * The head of the route modal a pick opens, shown at once while the
   * modal's content loads. Given, a pick opens `pickHref` as a route modal
   * over the list as it stands; left out, a pick is a plain navigation.
   */
  pickHeading?: (match: IngredientSearchMatch) => ModalHeading;
  /** The filter slot: the consumer's other fields, after the search box. */
  children?: ReactNode;
}

export interface IngredientSearchBoxProps {
  /** The draft text the box shows. */
  text: string;
  onText: (text: string) => void;
  searchHref: IngredientSearchFormProps['searchHref'];
  pickHref: IngredientSearchFormProps['pickHref'];
  pickHeading?: IngredientSearchFormProps['pickHeading'];
}
