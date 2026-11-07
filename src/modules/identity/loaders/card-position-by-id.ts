import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { cardPositions } from '../services/invitation-cards';

/** A keeper's; any other viewer's load is refused. */
export const cardPositionById = defineSignedInLoader<string, number | null>(
  async (session, ids) => {
    const found = new Map((await cardPositions(session, ids)).map((c) => [c.id, c.position]));
    return ids.map((id) => found.get(id) ?? null);
  },
);
