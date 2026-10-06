import { defineLoader } from '../../../graphql/loaders/define-loader';
import { Forbidden } from '../../../lib/errors';
import { providersOf } from '../services/user-list';

/** `User.providers`, batched: the providers linked to each user id loaded in one request. */
export const providersByUser = defineLoader<string, string[]>(async (session, userIds) =>
  session ? providersOf(session, userIds) : userIds.map(() => new Forbidden()),
);
