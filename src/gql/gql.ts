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
    "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateCategoryGroupDocument,
    "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateCategoryGroupDocument,
    "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteCategoryGroupDocument,
    "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateIngredientFormGroupDocument,
    "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateIngredientFormGroupDocument,
    "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteIngredientFormGroupDocument,
    "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateDeityTraditionDocument,
    "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateDeityTraditionDocument,
    "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n": typeof types.DeleteDeityTraditionDocument,
    "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateCategoryDocument,
    "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateCategoryDocument,
    "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n": typeof types.DeleteCategoryDocument,
    "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateIngredientFormValueDocument,
    "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateIngredientFormValueDocument,
    "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n": typeof types.DeleteIngredientFormValueDocument,
    "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.CreateDeityDocument,
    "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": typeof types.UpdateDeityDocument,
    "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n": typeof types.DeleteDeityDocument,
    "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n": typeof types.PickerCategoriesDocument,
    "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          slug\n        }\n      }\n    }\n  }\n": typeof types.PossibleDuplicatesDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.CreateWorkspaceIngredientDocument,
    "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.CreateCompendiumIngredientDocument,
    "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n  ) {\n    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.UpdateCompendiumIngredientDocument,
    "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n": typeof types.DeleteCompendiumIngredientDocument,
    "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n    }\n  }\n": typeof types.CreateReferenceDocument,
    "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n        }\n      }\n    }\n  }\n": typeof types.ReferenceSuggestionsDocument,
    "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": typeof types.CommonNameSuggestionsDocument,
    "\n  query PlanetSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    planetSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": typeof types.PlanetSuggestionsDocument,
    "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": typeof types.ZodiacSuggestionsDocument,
    "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          curated\n        }\n      }\n    }\n  }\n": typeof types.DeitySuggestionsDocument,
    "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n": typeof types.IngredientSuggestionsDocument,
    "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n": typeof types.CompendiumSubstitutesDocument,
    "\n  mutation CreatePlanet($input: PlanetInput!) {\n    createPlanet(input: $input) {\n      id\n    }\n  }\n": typeof types.CreatePlanetDocument,
    "\n  mutation UpdatePlanet($id: ID!, $input: PlanetInput!) {\n    updatePlanet(id: $id, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdatePlanetDocument,
    "\n  mutation DeletePlanet($id: ID!) {\n    deletePlanet(id: $id)\n  }\n": typeof types.DeletePlanetDocument,
    "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateZodiacSignDocument,
    "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n": typeof types.UpdateZodiacSignDocument,
    "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n": typeof types.DeleteZodiacSignDocument,
};
const documents: Documents = {
    "\n  mutation SetEmail($email: String!, $next: String) {\n    setEmail(email: $email, next: $next) {\n      id\n      email\n    }\n  }\n": types.SetEmailDocument,
    "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateCategoryGroupDocument,
    "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateCategoryGroupDocument,
    "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteCategoryGroupDocument,
    "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateIngredientFormGroupDocument,
    "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateIngredientFormGroupDocument,
    "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteIngredientFormGroupDocument,
    "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateDeityTraditionDocument,
    "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateDeityTraditionDocument,
    "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n": types.DeleteDeityTraditionDocument,
    "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateCategoryDocument,
    "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateCategoryDocument,
    "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n": types.DeleteCategoryDocument,
    "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateIngredientFormValueDocument,
    "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateIngredientFormValueDocument,
    "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n": types.DeleteIngredientFormValueDocument,
    "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n": types.CreateDeityDocument,
    "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n": types.UpdateDeityDocument,
    "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n": types.DeleteDeityDocument,
    "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n": types.PickerCategoriesDocument,
    "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          slug\n        }\n      }\n    }\n  }\n": types.PossibleDuplicatesDocument,
    "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n    }\n  }\n": types.CreateWorkspaceIngredientDocument,
    "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n": types.CreateCompendiumIngredientDocument,
    "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n  ) {\n    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n": types.UpdateCompendiumIngredientDocument,
    "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n": types.DeleteCompendiumIngredientDocument,
    "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n    }\n  }\n": types.CreateReferenceDocument,
    "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n        }\n      }\n    }\n  }\n": types.ReferenceSuggestionsDocument,
    "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.FormSuggestionsDocument,
    "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n": types.CommonNameSuggestionsDocument,
    "\n  query PlanetSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    planetSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": types.PlanetSuggestionsDocument,
    "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n": types.ZodiacSuggestionsDocument,
    "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          curated\n        }\n      }\n    }\n  }\n": types.DeitySuggestionsDocument,
    "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n": types.IngredientSuggestionsDocument,
    "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n": types.CompendiumSubstitutesDocument,
    "\n  mutation CreatePlanet($input: PlanetInput!) {\n    createPlanet(input: $input) {\n      id\n    }\n  }\n": types.CreatePlanetDocument,
    "\n  mutation UpdatePlanet($id: ID!, $input: PlanetInput!) {\n    updatePlanet(id: $id, input: $input) {\n      id\n    }\n  }\n": types.UpdatePlanetDocument,
    "\n  mutation DeletePlanet($id: ID!) {\n    deletePlanet(id: $id)\n  }\n": types.DeletePlanetDocument,
    "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n": types.CreateZodiacSignDocument,
    "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n": types.UpdateZodiacSignDocument,
    "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n": types.DeleteZodiacSignDocument,
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
export function graphql(source: "\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCategoryGroup($input: CategoryGroupInput!) {\n    createCategoryGroup(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {\n    updateCategoryGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n"): (typeof documents)["\n  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {\n    deleteCategoryGroup(id: $id, moveTo: $moveTo)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {\n    createIngredientFormGroup(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {\n    updateIngredientFormGroup(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n"): (typeof documents)["\n  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {\n    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateDeityTradition($input: DeityTraditionInput!) {\n    createDeityTradition(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {\n    updateDeityTradition(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n"): (typeof documents)["\n  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {\n    deleteDeityTradition(id: $id, moveTo: $moveTo)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCategory($input: CategoryInput!) {\n    createCategory(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {\n    updateCategory(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteCategory($id: ID!) {\n    deleteCategory(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {\n    createIngredientFormValue(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {\n    updateIngredientFormValue(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteIngredientFormValue($id: ID!) {\n    deleteIngredientFormValue(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateDeity($input: DeityInput!) {\n    createDeity(input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateDeity($id: ID!, $input: DeityInput!) {\n    updateDeity(id: $id, input: $input) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteDeity($id: ID!) {\n    deleteDeity(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query PickerCategories {\n    categories(first: 100) {\n      edges {\n        node {\n          id\n          name\n          description\n          group {\n            id\n            name\n            colorDark\n            colorLight\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          slug\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {\n    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          slug\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkspaceIngredient($workspaceId: ID!, $input: IngredientInput!) {\n    createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCompendiumIngredient($input: CompendiumIngredientInput!, $endRedirect: Boolean) {\n    createCompendiumIngredient(input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n  ) {\n    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCompendiumIngredient(\n    $id: ID!\n    $input: CompendiumIngredientUpdateInput!\n    $endRedirect: Boolean\n  ) {\n    updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteCompendiumIngredient($id: ID!) {\n    deleteCompendiumIngredient(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n    }\n  }\n"): (typeof documents)["\n  mutation CreateReference($workspaceId: ID, $input: ReferenceInput!) {\n    createReference(workspaceId: $workspaceId, input: $input) {\n      id\n      citation\n      isGlobal\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ReferenceSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    referenceSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          citation\n          isGlobal\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          group\n          curated\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          claimants {\n            name\n            canonicalName\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PlanetSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    planetSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query PlanetSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    planetSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {\n    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          value\n          description\n          curated\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          curated\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {\n    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          value\n          description\n          tradition\n          curated\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {\n    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query CompendiumSubstitutes($query: String, $first: Int) {\n    compendium(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          name\n          canonicalName\n          form\n          description\n          isGlobal\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreatePlanet($input: PlanetInput!) {\n    createPlanet(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreatePlanet($input: PlanetInput!) {\n    createPlanet(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePlanet($id: ID!, $input: PlanetInput!) {\n    updatePlanet(id: $id, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePlanet($id: ID!, $input: PlanetInput!) {\n    updatePlanet(id: $id, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePlanet($id: ID!) {\n    deletePlanet(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeletePlanet($id: ID!) {\n    deletePlanet(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateZodiacSign($input: ZodiacSignInput!) {\n    createZodiacSign(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {\n    updateZodiacSign(id: $id, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteZodiacSign($id: ID!) {\n    deleteZodiacSign(id: $id)\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;