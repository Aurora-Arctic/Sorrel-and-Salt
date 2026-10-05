import type { CommonNameSuggestionsQuery, FormSuggestionsQuery } from '@/gql/graphql';

/** One row of a `FormSuggestions` answer, as the test offers it. */
export type FormNode = FormSuggestionsQuery['formSuggestions']['edges'][number]['node'];

/** One row of a `CommonNameSuggestions` answer. */
export type NameNode = CommonNameSuggestionsQuery['commonNameSuggestions']['edges'][number]['node'];
