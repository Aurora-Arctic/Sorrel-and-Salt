import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { repliesForRequests as batch } from '../services/reads';
import type { SupportReplyRow } from '../types';

/** The replies to a request, oldest first; none for a request the viewer may not read. */
export const repliesByRequest = defineSignedInLoader<string, SupportReplyRow[]>(batch);
