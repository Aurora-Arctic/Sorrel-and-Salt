import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { SupportSenderTier } from '../services/lifecycle';
import { tiersForSenders as batch } from '../services/reads';

/** A sender's tier, derived from the invitation they accepted. Staff's alone: every slot of anyone else's load is refused. */
export const tierBySender = defineSignedInLoader<string, SupportSenderTier>(batch);
