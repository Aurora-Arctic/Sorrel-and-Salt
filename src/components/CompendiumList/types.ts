import type { Route } from 'next';
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
  /** Its categories, each with its group's colours: `[]` for an entry with none. */
  categories: readonly CardCategory[];
  editHref: Route;
  /** The head of its edit modal, which a press shows at once while the form loads (M9.18). */
  editHeading: ModalHeading;
  /** Its details modal over the list, `?entry=<slug>`, which the Quick Look eye left of its name opens (M12.5). */
  details: RouteModalLink;
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
  /** What each filter offers, and how many entries each choice would list (M12.4). */
  facets: CompendiumFacetCounts;
  /** Every live category, which the Categories box offers and the address names by slug. */
  categories: readonly CompendiumCategoryChoice[];
  /** What the panel needs to read its own live counts, which name a deity by id and a form by spelling. */
  vocabulary: CompendiumFacetVocabulary;
  /** Where this page stands among them all, for the pager. */
  position?: PagePosition;
  /** How many entries the filter finds in all, which the search sentence leads with. */
  total: number;
  /** The cursor of the page shown, which a pick's Quick Look opens over and closes back to. */
  cursor?: SearchCursor;
}

/** What turns the counts the panel asks for into choices: every live deity, and each curated form's group icon by its name folded to lower case. */
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
 * One choice a filter offers and how many entries the list would hold with it
 * chosen, the rest of the filter kept (M12.3, M12.4). `value` is what the
 * address carries for it, `?forms=Oil`, and `label` what a chip or an option
 * says. `V` is narrowed where the set is closed.
 */
export interface FacetChoice<V extends string = string> {
  value: V;
  label: string;
  count: number;
}

/** A form: its text is its value and its label, and its curated group's icon, null for a form with none. */
export interface FormFacetChoice extends FacetChoice {
  icon: FormGroupIcon | null;
}

/**
 * A deity: its value is its slug (its name and its tradition's, `hecate-greek`),
 * its label its name, and `tradition` the tradition's name, which tells two
 * gods of one name apart.
 */
export interface DeityFacetChoice extends FacetChoice {
  tradition: string;
}

/** A category: its value is its slug, and it carries its group's colours for a chip. */
export interface CategoryFacetChoice extends FacetChoice {
  group: PickerCategory['group'];
}

/**
 * Every filter's choices with their counts, read for the filter the page
 * shows (the compendium's `compendiumFacets`, public like the list). Each list
 * is in the order to offer them: forms, deities and categories most entries
 * first, then by label, and only the values some entry carries plus the ones
 * chosen, which sit at zero if none does; signs, celestial bodies and elements all of
 * them, zeros included, in the vocabulary's order; toxic as toxic, then not
 * toxic.
 */
export interface CompendiumFacetCounts {
  forms: FormFacetChoice[];
  deities: DeityFacetChoice[];
  categories: CategoryFacetChoice[];
  /** Zodiac signs, by name. */
  zodiac: FacetChoice[];
  /** Celestial bodies, by name. */
  celestialBodies: FacetChoice[];
  elements: FacetChoice<IngredientElement>[];
  toxic: FacetChoice<'toxic' | 'not_toxic'>[];
  /** How many entries cite no live reference, the No Refs switch's count; the same with it on or off. */
  withoutReferences: number;
  /** How many entries have no live form, the No Form switch's count; the same with it on or off. */
  withoutForms: number;
  /**
   * The coven's Source strip (M9.7): Local, then Compendium, zeros kept, each counted with
   * the strip's own choice left out. Left off by the public and admin lists, which have no
   * source, and by a coven panel whose counts have not been read.
   */
  source?: FacetChoice<IngredientSource>[];
  /**
   * The admin's Reviewed strip (M14.8): Reviewed, then Needs Review, zeros kept, each counted
   * with the strip's own choice left out. Left off for anyone who does not curate, whom the
   * service gives no review counts.
   */
  reviewed?: FacetChoice<ReviewSetting>[];
  /** The coven's In Stock switch's count, the same with it on or off. Left off with `source`. */
  inStock?: number;
  /** The coven's Low Stock Only switch's count (M9.8), read as inStock's is. */
  lowStockOnly?: number;
}

/** The Reviewed strip's two settings (M14.8): marked reviewed by a curator, or not. */
export type ReviewSetting = (typeof REVIEW_SETTINGS)[number];

/**
 * The list's filter as asked: the name query, the forms, deities (by slug),
 * zodiac signs and celestial bodies an entry may hold, whether to show only the entries
 * that cite no reference, the elements it may hold, toxic or not toxic (blank
 * for either), and the categories it must all be filed under, or any of, by
 * slug. Read from the address by the parameter table (./params.ts), whose
 * entries it is made of.
 */
export type CompendiumListFilter = SearchFilter<typeof COMPENDIUM_PARAMS.entries>;

/**
 * The coven list's filter (M9.6): the compendium's, with the Source, In Stock and Low Stock Only
 * choices only a coven has. Read from the address by `COVEN_PARAMS`.
 */
export type CovenListFilter = SearchFilter<typeof COVEN_PARAMS.entries>;

/**
 * Where the list stands: its filter, the cursor of the page a modal opens
 * over, and the entry whose details modal is open, `?entry=<slug>` (M12.5),
 * which an edit modal stacked over the details keeps, so it closes back to them.
 */
export type CompendiumPlace = Partial<CompendiumListFilter> & SearchCursor & { entry?: string };

/** The dialog a coven list address opens over it (M8.17): an own entry's Edit, or a held compendium entry's Annotate. */
export type CovenListDialog = { edit: string } | { annotate: string };

/** What the filter form starts from: the page's filter, and the choices it offers. */
export type CompendiumListFilterProps = Pick<
  CompendiumListProps,
  'facets' | 'categories' | 'vocabulary' | 'cursor'
> & {
  /**
   * The filter the page shows. A coven list's also carries its Source, In Stock and Low Stock Only
   * choices (`CovenListFilter`), which the other two lists leave out.
   */
  filter: Omit<CompendiumListFilter, 'reviewed'> &
    Partial<Pick<CompendiumListFilter, 'reviewed'>> &
    Partial<Pick<CovenListFilter, 'source' | 'inStock' | 'lowStockOnly'>>;
  /**
   * Who the filter is for. Each opens a pick's Quick Look over the list as it stands, keyed as the
   * list's own eye keys it. The admin's (the default) offers No Refs and submits to
   * `/admin/compendium`; the public one (M8.18) has no No Refs and submits to `/compendium`; a
   * coven's (M9.6) submits to `/coven/<covenSlug>/ingredients`, suggests from the coven's
   * cupboard, and adds Source, In Stock and Low Stock Only. A flag and plain data, not
   * functions, since the filter is a client component its server page passes props to.
   */
  audience?: 'admin' | 'public' | 'coven';
  /** The coven's address segment, for `audience="coven"`. */
  covenSlug?: string;
  /** The coven's id, for `audience="coven"`: the type-ahead and the live counts read it. */
  workspaceId?: string;
  /**
   * The signed-in viewer's covens, every membership, which In My Covens offers by name and the
   * sentence names (M12.55). The public list only; left out, the field is not drawn.
   */
  covens?: readonly { id: string; name: string }[];
};
