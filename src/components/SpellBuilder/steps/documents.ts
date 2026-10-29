import { graphql } from '../../../gql';

// The steps' GraphQL, with the saved step's selection written out in full, not a fragment, to stay within DESIGN.md §7's depth of 7
// (claude-docs/components/spell-builder.md, "Notes from code comments: step documents").

/**
 * The picker's lookup: the coven's ingredients and the compendium's, each
 * with its forms and what a step of each would need, so a pick needs no
 * second request.
 */
export const SpellIngredientSuggestionsDocument = graphql(`
  query SpellIngredientSuggestions(
    $workspaceId: ID!
    $query: String
    $first: Int
    $categoryIds: [ID!]
  ) {
    ingredientSuggestions(
      workspaceId: $workspaceId
      query: $query
      first: $first
      categoryIds: $categoryIds
    ) {
      edges {
        group
        node {
          id
          name
          canonicalName
          retired
          toxic
          safetyNotes
          cupboardEntry(workspaceId: $workspaceId) {
            label
          }
          categories {
            id
            name
          }
          variants {
            id
            form
            toxic
            safetyNotes
            categories {
              id
              name
            }
            formChoice {
              group {
                icon
              }
            }
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
      }
    }
  }
`);

/**
 * A saved spell's steps as the builder opens it, read once the dialog opens on `?edit=<id>`, since the page's server read gives the fields alone
 * and an update's steps are the whole recipe; the jar units are the ingredient's for the coven `$workspaceId`.
 * (claude-docs/components/spell-builder.md, "Notes from code comments: the saved steps read").
 */
export const SpellBuilderStepsDocument = graphql(`
  query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {
    spell(workspaceId: $workspaceId, id: $id) {
      id
      steps {
        id
        name
        form
        quantity
        unit
        body
        ingredient {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
        variant {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
      }
    }
  }
`);
