import type {
  CommonNameSuggestionsQuery,
  CommonNameSuggestionsQueryVariables,
  FormSuggestionsQuery,
  FormSuggestionsQueryVariables,
  PlanetSuggestionsQueryVariables,
  PossibleDuplicatesQuery,
  PossibleDuplicatesQueryVariables,
} from '@/gql/graphql';
import type {
  CorrespondenceNode,
  DeityNode,
  DuplicateNode,
  FormNode,
  IngredientNode,
  NameNode,
} from '../../components/IngredientForm/types';
import { mockGraphQLQuery } from './graphql';

// The ingredient form's lookups answered as /api/graphql answers them, each
// recording the variables it was asked with: shared by the form's test and
// the tests of the fields that ask them (MB.181). A later answer wins, so a
// test answers a lookup after whatever answered it empty.

/** The coven the form's tests act in. */
export const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';

/** Answers `FormSuggestions` with these rows, recording the variables each ask was sent with. */
export function offerForms(nodes: FormNode[]) {
  const calls: FormSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<FormSuggestionsQuery, FormSuggestionsQueryVariables>(
    'FormSuggestions',
    (variables) => {
      calls.push(variables);
      return { formSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers `CommonNameSuggestions` with these rows, recording each ask. */
export function offerNames(nodes: NameNode[]) {
  const calls: CommonNameSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<CommonNameSuggestionsQuery, CommonNameSuggestionsQueryVariables>(
    'CommonNameSuggestions',
    (variables) => {
      calls.push(variables);
      return { commonNameSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/** Answers `PossibleDuplicates` with these rows, recording each ask. */
export function offerDuplicates(nodes: DuplicateNode[]) {
  const calls: PossibleDuplicatesQueryVariables[] = [];
  mockGraphQLQuery<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>(
    'PossibleDuplicates',
    (variables) => {
      calls.push(variables);
      return { possibleDuplicates: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

/**
 * Answers one of the list boxes' lookups — `PlanetSuggestions` answering
 * `planetSuggestions`, and so on — with these rows, recording each ask. All
 * of them take the same variables.
 */
export function offerList<N>(operation: string, field: string, nodes: N[]) {
  const calls: PlanetSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<Record<string, unknown>, PlanetSuggestionsQueryVariables>(
    operation,
    (variables) => {
      calls.push(variables);
      return { [field]: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

export const offerPlanets = (nodes: CorrespondenceNode[]) =>
  offerList('PlanetSuggestions', 'planetSuggestions', nodes);
export const offerSigns = (nodes: CorrespondenceNode[]) =>
  offerList('ZodiacSuggestions', 'zodiacSuggestions', nodes);
export const offerDeities = (nodes: DeityNode[]) =>
  offerList('DeitySuggestions', 'deitySuggestions', nodes);
export const offerIngredients = (nodes: IngredientNode[]) =>
  offerList('IngredientSuggestions', 'ingredientSuggestions', nodes);
