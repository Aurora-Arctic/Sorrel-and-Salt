import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { holdsPasskey } from '../services/user-list';

export const passkeyHeldByUser = defineSignedInLoader<string, boolean>(holdsPasskey);
