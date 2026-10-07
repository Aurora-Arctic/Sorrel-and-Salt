/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type CategoryInput = {
  description: string;
  groupId: string | number;
  name: string;
};

/** A curated deity picked, or a name typed: exactly one of the two. */
export type IngredientDeityInput = {
  deityId?: string | number | null | undefined;
  name?: string | null | undefined;
};

export type IngredientElement =
  | 'air'
  | 'earth'
  | 'fire'
  | 'spirit'
  | 'water';

export type IngredientInput = {
  canonicalName?: string | null | undefined;
  /** The categories it is filed under. */
  categoryIds?: Array<string | number> | null | undefined;
  colors?: Array<string> | null | undefined;
  deities?: Array<IngredientDeityInput> | null | undefined;
  description?: string | null | undefined;
  elements?: Array<IngredientElement> | null | undefined;
  folkNames?: Array<string> | null | undefined;
  form?: string | null | undefined;
  /** The curated form picked for `form`; none when it was typed. */
  formId?: string | number | null | undefined;
  name: string;
  nomenclature?: Nomenclature | null | undefined;
  planets?: Array<string> | null | undefined;
  references?: Array<ReferenceLinkInput> | null | undefined;
  safetyNotes?: string | null | undefined;
  substitutes?: Array<SubstituteInput> | null | undefined;
  zodiacSigns?: Array<string> | null | undefined;
};

export type Nomenclature =
  | 'botanical'
  | 'chemical'
  | 'fungal'
  | 'mineral'
  | 'none'
  | 'unknown'
  | 'zoological';

/** A reference, whole. On an update, a field left out or null is cleared. */
export type ReferenceInput = {
  accessed?: string | null | undefined;
  authors?: string | null | undefined;
  container?: string | null | undefined;
  contributors?: string | null | undefined;
  edition?: string | null | undefined;
  host?: string | null | undefined;
  issue?: string | null | undefined;
  kind: ReferenceKind;
  modified?: string | null | undefined;
  note?: string | null | undefined;
  pages?: string | null | undefined;
  place?: string | null | undefined;
  published?: string | null | undefined;
  publisher?: string | null | undefined;
  series?: string | null | undefined;
  title: string;
  url?: string | null | undefined;
  volume?: string | null | undefined;
};

export type ReferenceKind =
  | 'article'
  | 'book'
  | 'chapter'
  | 'entry'
  | 'web_page';

export type ReferenceLinkInput = {
  locator?: string | null | undefined;
  referenceId: string | number;
};

/** An ingredient to link, or the name of one not entered: exactly one of the two. */
export type SubstituteInput = {
  ingredientId?: string | number | null | undefined;
  name?: string | null | undefined;
};

export type CreateCategoryMutationVariables = Exact<{
  input: CategoryInput;
}>;


export type CreateCategoryMutation = { createCategory: { id: string, slug: string } };

export type UpdateCategoryMutationVariables = Exact<{
  id: string | number;
  input: CategoryInput;
}>;


export type UpdateCategoryMutation = { updateCategory: { id: string, slug: string } };

export type DeleteCategoryMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteCategoryMutation = { deleteCategory: string };

export type SetEmailMutationVariables = Exact<{
  email: string;
  next?: string | null | undefined;
}>;


export type SetEmailMutation = { setEmail: { id: string, email: string } };

export type PickerCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type PickerCategoriesQuery = { categories: { edges: Array<{ node: { id: string, name: string, description: string, group: { id: string, name: string, colorDark: string, colorLight: string } } }> } };

export type PossibleDuplicatesQueryVariables = Exact<{
  workspaceId: string | number;
  name: string;
  first?: number | null | undefined;
}>;


export type PossibleDuplicatesQuery = { possibleDuplicates: { edges: Array<{ node: { id: string, name: string, canonicalName: string | null } }> } };

export type CreateWorkspaceIngredientMutationVariables = Exact<{
  workspaceId: string | number;
  input: IngredientInput;
}>;


export type CreateWorkspaceIngredientMutation = { createWorkspaceIngredient: { id: string, name: string } };

export type CreateReferenceMutationVariables = Exact<{
  workspaceId?: string | number | null | undefined;
  input: ReferenceInput;
}>;


export type CreateReferenceMutation = { createReference: { id: string, citation: string, isGlobal: boolean } };

export type ReferenceSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type ReferenceSuggestionsQuery = { referenceSuggestions: { edges: Array<{ node: { id: string, citation: string, isGlobal: boolean } }> } };

export type FormSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type FormSuggestionsQuery = { formSuggestions: { edges: Array<{ node: { id: string | null, value: string, description: string | null, group: string | null, curated: boolean, claimants: Array<{ name: string, canonicalName: string | null }> } }> } };

export type CommonNameSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type CommonNameSuggestionsQuery = { commonNameSuggestions: { edges: Array<{ node: { value: string, claimants: Array<{ name: string, canonicalName: string | null }> } }> } };

export type PlanetSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type PlanetSuggestionsQuery = { planetSuggestions: { edges: Array<{ node: { value: string, description: string | null, curated: boolean } }> } };

export type ZodiacSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type ZodiacSuggestionsQuery = { zodiacSuggestions: { edges: Array<{ node: { value: string, description: string | null, curated: boolean } }> } };

export type DeitySuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type DeitySuggestionsQuery = { deitySuggestions: { edges: Array<{ node: { id: string | null, value: string, description: string | null, tradition: string | null, curated: boolean } }> } };

export type IngredientSuggestionsQueryVariables = Exact<{
  workspaceId: string | number;
  query?: string | null | undefined;
  first?: number | null | undefined;
}>;


export type IngredientSuggestionsQuery = { ingredientSuggestions: { edges: Array<{ node: { id: string, name: string, canonicalName: string | null, form: string | null, description: string | null, isGlobal: boolean } }> } };


export const CreateCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const UpdateCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CategoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<UpdateCategoryMutation, UpdateCategoryMutationVariables>;
export const DeleteCategoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCategory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteCategory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCategoryMutation, DeleteCategoryMutationVariables>;
export const SetEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"next"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"next"},"value":{"kind":"Variable","name":{"kind":"Name","value":"next"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<SetEmailMutation, SetEmailMutationVariables>;
export const PickerCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PickerCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"group"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"colorDark"}},{"kind":"Field","name":{"kind":"Name","value":"colorLight"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<PickerCategoriesQuery, PickerCategoriesQueryVariables>;
export const PossibleDuplicatesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PossibleDuplicates"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"possibleDuplicates"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<PossibleDuplicatesQuery, PossibleDuplicatesQueryVariables>;
export const CreateWorkspaceIngredientDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkspaceIngredient"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"IngredientInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkspaceIngredient"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<CreateWorkspaceIngredientMutation, CreateWorkspaceIngredientMutationVariables>;
export const CreateReferenceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateReference"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReferenceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createReference"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]} as unknown as DocumentNode<CreateReferenceMutation, CreateReferenceMutationVariables>;
export const ReferenceSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReferenceSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"citation"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ReferenceSuggestionsQuery, ReferenceSuggestionsQueryVariables>;
export const FormSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FormSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"formSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}},{"kind":"Field","name":{"kind":"Name","value":"claimants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<FormSuggestionsQuery, FormSuggestionsQueryVariables>;
export const CommonNameSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommonNameSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commonNameSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"claimants"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<CommonNameSuggestionsQuery, CommonNameSuggestionsQueryVariables>;
export const PlanetSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PlanetSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"planetSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<PlanetSuggestionsQuery, PlanetSuggestionsQueryVariables>;
export const ZodiacSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZodiacSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zodiacSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ZodiacSuggestionsQuery, ZodiacSuggestionsQueryVariables>;
export const DeitySuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DeitySuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deitySuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tradition"}},{"kind":"Field","name":{"kind":"Name","value":"curated"}}]}}]}}]}}]}}]} as unknown as DocumentNode<DeitySuggestionsQuery, DeitySuggestionsQueryVariables>;
export const IngredientSuggestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IngredientSuggestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ingredientSuggestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"workspaceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"workspaceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"canonicalName"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isGlobal"}}]}}]}}]}}]}}]} as unknown as DocumentNode<IngredientSuggestionsQuery, IngredientSuggestionsQueryVariables>;