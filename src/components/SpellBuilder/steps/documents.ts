import { graphql } from '../../../gql';

// The builder's GraphQL for its steps (M10.15): the picker's lookup, and the
// saved steps' read. A saved step's selection is written out in full here and in
// both save mutations (../index.tsx) rather than shared as a fragment: graphql-armor
// counts a fragment spread as a level (`flattenFragments` is off), and through a
// spread the jar's `stock { variant { id } }` and the form's `formChoice { group
// { icon } }` are 8 deep, past DESIGN.md §7's 7. Written out, they are 6. The
// three copies cannot drift apart unseen: each answer is typed as
// `SpellBuilderStep` (../types.ts) where the builder reads it, and
// tests/guards/document-depth.test.ts holds every document to the limit.

/**
 * The picker's lookup: the coven's ingredients and the compendium's, each
 * with its forms and what a step of each would need, so a pick needs no
 * second request.
 */
export const SpellIngredientSuggestionsDocument = graphql(`
  query SpellIngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {
    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
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
 * A saved spell's steps, each as the builder opens it: what it lays and how much,
 * the form's icon, the categories it adds to the spell's derived ones, and the
 * coven's jar units, which a step's unit is checked against (story 77), the jar
 * list being the ingredient's for the coven `$workspaceId` names. The dialog
 * reads them once it opens on `?edit=<id>`: the dialog reads once it opens on `?edit=<id>`:
 * the page's server read gives the fields alone (M10.12), and an update's
 * steps are the whole recipe, so the builder sends nothing until these land.
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
