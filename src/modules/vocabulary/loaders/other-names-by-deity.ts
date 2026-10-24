import { definePublicLoader } from '../../../graphql/loaders/define-loader';
import { deityOtherNamesOf } from '../services/deities';

/**
 * `Deity.otherNames`, batched: the live other names of every deity loaded in
 * one request (M14.23). Answered for anyone, as the deity is: public
 * reference data, read by a service that takes no session.
 */
export const otherNamesByDeity = definePublicLoader<string, string[]>(deityOtherNamesOf);
