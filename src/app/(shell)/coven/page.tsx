import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import ReceivedInvitations from '../../../components/ReceivedInvitations';
import { NEW_COVEN_PATH } from '../../../lib/coven-path';
import { requireSession } from '../../../lib/request-session';
import { viewerOf } from '../../../lib/viewer';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import { countReceivedInvitations, listReceivedInvitations } from '@/modules/identity';
import type { CovenLandingPageProps } from './types';

export const metadata: Metadata = {
  title: 'Your Coven — Sorrel & Salt',
};

// One page of the invitations addressed to the signed-in account, keyed by
// the two cursor strings and read through the session, so a re-render of the
// same address reads the list once.
const receivedPage = cache(async (after: string | undefined, before: string | undefined) => {
  const session = await requireSession();
  return readNumberedPage(
    { after, before },
    (request) => listReceivedInvitations(session, request),
    (start) => countReceivedInvitations(session, start),
  );
});

// The post-sign-in landing (M2.8, MB.57): where a sign-in with no return path
// ends, and where the brand and Your Coven point. Three states, one address.
// A member goes into the first coven the switcher lists. Someone with none who
// holds the right to create one is offered the create page (M9.16). Anyone
// else is told how to get in. An admin gets the same three, and with no coven
// holds the right by CHECK (MB.177), so sees the second. Nothing here creates
// a workspace; signing in never does. The right is read from the row through
// `viewerOf`, not the session, since accepting an invitation sets it
// mid-session.
//
// A non-member also sees the coven invitations addressed to their verified
// address, above the create link or the invite-only copy (M10.32), so a lost
// or filtered mail does not block them. A member is redirected first and the
// invitation services are never called for them.
export default async function CovenLandingPage({ searchParams }: CovenLandingPageProps) {
  await requireSession();
  const { viewer, workspaces } = await viewerOf();

  const [first] = workspaces;
  if (first) redirect(`/coven/${first.slug}`);

  const { after, before } = readPageCursors(await searchParams);
  const page = await receivedPage(after, before);
  const href = (cursor: Record<string, string>) =>
    `/coven?${new URLSearchParams(cursor).toString()}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = page.pageInfo;

  return (
    <main className="page-frame page-frame--narrow">
      <div className="page-frame__section panel">
        <div className="header">
          <h1>Welcome</h1>
          <p className="lede">
            {viewer.canCreate
              ? 'You are not in a coven yet, but you can start one of your own and invite others to it.'
              : 'Your account is ready. Sorrel & Salt is invite-only, so the next step is to join a coven.'}
          </p>
        </div>
        {page.edges.length > 0 && (
          <>
            <h2>Your Invitations</h2>
            <ReceivedInvitations
              invitations={page.edges.map(({ node }) => node)}
              position={page.position}
              previousHref={
                hasPreviousPage && startCursor ? href({ before: startCursor }) : undefined
              }
              nextHref={hasNextPage && endCursor ? href({ after: endCursor }) : undefined}
            />
          </>
        )}
        {viewer.canCreate ? (
          <p>
            <Link className="btn btn--solid" href={NEW_COVEN_PATH}>
              Create Coven
            </Link>
          </p>
        ) : (
          <p>
            Ask someone who already uses Sorrel &amp; Salt to invite you. An invitation sent to the
            address on this account shows up on this page, and you can open the link they email you
            instead. Once you accept, your coven opens here. If you would rather start a coven of
            your own, an admin can approve that.
          </p>
        )}
      </div>
    </main>
  );
}
