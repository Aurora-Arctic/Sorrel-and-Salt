import type { Route } from 'next';
import type { CompendiumFacets, WorkspaceIngredientFacets } from '@/modules/ingredients';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type {
  IngredientElement,
  IngredientSource,
  NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { CardCategory } from '../CategoryChips/types';
import type { PickerCategory } from '../CategoryPicker/types';
import type { SearchCursor, SearchFilter } from '../../lib/search-param-table';
import type { COVEN_PARAMS } from '../IngredientSearch/coven-params';
import type { COMPENDIUM_PARAMS, REVIEW_SETTINGS } from './params';
import type { UpdatedStamp } from '../DataTable/types';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { MyCoven } from '../FacetPanel/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export interface CompendiumListEntry extends UpdatedStamp {
  id: string;
  name: string;
  slug: string;
  nomenclature: NomenclatureKind;
  canonicalName: string | null;
  forms: CompendiumListForm[];
  categories: readonly CardCategory[];
  shown: boolean;
  sourcingScore?: number;
  editHref: Route;
  editHeading: ModalHeading;
  details: RouteModalLink;
}

export interface CompendiumListForm {
  name: string;
  icon: FormGroupIcon | null;
}

export interface CompendiumListProps extends Partial<PagerHrefs<Route>> {
  entries: readonly CompendiumListEntry[];
  filter: CompendiumListFilter;
  /** Each choice's count, a category and a deity by id, so their names and colours reach the browser once, in `categories` and `vocabulary`. */
  counts: FacetCountsById;
  categories: readonly CompendiumCategoryChoice[];
  vocabulary: CompendiumFacetVocabulary;
  position?: PagePosition;
  total: number;
  cursor?: SearchCursor;
}

/** The service's counts for the compendium's lists, or a coven's, which add Source and the two stock switches. */
export type FacetCountsById = CompendiumFacets | WorkspaceIngredientFacets;

export interface CompendiumFacetVocabulary {
  deities: readonly { id: string; slug: string; name: string; tradition: string }[];
  formIcons: Readonly<Record<string, FormGroupIcon>>;
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
 * One choice a filter offers and how many entries the list would hold with it chosen. `value` is what
 * the address carries (`?forms=Oil`), `label` what a chip or option says; `V` is narrowed where the
 * set is closed.
 */
export interface FacetChoice<V extends string = string> {
  value: V;
  label: string;
  count: number;
}

export interface FormFacetChoice extends FacetChoice {
  icon: FormGroupIcon | null;
}

export interface DeityFacetChoice extends FacetChoice {
  tradition: string;
}

export interface CategoryFacetChoice extends FacetChoice {
  group: PickerCategory['group'];
}

export interface CompendiumFacetCounts {
  forms: FormFacetChoice[];
  deities: DeityFacetChoice[];
  categories: CategoryFacetChoice[];
  zodiac: FacetChoice[];
  celestialBodies: FacetChoice[];
  elements: FacetChoice<IngredientElement>[];
  toxic: FacetChoice<'toxic' | 'not_toxic'>[];
  withoutReferences: number;
  withoutForms: number;
  source?: FacetChoice<IngredientSource>[];
  reviewed?: FacetChoice<ReviewSetting>[];
  inStock?: number;
  lowStockOnly?: number;
}

export type ReviewSetting = (typeof REVIEW_SETTINGS)[number];

export type CompendiumListFilter = SearchFilter<typeof COMPENDIUM_PARAMS.entries>;

export type CovenListFilter = SearchFilter<typeof COVEN_PARAMS.entries>;

/**
 * Where the list stands: its filter, the cursor of the page a modal opens
 * over, and the entry whose details modal is open, `?entry=<slug>`,
 * which an edit modal stacked over the details keeps, so it closes back to them.
 */
export type CompendiumPlace = Partial<CompendiumListFilter> & SearchCursor & { entry?: string };

export type CovenListDialog = { edit: string } | { annotate: string };

export type CompendiumListFilterProps = Pick<
  CompendiumListProps,
  'counts' | 'categories' | 'vocabulary' | 'cursor'
> & {
  filter: Omit<CompendiumListFilter, 'reviewed' | 'hidden' | 'sort' | 'order'> &
    Partial<Pick<CompendiumListFilter, 'reviewed' | 'hidden' | 'sort' | 'order'>> &
    Partial<Pick<CovenListFilter, 'source' | 'inStock' | 'lowStockOnly'>>;
  audience?: 'admin' | 'public' | 'coven';
  covenSlug?: string;
  workspaceId?: string;
  covens?: readonly MyCoven[];
};
