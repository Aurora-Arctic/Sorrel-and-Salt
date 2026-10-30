import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import { totalCardAttempts } from '../services/invitation-cards';

/** A card's refused opens added up, batched across a page of cards: 0 for a card never refused. An admin's; any other viewer's load is refused. */
export const cardAttemptTotals = defineSignedInLoader<string, number>(async (session, ids) => {
  const totals = new Map(
    (await totalCardAttempts(session, ids)).map((t) => [t.invitationId, t.total]),
  );
  return ids.map((id) => totals.get(id) ?? 0);
});
