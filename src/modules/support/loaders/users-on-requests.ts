import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { UserRow } from '../../identity';
import { usersNamedOnRequests as batch } from '../services/reads';

/** The live account behind a sender, assignee, resolver or replier, null where none is live. */
export const usersOnRequests = defineSignedInLoader<string, UserRow | null>(batch);
