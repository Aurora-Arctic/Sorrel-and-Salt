import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Notice from '../../../components/Notice';
import { NEW_COVEN_PATH } from '../../../lib/coven-path';
import { PendingLink } from '../../../lib/navigation';
import { requireSession } from '../../../lib/request-session';
import { ACCOUNT_INVITATIONS_PATH } from '../../../lib/sign-in';
import { viewerOf } from '../../../lib/viewer';

export const metadata: Metadata = {
  title: 'Your Coven — Sorrel & Salt',
};

// The post-sign-in landing (M2.8, MB.57): where a sign-in with no return path
// ends for someone in no coven, and where the brand and Your Coven point for
// them. Three states, one address. A member who opens it anyway (a bookmark,
// leaving a coven) goes into the first coven the switcher lists; sign-in and
// the shell's links send them there directly, skipping this redirect (MB.257). Someone with none who
// holds the right to create one is offered the create page (M9.16). Anyone
// else is told how to get in. An admin gets the same three, and with no coven
// holds the right by CHECK (MB.177), so sees the second. Nothing here creates
// a workspace; signing in never does. The right is read from the row through
// `viewerOf`, not the session, since accepting an invitation sets it
// mid-session.
//
// A non-member with coven invitations waiting for their verified address is
// told so, with a link to the account page's Invitations section, where they
// are listed and accepted (M10.32), so a lost or filtered mail does not block
// them. The count is the one the shell's account menu shows, read once per
// request by `viewerOf`. Nothing on the page sits on a card (the owner's
// call, M10.32). An eyebrow says "Welcome" and the heading says the next step,
// which differs by state (the owner's call, MB.119).
export default async function CovenLandingPage() {
  await requireSession();
  const { viewer, workspaces } = await viewerOf();

  const [first] = workspaces;
  if (first) redirect(`/coven/${first.slug}`);

  const pending = viewer.pendingInvitations;

  return (
    <main className="page-frame page-frame--narrow">
      <section className="page-frame__section" aria-labelledby="coven-landing-heading">
        <div className="header">
          <p className="eyebrow">Welcome</p>
          <h1 id="coven-landing-heading">{viewer.canCreate ? 'Start a Coven' : 'Join a Coven'}</h1>
          <p className="lede">
            {viewer.canCreate
              ? 'You are not in a coven yet, but you can start one of your own and invite others to it.'
              : 'Your account is ready. Sorrel & Salt is invite-only, so the next step is to join a coven.'}
          </p>
        </div>
        {pending > 0 && (
          <Notice kind="success" className="page-frame__notice">
            {pending === 1
              ? 'You have an invitation waiting. '
              : `You have ${pending} invitations waiting. `}
            <PendingLink
              href={ACCOUNT_INVITATIONS_PATH}
              navigationTarget={{ region: 'main', shape: 'page', frame: 'with-nav' }}
            >
              See your invitations
            </PendingLink>
          </Notice>
        )}
        {viewer.canCreate ? (
          <p>
            <PendingLink
              className="btn btn--solid"
              href={NEW_COVEN_PATH}
              navigationTarget={{ region: 'main', shape: 'form', frame: 'narrow' }}
            >
              Create Coven
            </PendingLink>
          </p>
        ) : pending > 0 ? (
          <p>
            Accept an invitation on your account page, or through the link in the email that came
            with it, then you go straight into that coven. Accepting one also lets you start a coven
            of your own.
          </p>
        ) : (
          <p>
            Ask someone who already uses Sorrel &amp; Salt to invite you. An invitation sent to the
            address on this account shows up on your account page, or you can open the link they
            email you instead. Once you accept, your coven opens here. If you would rather start a
            coven of your own, an admin must approve that.
          </p>
        )}
      </section>
    </main>
  );
}
