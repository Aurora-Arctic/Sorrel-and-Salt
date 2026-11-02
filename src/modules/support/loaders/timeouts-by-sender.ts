import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { timeoutsForSenders as batch } from '../services/reads';
import type { SupportTimeoutRow } from '../types';

/** A sender's time-outs, newest first. A site admin's alone: every slot of anyone else's load is refused. */
export const timeoutsBySender = defineSignedInLoader<string, SupportTimeoutRow[]>(batch);
