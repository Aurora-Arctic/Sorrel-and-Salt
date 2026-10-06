import type {
  CommonNameSuggestionsQuery,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
} from '@/gql/graphql';

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
