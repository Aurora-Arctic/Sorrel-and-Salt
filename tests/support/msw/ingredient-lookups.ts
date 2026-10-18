import type {
  CommonNameSuggestionsQuery,
  CommonNameSuggestionsQueryVariables,
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

// The ingredient form's lookups answered as /api/graphql answers them, each
// recording the variables it was asked with: shared by the form's test and
// the tests of the fields that ask them (MB.181), with the reference panel's
// `CreateReference` beside them (MB.182), and the edit's `Reference` and
// `UpdateReference`, and the saves the form sends, each test file had its
// own copy of (MB.115). A later answer wins, so a test answers a lookup after
// whatever answered it empty: `offerNothing` answers every one.

/** The coven the form's tests act in. */
export const WORKSPACE_ID = '7b0c1c3e-5f4a-4d8e-9a51-3c2f0e6d9b17';

/** The entry an edit opens, and the id a compendium save answers with. */
export const ENTRY_ID = '3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93';

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
 * Answers one of the list boxes' lookups — `CelestialBodySuggestions` answering
 * `celestialBodySuggestions`, and so on — with these rows, recording each ask. All
 * of them take the same variables.
 */
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
/** Answers `IngredientSuggestions`, each row's group on its edge (M12.19), recording each ask. */
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

/** Answers `ReferenceSuggestions` with these sources, recording each ask. */
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

/** The id `acceptReference` gives the source it saves. */
export const NEW_REFERENCE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** The fields the default new source's short form is made of, "Mock, _Fixture Grimoire_". */
const NEW_REFERENCE_SOURCE = {
  kind: 'book',
  authors: 'Mock, Cyril',
  title: 'A Fixture Grimoire',
  container: null,
} as const;

/** Answers `CreateReference` with a new coven source reading `citation`, recording each ask. */
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

/** Answers `Reference` with this source whole, recording each ask. */
export function offerReference(source: ReferenceQuery['reference']) {
  const calls: ReferenceQueryVariables[] = [];
  mockGraphQLQuery<ReferenceQuery, ReferenceQueryVariables>('Reference', (variables) => {
    calls.push(variables);
    return { reference: source };
  });
  return calls;
}

/**
 * Answers `UpdateReference` with the source as sent, now reading `citation`,
 * in the tier it was sent to; records each ask.
 */
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

/** Answers the substitutes' `CompendiumSubstitutes`, the compendium's form's, with these entries, recording each ask. */
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

/** Answers `PickerCategories` with these rows, as the one page the picker reads, or refuses it. */
export function offerCategories(nodes: CategoryNode[] | 'refused') {
  if (nodes === 'refused') return mockGraphQLError('PickerCategories', { code: 'FORBIDDEN' });
  mockGraphQLQuery<Record<string, unknown>>('PickerCategories', () => ({
    categories: { edges: nodes.map((node) => ({ node })) },
  }));
}

/**
 * Every lookup the form asks, in either tier, answered empty, each one's asks
 * recorded; the categories are read as the form opens, and recorded by none.
 */
export function offerNothing() {
  offerCategories([]);
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

/** Answers `CreateWorkspaceIngredient` with a saved row, recording the variables it was sent. */
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
        stock: [],
      },
    };
  });
  return calls;
}

/** Answers `CreateCompendiumIngredient` with a saved entry, `ENTRY_ID`, recording each ask. */
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
      },
    };
  });
  return calls;
}

/**
 * Answers `UpdateCompendiumIngredient`, the one update the form's tests save,
 * with the entry it was sent, recording each ask.
 */
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
      },
    };
  });
  return calls;
}
