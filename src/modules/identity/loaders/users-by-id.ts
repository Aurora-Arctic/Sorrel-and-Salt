import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { displayNamesOf } from '../services/display-names';

/**
 * A user's display name, batched, null for anyone the viewer has never shared a coven with. Beside `usersByIdForAdmin`,
 * not in place of it: that one is an admin's, reads the whole row, and is null for a deleted user.
 */
export const usersById = defineSignedInLoader<string, string | null>(displayNamesOf);
