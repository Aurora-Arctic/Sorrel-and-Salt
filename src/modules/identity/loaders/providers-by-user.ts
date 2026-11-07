import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { providersOf } from '../services/user-list';

export const providersByUser = defineSignedInLoader<string, string[]>(providersOf);
