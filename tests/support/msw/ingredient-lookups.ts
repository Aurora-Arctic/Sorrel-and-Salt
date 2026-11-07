import type {
  CommonNameSuggestionsQuery,
  CommonNameSuggestionsQueryVariables,
  CompendiumEntryUsersQuery,
  CompendiumEntryUsersQueryVariables,
  CompendiumSubstitutesQuery,
  CompendiumSubstitutesQueryVariables,
  CreateCompendiumIngredientMutation,
  CreateCompendiumIngredientMutationVariables,
  CreateReferenceMutation,
  CreateReferenceMutationVariables,
  CreateWorkspaceIngredientMutation,
  CreateWorkspaceIngredientMutationVariables,
  FormSuggestionsQuery,
  FormSuggestionsQueryVariables,
  IngredientSuggestionsQueryVariables,
  CelestialBodySuggestionsQueryVariables,
  CompendiumMatchesQuery,
  CompendiumMatchesQueryVariables,
  PossibleDuplicatesQuery,
  PossibleDuplicatesQueryVariables,
  ReferenceQuery,
  ReferenceQueryVariables,
  ReferenceSuggestionsQuery,
  ReferenceSuggestionsQueryVariables,
  UpdateCompendiumIngredientMutation,
  UpdateCompendiumIngredientMutationVariables,
  UpdateReferenceMutation,
  UpdateReferenceMutationVariables,
  UpdateWorkspaceIngredientMutation,
  UpdateWorkspaceIngredientMutationVariables,
} from '@/gql/graphql';
import type {
  CategoryNode,
  CorrespondenceNode,
  DeityNode,
  DuplicateNode,
  FormNode,
  IngredientNode,
  NameNode,
  ReferenceNode,
} from '../../components/IngredientForm/types';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from './graphql';

// The ingredient form's lookups answered as /api/graphql answers them, each recording the variables it was
// asked with, with the reference panel's and the form's saves beside them. A later answer wins, so a test
// answers a lookup after whatever answered it empty: `offerNothing` answers every one.

export const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';

export const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';

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

export function offerDuplicates(nodes: DuplicateNode[]) {
  const calls: PossibleDuplicatesQueryVariables[] = [];
  mockGraphQLQuery<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>(
    'PossibleDuplicates',
    (variables) => {
      calls.push(variables);
      return {
        possibleDuplicates: {
          edges: nodes.map((node) => ({
            node: { isGlobal: false, inCupboard: false, nomenclature: 'unknown', ...node },
          })),
        },
      };
    },
  );
  // A save also asks which compendium entries bear the name exactly:
  // none, until a test says otherwise with `offerCompendiumMatches`.
  offerCompendiumMatches([]);
  return calls;
}

export function offerCompendiumMatches(nodes: DuplicateNode[]) {
  const calls: CompendiumMatchesQueryVariables[] = [];
  mockGraphQLQuery<CompendiumMatchesQuery, CompendiumMatchesQueryVariables>(
    'CompendiumMatches',
    (variables) => {
      calls.push(variables);
      return {
        compendiumMatches: {
          edges: nodes.map((node) => ({
            node: { isGlobal: true, inCupboard: false, nomenclature: 'unknown', ...node },
          })),
        },
      };
    },
  );
  return calls;
}

export function offerList<N>(operation: string, field: string, nodes: N[]) {
  const calls: CelestialBodySuggestionsQueryVariables[] = [];
  mockGraphQLQuery<Record<string, unknown>, CelestialBodySuggestionsQueryVariables>(
    operation,
    (variables) => {
      calls.push(variables);
      return { [field]: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

export const offerCelestialBodies = (nodes: CorrespondenceNode[]) =>
  offerList('CelestialBodySuggestions', 'celestialBodySuggestions', nodes);
export const offerSigns = (nodes: CorrespondenceNode[]) =>
  offerList('ZodiacSuggestions', 'zodiacSuggestions', nodes);
export const offerDeities = (nodes: DeityNode[]) =>
  offerList('DeitySuggestions', 'deitySuggestions', nodes);
export function offerIngredients(nodes: IngredientNode[]) {
  const calls: IngredientSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<Record<string, unknown>, IngredientSuggestionsQueryVariables>(
    'IngredientSuggestions',
    (variables) => {
      calls.push(variables);
      return {
        ingredientSuggestions: {
          edges: nodes.map(({ group = 'compendium', ...node }) => ({
            group,
            node: { cupboardEntry: null, ...node },
          })),
        },
      };
    },
  );
  return calls;
}

export function offerReferences(nodes: ReferenceNode[]) {
  const calls: ReferenceSuggestionsQueryVariables[] = [];
  mockGraphQLQuery<ReferenceSuggestionsQuery, ReferenceSuggestionsQueryVariables>(
    'ReferenceSuggestions',
    (variables) => {
      calls.push(variables);
      return { referenceSuggestions: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

export const NEW_REFERENCE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const NEW_REFERENCE_SOURCE = {
  kind: 'book',
  authors: 'Mock, Cyril',
  title: 'A Fixture Grimoire',
  container: null,
} as const;

export function acceptReference(citation = 'Mock, Cyril. A Fixture Grimoire. Mockford, 1999.') {
  const calls: CreateReferenceMutationVariables[] = [];
  mockGraphQLMutation<CreateReferenceMutation, CreateReferenceMutationVariables>(
    'CreateReference',
    (variables) => {
      calls.push(variables);
      return {
        createReference: {
          id: NEW_REFERENCE_ID,
          citation,
          isGlobal: false,
          ...NEW_REFERENCE_SOURCE,
        },
      };
    },
  );
  return calls;
}

export function offerReference(source: ReferenceQuery['reference']) {
  const calls: ReferenceQueryVariables[] = [];
  mockGraphQLQuery<ReferenceQuery, ReferenceQueryVariables>('Reference', (variables) => {
    calls.push(variables);
    return { reference: source };
  });
  return calls;
}

export function acceptReferenceUpdate(citation: string) {
  const calls: UpdateReferenceMutationVariables[] = [];
  mockGraphQLMutation<UpdateReferenceMutation, UpdateReferenceMutationVariables>(
    'UpdateReference',
    (variables) => {
      calls.push(variables);
      const { kind, authors, title, container } = variables.input;
      return {
        updateReference: {
          id: String(variables.id),
          citation,
          isGlobal: variables.workspaceId == null,
          kind,
          authors: authors ?? null,
          title,
          container: container ?? null,
        },
      };
    },
  );
  return calls;
}

export function offerCompendium(
  nodes: CompendiumSubstitutesQuery['compendium']['edges'][number]['node'][],
) {
  const calls: CompendiumSubstitutesQueryVariables[] = [];
  mockGraphQLQuery<CompendiumSubstitutesQuery, CompendiumSubstitutesQueryVariables>(
    'CompendiumSubstitutes',
    (variables) => {
      calls.push(variables);
      return { compendium: { edges: nodes.map((node) => ({ node })) } };
    },
  );
  return calls;
}

export function offerCategories(nodes: CategoryNode[] | 'refused') {
  if (nodes === 'refused') return mockGraphQLError('PickerCategories', { code: 'FORBIDDEN' });
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: nodes.map((node) => ({ node })) },
  }));
}

export function offerEntryUsers(covens: number) {
  const asked: CompendiumEntryUsersQueryVariables[] = [];
  mockGraphQLQuery<CompendiumEntryUsersQuery, CompendiumEntryUsersQueryVariables>(
    'CompendiumEntryUsers',
    (variables) => {
      asked.push(variables);
      return { compendiumEntryUsers: covens };
    },
  );
  return asked;
}

export function offerNothing() {
  offerCategories([]);
  offerEntryUsers(0);
  return {
    forms: offerForms([]),
    names: offerNames([]),
    celestialBodies: offerCelestialBodies([]),
    signs: offerSigns([]),
    deities: offerDeities([]),
    ingredients: offerIngredients([]),
    compendium: offerCompendium([]),
    references: offerReferences([]),
    duplicates: offerDuplicates([]),
  };
}

export function acceptCreate() {
  const calls: CreateWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateWorkspaceIngredientMutation,
    CreateWorkspaceIngredientMutationVariables
  >('CreateWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return {
      createWorkspaceIngredient: {
        id: 'saved-1',
        name: variables.input.name,
        slug: 'saved',
        revision: 1,
        stock: [],
      },
    };
  });
  return calls;
}

export function acceptCompendiumCreate() {
  const calls: CreateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    CreateCompendiumIngredientMutation,
    CreateCompendiumIngredientMutationVariables
  >('CreateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return {
      createCompendiumIngredient: {
        id: ENTRY_ID,
        name: variables.input.name,
        slug: 'testwort-fixtura-testalis',
        revision: 1,
      },
    };
  });
  return calls;
}

export function acceptUpdate() {
  const calls: UpdateCompendiumIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    UpdateCompendiumIngredientMutation,
    UpdateCompendiumIngredientMutationVariables
  >('UpdateCompendiumIngredient', (variables) => {
    calls.push(variables);
    return {
      updateCompendiumIngredient: {
        id: String(variables.id),
        name: variables.input.name,
        slug: 'mockwort-fixtura-testalis',
        revision: (variables.expectedRevision ?? 0) + 1,
      },
    };
  });
  return calls;
}

export function acceptCovenUpdate() {
  const calls: UpdateWorkspaceIngredientMutationVariables[] = [];
  mockGraphQLMutation<
    UpdateWorkspaceIngredientMutation,
    UpdateWorkspaceIngredientMutationVariables
  >('UpdateWorkspaceIngredient', (variables) => {
    calls.push(variables);
    return {
      updateIngredient: {
        id: String(variables.id),
        name: variables.input.name,
        slug: 'mockwort-fixtura-testalis',
        revision: (variables.expectedRevision ?? 0) + 1,
      },
    };
  });
  return calls;
}
