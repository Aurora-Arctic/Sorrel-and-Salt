import { definePublicLoader } from '../../../graphql/loaders/define-loader';
import { deityOtherNamesOf } from '../services/deities';

export const otherNamesByDeity = definePublicLoader<string, string[]>(deityOtherNamesOf);
