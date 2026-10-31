'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { noMatchText } from '../../lib/text';
import { inUtc } from '../../lib/utc';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { batchName } from './batches';
import UserLink from '../UserList/user-link';
import ArrivalsFilterForm from './arrivals-filter';
import DownloadCsv from './download-csv';
import { NO_ARRIVALS_FILTER } from './href';
import type { AdminArrivalsProps, ArrivalsActionsProps, ArrivalsFilter } from './types';
import './index.scss';

// The People page's Card Sign-Ups tab, `/admin/card-sign-ups`: every account that accepted a card, with the date, the
// batch and the covens it owns, and a CSV of them (claude-docs/components/admin-cards.md).

const ArrivalsCsvDocument = graphql(`
  query CardArrivalsCsv($query: String, $batch: String) {
    cardArrivalsCsv(query: $query, batch: $batch)
  }
`);

/** The CSV of the arrivals the filter shows: the same query and batch the list holds. */
export const readArrivalsCsv = async (
  filter: ArrivalsFilter = NO_ARRIVALS_FILTER,
): Promise<string> =>
  (
    await graphqlRequest(ArrivalsCsvDocument, {
      query: filter.query || undefined,
      batch: filter.batch || undefined,
    })
  ).cardArrivalsCsv;

/** The empty list, naming the filters in use so an admin sees what to change. */
function emptyText({ query, batch }: ArrivalsFilter): string {
  const filters = [query && `“${query}”`, batch && `batch “${batch}”`].filter(
    (part): part is string => Boolean(part),
  );
  return noMatchText('sign-ups', filters, 'No one has accepted a card yet.');
}

const AdminArrivals = ({
  arrivals,
  previousHref,
  nextHref,
  position,
  filter = NO_ARRIVALS_FILTER,
}: AdminArrivalsProps): ReactElement => (
  <section className="admin-cards" aria-label="Card Sign-Ups">
    <ListFrame>
      {/* Keyed by the filter shown, so another one starts the form again from it. */}
      <ArrivalsFilterForm key={JSON.stringify(filter)} filter={filter} />
      <ListBody>
        <StackTable
          columns={[
            {
              heading: 'Account',
              cell: (arrival) => (
                <>
                  {arrival.account ? (
                    <UserLink
                      href={arrival.account.openHref}
                      heading={arrival.account.heading}
                      name={arrival.accountName}
                    />
                  ) : (
                    arrival.accountName
                  )}
                  {arrival.accountEmail && (
                    <>
                      <br />
                      <span className="admin-cards__none">{arrival.accountEmail}</span>
                    </>
                  )}
                </>
              ),
            },
            {
              heading: 'Accepted On',
              cell: (arrival) => (
                <time dateTime={arrival.acceptedAt.toISOString()}>{inUtc(arrival.acceptedAt)}</time>
              ),
            },
            { heading: 'Batch', cell: (arrival) => batchName(arrival.batchId) },
            {
              heading: 'Covens Owned',
              cell: (arrival) =>
                arrival.covens.length > 0 ? (
                  arrival.covens.join(', ')
                ) : (
                  <span className="admin-cards__none">None yet</span>
                ),
            },
          ]}
          rows={arrivals}
          rowKey={(arrival) => arrival.id}
          empty={emptyText(filter)}
          className="data-table--nowrap"
        />
        <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
      </ListBody>
    </ListFrame>
  </section>
);

export const ArrivalsActions = ({ filter }: ArrivalsActionsProps): ReactElement => (
  <DownloadCsv read={() => readArrivalsCsv(filter)} />
);

export default AdminArrivals;
