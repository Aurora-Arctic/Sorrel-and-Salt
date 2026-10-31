import { MintCards } from '../../../../../../components/AdminCards';
import { readCardsFilter } from '../../../../../../components/AdminCards/filter-params';
import { requireAdminSession } from '../../../../../../lib/request-session';
import { readListPlace } from '../../../list-page';
import type { CardsPageProps } from '../../invitation-cards/types';

// Mint Cards, beside the page's heading while Invitation Cards is open: a link to the tab's `?mint`, keeping its filter and page.
export default async function CardsAction({ searchParams }: CardsPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readListPlace(params);
  return <MintCards cursor={{ after, before }} filter={readCardsFilter(params)} />;
}
