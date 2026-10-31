'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { inUtc } from '../../lib/utc';
import StackTable from '../DataTable';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import { batchName } from './batches';
import DownloadCsv from './download-csv';
import type { AdminArrivalsProps } from './types';
import './index.scss';

// The People page's Card Sign-Ups tab, `/admin/card-sign-ups`: every account that accepted a card, with the date, the
// batch and the covens it owns, and a CSV of them (claude-docs/components/admin-cards.md).

const ArrivalsCsvDocument = graphql(`
  query CardArrivalsCsv {
    cardArrivalsCsv
  }
`);

export const readArrivalsCsv = async (): Promise<string> =>
  (await graphqlRequest(ArrivalsCsvDocument)).cardArrivalsCsv;

const AdminArrivals = ({
  arrivals,
  previousHref,
  nextHref,
  position,
}: AdminArrivalsProps): ReactElement => (
  <section className="admin-cards" aria-label="Card Sign-Ups">
    <ListFrame>
      <ListBody>
        <StackTable
          columns={[
            {
              heading: 'Account',
              cell: (arrival) => (
                <>
                  {arrival.accountName}
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
          empty="No one has accepted a card yet."
          className="data-table--nowrap"
        />
        <Pager previousHref={previousHref} nextHref={nextHref} position={position} />
      </ListBody>
    </ListFrame>
  </section>
);

export const ArrivalsActions = (): ReactElement => <DownloadCsv read={readArrivalsCsv} />;

export default AdminArrivals;
