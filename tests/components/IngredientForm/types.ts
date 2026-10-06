import type {
  CommonNameSuggestionsQuery,
  FormSuggestionsQuery,
  PossibleDuplicatesQuery,
} from '@/gql/graphql';

/** One row of a `FormSuggestions` answer, as the test offers it. */
export type FormNode = FormSuggestionsQuery['formSuggestions']['edges'][number]['node'];

/** One row of a `CommonNameSuggestions` answer. */
export type NameNode = CommonNameSuggestionsQuery['commonNameSuggestions']['edges'][number]['node'];

/** One row of a `PossibleDuplicates` answer. */
export type DuplicateNode = PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'];
