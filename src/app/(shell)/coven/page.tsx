import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NEW_COVEN_PATH } from '../../../lib/coven-path';
import { requireSession } from '../../../lib/request-session';
import { viewerOf } from '../../../lib/viewer';

export const metadata: Metadata = {
  title: 'Your Coven — Sorrel & Salt',
};

// The post-sign-in landing (M2.8, MB.57): where a sign-in with no return path
// ends, and where the brand and Your Coven point. Three states, one address.
// A member goes into the first coven the switcher lists. Someone with none who
// holds the right to create one is offered the create page (M9.16). Anyone
// else is told how to get in. An admin gets the same three, and with no coven
// holds the right by CHECK (MB.177), so sees the second. Nothing here creates
// a workspace; signing in never does. The right is read from the row through
// `viewerOf`, not the session, since accepting an invitation sets it
// mid-session.
export default async function CovenLandingPage() {
  await requireSession();
  const { viewer, workspaces } = await viewerOf();

  const [first] = workspaces;
  if (first) redirect(`/coven/${first.slug}`);

  return (
    <main className="page-frame page-frame--narrow">
      <div className="page-frame__section panel">
        {viewer.canCreate ? (
          <>
            <div className="header">
              <h1>Welcome</h1>
              <p className="lede">
                You are not in a coven yet, but you can start one of your own and invite others to
                it.
              </p>
            </div>
            <p>
              <Link className="btn btn--solid" href={NEW_COVEN_PATH}>
                Create Coven
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="header">
              <h1>Welcome</h1>
              <p className="lede">
                Your account is ready. Sorrel &amp; Salt is invite-only, so the next step is to join
                a coven.
              </p>
            </div>
            <p>
              Ask someone who already uses Sorrel &amp; Salt to invite you, and open the link they
              send to the address on this account. Once you accept, your coven opens here. If you
              would rather start a coven of your own, an admin can approve that.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
