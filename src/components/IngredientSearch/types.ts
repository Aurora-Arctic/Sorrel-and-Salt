import type { NomenclatureKind, ToxicFilter } from '@/modules/ingredients/schema/ingredient-enums';
import type { SpellStatus } from '@/modules/grimoire';
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
  /** Its naming system, which a pick's dialog head sets the formal name by. */
  nomenclature: NomenclatureKind;
}

/** A dropdown row: the combobox's option, carrying the ingredient it stands for. A spell's row carries the spell id as `id` and `slug`. */
export interface IngredientSearchOption extends ComboboxOption {
  match?: IngredientSearchMatch;
}

/**
 * What the type-ahead suggests from. The compendium is the default; a coven's
 * cupboard suggests its own ingredients by the coven's label; a coven's grimoire
 * suggests its spells by title, of the tab's status when given (M10.11).
 */
export type SearchSource =
  | { kind: 'compendium' }
  | { kind: 'cupboard'; workspaceId: string }
  | { kind: 'grimoire'; workspaceId: string; status?: SpellStatus };

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
  /** The shape the results take while a page loads: a table (the default) or cards. */
  shape?: 'table' | 'cards';
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
  /**
   * Where a picked ingredient opens: on a list with a Quick Look, its details
   * modal over the list as it stands (M12.5). Left out, a pick applies its
   * row's text as the search. A grimoire's picks open the spell's recipe page (MB.6).
   */
  pickHref?: (match: IngredientSearchMatch) => Route;
  /**
   * The head of the route modal a pick opens, shown at once while the
   * modal's content loads. Given, a pick opens `pickHref` as a route modal
   * over the list as it stands; left out, a pick is a plain navigation.
   */
  pickHeading?: (match: IngredientSearchMatch) => ModalHeading;
  /**
   * The page's place for the modal a pick opens (`RouteModalProps.place`), where the page has
   * more than one: the details modal's `DETAILS_PLACE`, so its head shows at once there.
   */
  pickPlace?: string;
  /** What the type-ahead suggests from: the compendium when left out. */
  source?: SearchSource;
  /** Draw the form's own Clear while a filter is shown. Default true. */
  clear?: boolean;
  /** Joins the form's class. */
  className?: string;
  /** The filter slot: the consumer's other fields, after the search box. */
  children?: ReactNode;
}

export interface IngredientSearchBoxProps {
  /** The draft text the box shows. */
  text: string;
  onText: (text: string) => void;
  searchHref: IngredientSearchFormProps['searchHref'];
  pickHref?: IngredientSearchFormProps['pickHref'];
  pickHeading?: IngredientSearchFormProps['pickHeading'];
  pickPlace?: IngredientSearchFormProps['pickPlace'];
  source?: IngredientSearchFormProps['source'];
}

/** The kinds of filter the search sentence can name, in the order it names them. */
export type SearchSentenceFacet =
  | 'query'
  | 'covens'
  | 'covensNot'
  | 'categories'
  | 'forms'
  | 'deities'
  | 'zodiac'
  | 'celestialBodies'
  | 'elements'
  | 'toxic'
  | 'source'
  | 'inStock'
  | 'lowStockOnly'
  | 'nomenclature'
  | 'withoutReferences'
  | 'withoutForms'
  | 'reviewed';

/** The filter as the address holds it: the chosen values of each kind. Anything left out is not chosen. */
export interface SearchSentenceFilter {
  query?: string | null;
  /** The public compendium only (M12.55): ids of the viewer's covens an entry is held in, any of them. */
  covens?: readonly string[];
  /** Not In (M12.55): held in none of the picked covens, or with none picked none of the viewer's. */
  covensNot?: boolean;
  /** Category slugs. */
  categories?: readonly string[];
  /** `all` (the default) lists entries in every category, `any` in at least one. */
  categoryMode?: 'all' | 'any';
  forms?: readonly string[];
  /** Deity slugs. */
  deities?: readonly string[];
  zodiac?: readonly string[];
  celestialBodies?: readonly string[];
  elements?: readonly string[];
  /** The address's own choice: `toxic`, `not_toxic`, or `any` / left out for either. */
  toxic?: ToxicFilter | null;
  /** A coven's list only: where the entry came from, `local` or `compendium`; left out for both. */
  source?: 'local' | 'compendium' | null;
  /** A coven's list only: entries with a jar not at 0. */
  inStock?: boolean;
  /** A coven's list only: entries with a jar badged Low Stock or Out of Stock. */
  lowStockOnly?: boolean;
  /** Admin lists only. */
  nomenclature?: string | null;
  /** Admin lists only. */
  withoutReferences?: boolean;
  /** Admin lists only. */
  withoutForms?: boolean;
  /** Admin lists only (M14.8): `reviewed`, `needs_review`, or left out for either. */
  reviewed?: 'reviewed' | 'needs_review' | null;
}

/** The kinds that choose from a vocabulary, and so take display labels. */
export type SearchSentenceLabelFacet =
  'covens' | 'categories' | 'forms' | 'deities' | 'zodiac' | 'celestialBodies' | 'elements';

/** Display labels by chosen value. A value with no label is named by itself. */
export type SearchSentenceLabels = Partial<
  Record<SearchSentenceLabelFacet, Readonly<Record<string, string>>>
>;

/**
 * One piece of the sentence: plain text, a chosen value, or a join, the bare word ("or",
 * "and") that links two values in a list. A join is the word alone; the spaces round it are text.
 */
export type SearchSentenceFragment =
  | { kind: 'text'; text: string }
  | { kind: 'join'; text: string }
  | { kind: 'value'; text: string; facet: SearchSentenceFacet; value: string };

export interface SearchSentenceInput {
  filter: SearchSentenceFilter;
  labels?: SearchSentenceLabels;
  /** The number of entries the list found. */
  total: number;
  /** The noun for one entry and for any other number. Defaults to ingredient. */
  noun?: { one: string; other: string };
  /** An admin list: names Nomenclature and No Refs. */
  admin?: boolean;
}

export interface SearchSentence {
  fragments: SearchSentenceFragment[];
  /** Whether any value is named, so the component can draw Clear All. */
  hasFilter: boolean;
}
