import type { ListFieldName, LookupListFieldProps } from '@/components/IngredientForm/types';
import type {
  CommonNameSuggestionsQuery,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  CelestialBodySuggestionsQuery,
  PickerCategoriesQuery,
  PossibleDuplicatesQuery,
  ReferenceSuggestionsQuery,
} from '@/gql/graphql';

export type CategoryNode = PickerCategoriesQuery['categories']['edges'][number]['node'];

export type FormNode = FormSuggestionsQuery['formSuggestions']['edges'][number]['node'];

export type NameNode = CommonNameSuggestionsQuery['commonNameSuggestions']['edges'][number]['node'];

export type CorrespondenceNode =
  CelestialBodySuggestionsQuery['celestialBodySuggestions']['edges'][number]['node'];

export type DeityNode = DeitySuggestionsQuery['deitySuggestions']['edges'][number]['node'];

/** Both optional, so a test not about the groups lists its rows as the compendium's, with no cupboard entry. */
type SuggestedNode = IngredientSuggestionsQuery['ingredientSuggestions']['edges'][number]['node'];
export type IngredientNode = Omit<SuggestedNode, 'cupboardEntry'> & {
  cupboardEntry?: SuggestedNode['cupboardEntry'];
  group?: 'yours' | 'compendium';
};

/** A coven's own entry unless said otherwise: `isGlobal` and `inCupboard` default to false, and `nomenclature` to `unknown`, which only the Quick Look heading reads. */
export type DuplicateNode = Omit<
  PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'],
  'isGlobal' | 'inCupboard' | 'nomenclature'
> &
  Partial<
    Pick<
      PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'],
      'isGlobal' | 'inCupboard' | 'nomenclature'
    >
  >;

export type ReferenceNode =
  ReferenceSuggestionsQuery['referenceSuggestions']['edges'][number]['node'];

export interface Variant {
  variant: string;
  name: ListFieldName;
  legend: string;
  entry: string;
  ordered?: boolean;
  pickOnly?: boolean;
}

export type LookupList = Omit<LookupListFieldProps, 'workspaceId'>;
