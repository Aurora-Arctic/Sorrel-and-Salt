import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { usersForAdmin } from '../services/privilege-changes';
import type { UserRow } from '../types';

/**
 * `PrivilegeChange.subject` and `.actor`, batched: every user a page of the
 * ledger names, in one read whichever field asked. Null for an id no live
 * user holds.
 */
export const usersByIdForAdmin = defineSignedInLoader<string, UserRow | null>(usersForAdmin);
