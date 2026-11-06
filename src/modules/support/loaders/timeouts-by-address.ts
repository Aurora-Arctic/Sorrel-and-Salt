import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { timeoutsForAddresses as batch } from '../services/reads';
import type { SupportTimeoutRow } from '../types';

/** The time-outs on a signed-out sender's address (loaded by the email), newest first. A site admin's alone. */
export const timeoutsByAddress = defineSignedInLoader<string, SupportTimeoutRow[]>(batch);
