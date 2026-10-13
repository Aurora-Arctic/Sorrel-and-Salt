import type { Story } from '@ladle/react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import ActionFailure from '../src/components/ActionFailure';
import DeleteWorkspaceButton from '../src/components/DeleteWorkspaceButton';
import LeaveWorkspaceButton from '../src/components/LeaveWorkspaceButton';
import { WORKSPACE_ROLE_ACCESS } from '../src/components/MemberList/role-access';
import Notice from '../src/components/Notice';
import { ShellFrame } from './shell-frame';

// The coven's pages as MB.119 proposes them (claude-docs/design-decisions/mb.119-plan.md),
// each inside the shell as the layouts draw it, so a review sees the page and
// not only the piece. Proposals, not the app: the running pages keep what they
// have until the owner signs one off, and the losing stories are deleted then.
// Each draws the markup of the page it proposes for, with fixture props,
// because the pages are server components that read the session. Every story
// has a PhoneDark and a PhoneLight sibling, and follows the toolbar's theme
// otherwise. The names are invented (M1.25).
export default {
  title: 'Coven / Pages',
};

const COVEN = 'Fixture Coven';
const ID = '00000000-0000-0000-0000-000000000001';

// The landing: where someone in no coven lands (M2.8, M10.32). The copy is
// M10.32's and is not reworded here; what differs between the two designs is
// the head. As built it says "Welcome" whatever the state; named, an eyebrow
// says "Welcome" and the heading says what the next step is.
const Landing = ({
  named,
  canCreate,
  pending,
}: {
  named: boolean;
  canCreate: boolean;
  pending: number;
}): ReactElement => (
  <ShellFrame
    area="none"
    open="/coven"
    workspaces={[]}
    viewer={{ canCreate, pendingInvitations: pending }}
  >
    <main className="page-frame page-frame--narrow">
      <section className="page-frame__section" aria-labelledby="coven-landing-heading">
        <div className="header">
          {named && <p className="eyebrow">Welcome</p>}
          <h1 id="coven-landing-heading">
            {named ? (canCreate ? 'Start a Coven' : 'Join a Coven') : 'Welcome'}
          </h1>
          <p className="lede">
            {canCreate
              ? 'You are not in a coven yet, but you can start one of your own and invite others to it.'
              : 'Your account is ready. Sorrel & Salt is invite-only, so the next step is to join a coven.'}
          </p>
        </div>
        {pending > 0 && (
          <Notice kind="success" className="page-frame__notice">
            {pending === 1
              ? 'You have an invitation waiting. '
              : `You have ${pending} invitations waiting. `}
            <Link href="/account#account-invitations">See your invitations</Link>
          </Notice>
        )}
        {canCreate ? (
          <p>
            <Link className="btn btn--solid" href="/coven/new">
              Create Coven
            </Link>
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
  </ShellFrame>
);

// The coven index, `/coven/[slug]`: the open coven's page. Every proposal
// shares the shell, the owner's buttons and the one place a refusal is said.
const ROLES = { owner: 'an owner', member: 'a member', viewer: 'a viewer' } as const;
type Role = keyof typeof ROLES;

const Frame = ({ children }: { children: ReactElement }): ReactElement => (
  <ShellFrame area="coven" open="/coven/fixture-coven">
    {children}
  </ShellFrame>
);

/** Leave, and for an owner Delete beside it, in the one place that says a refusal. */
const Buttons = ({ withDelete }: { withDelete: boolean }): ReactElement => (
  <ActionFailure>
    <div className="form__actions">
      <LeaveWorkspaceButton workspaceId={ID} name={COVEN} />
      {withDelete && <DeleteWorkspaceButton workspaceId={ID} name={COVEN} />}
    </div>
  </ActionFailure>
);

// As built (`[slug]/page.tsx`): a bare heading, then one "Your Membership"
// section with Leave beside Delete.
const IndexAsBuilt = ({ held }: { held: Role }): ReactElement => (
  <Frame>
    <main>
      <h1>{COVEN}</h1>
      <section className="page-frame__section" aria-labelledby="coven-membership">
        <h2 id="coven-membership">Your Membership</h2>
        <Buttons withDelete={held === 'owner'} />
      </section>
    </main>
  </Frame>
);

// A head as the admin pages and the landing draw one: an eyebrow, the
// heading, and a lede that tells this person what their role lets them do.
const RoleHead = ({ held }: { held: Role }): ReactElement => (
  <div className="header">
    <p className="eyebrow">Coven</p>
    <h1>{COVEN}</h1>
    <p className="lede">
      You are {ROLES[held]} of this coven. {WORKSPACE_ROLE_ACCESS[held]}
    </p>
  </div>
);

// Role: the head above, then Your Membership as built.
const IndexRole = ({ held }: { held: Role }): ReactElement => (
  <Frame>
    <main>
      <RoleHead held={held} />
      <section className="page-frame__section" aria-labelledby="coven-membership">
        <h2 id="coven-membership">Your Membership</h2>
        <Buttons withDelete={held === 'owner'} />
      </section>
    </main>
  </Frame>
);

// OwnerSection (recommended): Role, but Delete leaves the membership row for a
// section of its own that only an owner is shown, so the two buttons that end
// a membership and end a coven are no longer side by side.
const IndexOwnerSection = ({ held }: { held: Role }): ReactElement => (
  <Frame>
    <main>
      <RoleHead held={held} />
      <ActionFailure>
        <section className="page-frame__section" aria-labelledby="coven-membership">
          <h2 id="coven-membership">Your Membership</h2>
          <div className="form__actions">
            <LeaveWorkspaceButton workspaceId={ID} name={COVEN} />
          </div>
        </section>
        {held === 'owner' && (
          <section className="page-frame__section" aria-labelledby="coven-delete">
            <h2 id="coven-delete">Delete This Coven</h2>
            <p>Closes its ingredients and its grimoire to every member, other owners included.</p>
            <div className="form__actions">
              <DeleteWorkspaceButton workspaceId={ID} name={COVEN} />
            </div>
          </section>
        )}
      </ActionFailure>
    </main>
  </Frame>
);

// Contents: the admin index's shape (a lede, then titled lists of the pages,
// each with a line saying what it is for), thin until Ingredients and
// Grimoire exist (MB.121), with Your Membership beneath.
const IndexContents = ({ held }: { held: Role }): ReactElement => (
  <Frame>
    <main>
      <h1>{COVEN}</h1>
      <p className="lede">
        Here you keep this coven&rsquo;s ingredients and grimoire, and see who is in it. Pick a page
        below, or from the links at the top of any coven page.
      </p>
      <div className="admin-contents">
        <section className="page-frame__section" aria-labelledby="coven-contents-people">
          <h2 id="coven-contents-people">People</h2>
          <ul className="admin-contents__list">
            <li>
              <Link href="/coven/fixture-coven/members" aria-describedby="coven-contents-members">
                Members
              </Link>
              <span id="coven-contents-members" className="admin-contents__description">
                Who is in the coven, what each may do, and the invitations still waiting.
              </span>
            </li>
          </ul>
        </section>
        <section className="page-frame__section" aria-labelledby="coven-membership">
          <h2 id="coven-membership">Your Membership</h2>
          <Buttons withDelete={held === 'owner'} />
        </section>
      </div>
    </main>
  </Frame>
);

// As built: "Welcome" in every state.
// can create, nothing waiting.
export const ProposalLandingAsBuilt: Story = () => (
  <Landing named={false} canCreate={true} pending={0} />
);

export const ProposalLandingAsBuiltPhoneDark: Story = () => (
  <Landing named={false} canCreate={true} pending={0} />
);
ProposalLandingAsBuiltPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingAsBuiltPhoneLight: Story = () => (
  <Landing named={false} canCreate={true} pending={0} />
);
ProposalLandingAsBuiltPhoneLight.meta = { theme: 'light', width: 375 };
// can create, invitations waiting.
export const ProposalLandingAsBuiltWaiting: Story = () => (
  <Landing named={false} canCreate={true} pending={2} />
);

export const ProposalLandingAsBuiltWaitingPhoneDark: Story = () => (
  <Landing named={false} canCreate={true} pending={2} />
);
ProposalLandingAsBuiltWaitingPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingAsBuiltWaitingPhoneLight: Story = () => (
  <Landing named={false} canCreate={true} pending={2} />
);
ProposalLandingAsBuiltWaitingPhoneLight.meta = { theme: 'light', width: 375 };
// cannot create, nothing waiting.
export const ProposalLandingAsBuiltInviteOnly: Story = () => (
  <Landing named={false} canCreate={false} pending={0} />
);

export const ProposalLandingAsBuiltInviteOnlyPhoneDark: Story = () => (
  <Landing named={false} canCreate={false} pending={0} />
);
ProposalLandingAsBuiltInviteOnlyPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingAsBuiltInviteOnlyPhoneLight: Story = () => (
  <Landing named={false} canCreate={false} pending={0} />
);
ProposalLandingAsBuiltInviteOnlyPhoneLight.meta = { theme: 'light', width: 375 };
// cannot create, invitations waiting.
export const ProposalLandingAsBuiltInviteOnlyWaiting: Story = () => (
  <Landing named={false} canCreate={false} pending={1} />
);

export const ProposalLandingAsBuiltInviteOnlyWaitingPhoneDark: Story = () => (
  <Landing named={false} canCreate={false} pending={1} />
);
ProposalLandingAsBuiltInviteOnlyWaitingPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingAsBuiltInviteOnlyWaitingPhoneLight: Story = () => (
  <Landing named={false} canCreate={false} pending={1} />
);
ProposalLandingAsBuiltInviteOnlyWaitingPhoneLight.meta = { theme: 'light', width: 375 };

// Named (recommended): an eyebrow "Welcome", the heading says the next step.
// can create, nothing waiting.
export const ProposalLandingNamed: Story = () => (
  <Landing named={true} canCreate={true} pending={0} />
);

export const ProposalLandingNamedPhoneDark: Story = () => (
  <Landing named={true} canCreate={true} pending={0} />
);
ProposalLandingNamedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingNamedPhoneLight: Story = () => (
  <Landing named={true} canCreate={true} pending={0} />
);
ProposalLandingNamedPhoneLight.meta = { theme: 'light', width: 375 };
// can create, invitations waiting.
export const ProposalLandingNamedWaiting: Story = () => (
  <Landing named={true} canCreate={true} pending={2} />
);

export const ProposalLandingNamedWaitingPhoneDark: Story = () => (
  <Landing named={true} canCreate={true} pending={2} />
);
ProposalLandingNamedWaitingPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingNamedWaitingPhoneLight: Story = () => (
  <Landing named={true} canCreate={true} pending={2} />
);
ProposalLandingNamedWaitingPhoneLight.meta = { theme: 'light', width: 375 };
// cannot create, nothing waiting.
export const ProposalLandingNamedInviteOnly: Story = () => (
  <Landing named={true} canCreate={false} pending={0} />
);

export const ProposalLandingNamedInviteOnlyPhoneDark: Story = () => (
  <Landing named={true} canCreate={false} pending={0} />
);
ProposalLandingNamedInviteOnlyPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingNamedInviteOnlyPhoneLight: Story = () => (
  <Landing named={true} canCreate={false} pending={0} />
);
ProposalLandingNamedInviteOnlyPhoneLight.meta = { theme: 'light', width: 375 };
// cannot create, invitations waiting.
export const ProposalLandingNamedInviteOnlyWaiting: Story = () => (
  <Landing named={true} canCreate={false} pending={1} />
);

export const ProposalLandingNamedInviteOnlyWaitingPhoneDark: Story = () => (
  <Landing named={true} canCreate={false} pending={1} />
);
ProposalLandingNamedInviteOnlyWaitingPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalLandingNamedInviteOnlyWaitingPhoneLight: Story = () => (
  <Landing named={true} canCreate={false} pending={1} />
);
ProposalLandingNamedInviteOnlyWaitingPhoneLight.meta = { theme: 'light', width: 375 };

// The index, an owner's and a member's view of each proposal.

// As built.
export const ProposalIndexAsBuilt: Story = () => <IndexAsBuilt held="owner" />;

export const ProposalIndexAsBuiltPhoneDark: Story = () => <IndexAsBuilt held="owner" />;
ProposalIndexAsBuiltPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalIndexAsBuiltPhoneLight: Story = () => <IndexAsBuilt held="owner" />;
ProposalIndexAsBuiltPhoneLight.meta = { theme: 'light', width: 375 };

// Role: eyebrow, heading, and what the role may do.
export const ProposalIndexRole: Story = () => <IndexRole held="owner" />;

export const ProposalIndexRolePhoneDark: Story = () => <IndexRole held="owner" />;
ProposalIndexRolePhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalIndexRolePhoneLight: Story = () => <IndexRole held="owner" />;
ProposalIndexRolePhoneLight.meta = { theme: 'light', width: 375 };

// OwnerSection (recommended): Delete in its own owners-only section.
export const ProposalIndexOwnerSection: Story = () => <IndexOwnerSection held="owner" />;

export const ProposalIndexOwnerSectionPhoneDark: Story = () => <IndexOwnerSection held="owner" />;
ProposalIndexOwnerSectionPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalIndexOwnerSectionPhoneLight: Story = () => <IndexOwnerSection held="owner" />;
ProposalIndexOwnerSectionPhoneLight.meta = { theme: 'light', width: 375 };

// OwnerSection as a member sees it: no Delete section.
export const ProposalIndexOwnerSectionMember: Story = () => <IndexOwnerSection held="member" />;

export const ProposalIndexOwnerSectionMemberPhoneDark: Story = () => (
  <IndexOwnerSection held="member" />
);
ProposalIndexOwnerSectionMemberPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalIndexOwnerSectionMemberPhoneLight: Story = () => (
  <IndexOwnerSection held="member" />
);
ProposalIndexOwnerSectionMemberPhoneLight.meta = { theme: 'light', width: 375 };

// Contents: the admin index's shape.
export const ProposalIndexContents: Story = () => <IndexContents held="owner" />;

export const ProposalIndexContentsPhoneDark: Story = () => <IndexContents held="owner" />;
ProposalIndexContentsPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalIndexContentsPhoneLight: Story = () => <IndexContents held="owner" />;
ProposalIndexContentsPhoneLight.meta = { theme: 'light', width: 375 };
