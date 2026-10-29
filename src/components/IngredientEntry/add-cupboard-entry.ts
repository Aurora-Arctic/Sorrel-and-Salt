import { graphql } from '../../gql';

// The one add-to-the-cupboard mutation sent with no form: the plus, on a compendium card, the entry
// pages and Quick Look. The form that takes a quantity sends its own (AddCupboardEntryFromForm).
export const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      id
    }
  }
`);
