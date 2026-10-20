import { graphql } from '../../gql';

// The one add-to-the-cupboard mutation the browser sends with no form: the entry page's
// Add to Cupboard and a compendium card's add icon (M9.12) share it, so the document is
// written once. The form that takes a quantity sends its own (AddCupboardEntryFromForm).
export const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      id
    }
  }
`);
