import { ArrivalsActions } from '../../../../../../components/AdminCards/arrivals';
import { readArrivalsFilter } from '../../../../../../components/AdminCards/filter-params';
import { requireAdminSession } from '../../../../../../lib/request-session';
import type { ArrivalsPageProps } from '../../invitation-cards/types';

// Download CSV, beside the page's heading while Card Sign-Ups is open: it carries the list's filter.
export default async function ArrivalsAction({ searchParams }: ArrivalsPageProps) {
  await requireAdminSession();
  return <ArrivalsActions filter={readArrivalsFilter(await searchParams)} />;
}
