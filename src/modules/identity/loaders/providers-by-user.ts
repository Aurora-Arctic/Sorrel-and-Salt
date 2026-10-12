import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { providersOf } from '../services/user-list';

/** `User.providers`, batched: the providers linked to each user id loaded in one request. */
export const providersByUser = defineSignedInLoader<string, string[]>(providersOf);
