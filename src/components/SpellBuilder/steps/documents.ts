import { graphql } from '../../../gql';

// The builder's GraphQL for its steps (M10.15): what a saved step carries back
// to the builder, spread into both save mutations, and the picker's lookup.

/**
 * A saved step as the builder opens it: what it lays and how much, the form's
 * icon, the categories it adds to the spell's derived ones, and the coven's
 * jar units, which a step's unit is checked against (story 77). The jar list
 * is the ingredient's for the coven named by the operation's `$workspaceId`.
 */
export const SpellBuilderStepFragment = graphql(`
  fragment SpellBuilderStep on SpellStep {
    id
    name
    form
    quantity
    unit
    note
    body
    ingredient {
      id
      categories {
        id
        name
      }
      stock(workspaceId: $workspaceId) {
        unit
        variant {
          id
        }
      }
    }
    variant {
      id
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
`);

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
 * A saved spell's steps, which the dialog reads once it opens on `?edit=<id>`:
 * the page's server read gives the fields alone (M10.12), and an update's
 * steps are the whole recipe, so the builder sends nothing until these land.
 */
export const SpellBuilderStepsDocument = graphql(`
  query SpellBuilderSteps($workspaceId: ID!, $id: ID!) {
    spell(workspaceId: $workspaceId, id: $id) {
      id
      steps {
        ...SpellBuilderStep
      }
    }
  }
`);
