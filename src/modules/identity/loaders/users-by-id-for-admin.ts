import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { usersForAdmin } from '../services/privilege-changes';
import type { UserRow } from '../types';

export const usersByIdForAdmin = defineSignedInLoader<string, UserRow | null>(usersForAdmin);
