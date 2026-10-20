import { graphql } from '../../gql';

// The one add-to-the-cupboard mutation the browser sends with no form: the plus (AddIcon,
// M9.12), on a compendium card, the entry pages and the Quick Look window alike. The form that takes a quantity sends its own (AddCupboardEntryFromForm).
export const AddCupboardEntryDocument = graphql(`
  mutation AddCupboardEntry($workspaceId: ID!, $ingredientId: ID!) {
    addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId) {
      id
    }
  }
`);
