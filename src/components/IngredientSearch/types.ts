import type { NomenclatureKind, ToxicFilter } from '@/modules/ingredients/schema/ingredient-enums';
import type { SpellStatus } from '@/modules/grimoire';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { FilterValue } from '../FilterForm/types';
import type { ComboboxOption } from '../Combobox/types';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export interface IngredientSearchMatch {
  id: string;
  slug: string;
  name: string;
  canonicalName: string | null;
  nomenclature: NomenclatureKind;
}

export interface IngredientSearchOption extends ComboboxOption {
  match?: IngredientSearchMatch;
}

export type SearchSource =
  | { kind: 'compendium' }
  | { kind: 'cupboard'; workspaceId: string }
  | { kind: 'grimoire'; workspaceId: string; status?: SpellStatus };

export interface IngredientSearchProps extends Partial<PagerHrefs<Route>> {
  search: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  position?: PagePosition;
  /** The list's own root class, beside `list-frame`. */
  className?: string;
  /** What the results area draws while another page is on its way: the list's own placeholder. */
  skeleton: ReactNode;
}

export interface IngredientSearchFormProps {
  label: string;
  action: Route;
  query: string;
  shown: readonly FilterValue[];
  searchHref: (text: string) => Route;
  pickHref?: (match: IngredientSearchMatch) => Route;
  pickHeading?: (match: IngredientSearchMatch) => ModalHeading;
  pickPlace?: string;
  source?: SearchSource;
  clear?: boolean;
  /** Joins the form's class. */
  className?: string;
  /** Draw the box empty and asking nothing, for a list on its way. */
  idle?: boolean;
  children?: ReactNode;
}

export interface IngredientSearchBoxProps {
  text: string;
  onText: (text: string) => void;
  searchHref: IngredientSearchFormProps['searchHref'];
  pickHref?: IngredientSearchFormProps['pickHref'];
  pickHeading?: IngredientSearchFormProps['pickHeading'];
  pickPlace?: IngredientSearchFormProps['pickPlace'];
  source?: IngredientSearchFormProps['source'];
}

export type SearchSentenceFacet =
  | 'query'
  | 'covens'
  | 'covensNot'
  | 'categories'
  | 'moonPhases'
  | 'daysOfWeek'
  | 'visibilities'
  | 'makers'
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
  | 'hidden'
  | 'reviewed';

export interface SearchSentenceFilter {
  query?: string | null;
  covens?: readonly string[];
  covensNot?: boolean;
  categories?: readonly string[];
  categoryMode?: 'all' | 'any';
  moonPhases?: readonly string[];
  daysOfWeek?: readonly string[];
  visibility?: string;
  makers?: readonly string[];
  forms?: readonly string[];
  deities?: readonly string[];
  zodiac?: readonly string[];
  celestialBodies?: readonly string[];
  elements?: readonly string[];
  toxic?: ToxicFilter | null;
  source?: 'local' | 'compendium' | null;
  inStock?: boolean;
  lowStockOnly?: boolean;
  nomenclature?: string | null;
  withoutReferences?: boolean;
  withoutForms?: boolean;
  hidden?: boolean;
  reviewed?: 'reviewed' | 'needs_review' | null;
}

export type SearchSentenceLabelFacet =
  | 'covens'
  | 'categories'
  | 'visibilities'
  | 'makers'
  | 'forms'
  | 'deities'
  | 'zodiac'
  | 'celestialBodies'
  | 'elements';

export type SearchSentenceLabels = Partial<
  Record<SearchSentenceLabelFacet, Readonly<Record<string, string>>>
>;

export type SearchSentenceFragment =
  | { kind: 'text'; text: string }
  | { kind: 'join'; text: string }
  | { kind: 'value'; text: string; facet: SearchSentenceFacet; value: string };

export interface SearchSentenceInput {
  filter: SearchSentenceFilter;
  labels?: SearchSentenceLabels;
  total: number;
  noun?: { one: string; other: string };
  admin?: boolean;
}

export interface SearchSentence {
  fragments: SearchSentenceFragment[];
  /** Whether any value is named, so the component can draw Clear All. */
  hasFilter: boolean;
}
