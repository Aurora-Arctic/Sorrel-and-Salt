/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n": typeof types.SetEmailDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n    }\n  }\n": typeof types.CreateWorkspaceIngredientDocument,
    "\n  query FormSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.CommonNameSuggestionsDocument,
};
const documents: Documents = {
    "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n": types.SetEmailDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n    }\n  }\n": types.CreateWorkspaceIngredientDocument,
    "\n  query FormSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.CommonNameSuggestionsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n"): (typeof documents)["\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FormSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query FormSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CommonNameSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CommonNameSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;