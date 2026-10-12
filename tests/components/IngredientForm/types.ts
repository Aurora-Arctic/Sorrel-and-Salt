import type { ListFieldName, LookupListFieldProps } from '@/components/IngredientForm/types';
import type {
  CommonNameSuggestionsQuery,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  PlanetSuggestionsQuery,
  PickerCategoriesQuery,
  PossibleDuplicatesQuery,
  ReferenceSuggestionsQuery,
} from '@/gql/graphql';

/** One row of a `PickerCategories` answer. */
export type CategoryNode = PickerCategoriesQuery['categories']['edges'][number]['node'];

/** One row of a `FormSuggestions` answer, as the test offers it. */
export type FormNode = FormSuggestionsQuery['formSuggestions']['edges'][number]['node'];

/** One row of a `CommonNameSuggestions` answer. */
export type NameNode = CommonNameSuggestionsQuery['commonNameSuggestions']['edges'][number]['node'];

/** One row of a `PlanetSuggestions` or `ZodiacSuggestions` answer, which share a shape. */
export type CorrespondenceNode =
  PlanetSuggestionsQuery['planetSuggestions']['edges'][number]['node'];

/** One row of a `DeitySuggestions` answer. */
export type DeityNode = DeitySuggestionsQuery['deitySuggestions']['edges'][number]['node'];

/** One row of an `IngredientSuggestions` answer. */
export type IngredientNode =
  IngredientSuggestionsQuery['ingredientSuggestions']['edges'][number]['node'];

/** One row of a `PossibleDuplicates` answer. */
export type DuplicateNode = PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'];

/** One row of a `ReferenceSuggestions` answer. */
export type ReferenceNode =
  ReferenceSuggestionsQuery['referenceSuggestions']['edges'][number]['node'];

/** One shape a list field takes in list-field.test.tsx, under the name of a list that has it. */
export interface Variant {
  variant: string;
  name: ListFieldName;
  legend: string;
  entry: string;
  ordered?: boolean;
  pickOnly?: boolean;
}

/** A list box with a lookup, as lookups.test.tsx renders it: the field's props, the coven given apart. */
export type LookupList = Omit<LookupListFieldProps, 'workspaceId'>;
