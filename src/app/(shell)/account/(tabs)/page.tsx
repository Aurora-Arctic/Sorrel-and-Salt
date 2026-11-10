import type { Metadata, Route } from 'next';
import { ACCOUNT_NAV } from './nav';
import { pageTitle } from '@/lib/page-metadata';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import {
  countReceivedInvitations,
  getMe,
  isPlaceholderEmail,
  listReceivedInvitations,
  verificationWaitSeconds,
} from '@/modules/identity';
import EmailForm from '@/components/EmailForm';
import NameForm from '@/components/NameForm';
import PageNav from '@/components/PageNav';
import ReceivedInvitations from '@/components/ReceivedInvitations';
import { requireSession } from '@/lib/request-session';
import { ACCOUNT_INVITATIONS_ID, ACCOUNT_PATH } from '@/lib/sign-in';
import { signedInLanding } from '@/lib/landing';
import type { AccountPageProps } from './types';
import PageWithNav from '@/components/PageWithNav';
import PanelSection from '@/components/PanelSection';

export const metadata: Metadata = pageTitle('Your Account');

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const { after, before } = readPageCursors(params);
  const [me, landing, invitations] = await Promise.all([
    getMe(session),
    signedInLanding(session),
    readNumberedPage(
      { after, before },
      (request) => listReceivedInvitations(session, request),
      (start) => countReceivedInvitations(session, start),
    ),
  ]);
  const invitationsHref = (cursor: Record<string, string>) =>
    `${ACCOUNT_PATH}?${new URLSearchParams(cursor).toString()}#${ACCOUNT_INVITATIONS_ID}` as Route;
  const { hasPreviousPage, hasNextPage, startCursor, endCursor } = invitations.pageInfo;

  return (
    <PageWithNav as="div" headless>
      <PageNav label="On This Page" entries={ACCOUNT_NAV} />
      <PanelSection id="account-name" title="Name" lede="The name Sorrel & Salt shows for you.">
        <NameForm name={me.name} />
      </PanelSection>
      <PanelSection id="account-email" title="Email">
        {/* No lede here: the form's own status line says what the section
            is for, and changes with the address's state. */}
        <EmailForm
          embedded
          // A placeholder is the row's way of having no address; the form
          // never shows one (claude-docs/components/email-form.md).
          email={isPlaceholderEmail(me.email) ? '' : me.email}
          verified={me.emailVerified}
          landing={landing}
          waitSeconds={verificationWaitSeconds(me.verificationSentAt)}
        />
      </PanelSection>
      <PanelSection
        id={ACCOUNT_INVITATIONS_ID}
        title="Invitations"
        lede="Covens that have invited this email address to join them."
      >
        {/* The list is drawn even with no rows, so its own empty line is
            live: the section is always on the page. */}
        <ReceivedInvitations
          invitations={invitations.edges.map(({ node }) => node)}
          position={invitations.position}
          previousHref={
            hasPreviousPage && startCursor ? invitationsHref({ before: startCursor }) : undefined
          }
          nextHref={hasNextPage && endCursor ? invitationsHref({ after: endCursor }) : undefined}
        />
      </PanelSection>
    </PageWithNav>
  );
}
