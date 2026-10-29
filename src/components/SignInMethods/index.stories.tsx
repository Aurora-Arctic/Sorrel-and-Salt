import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { GENERIC_LINK_ERROR, linkErrorMessage } from '../../lib/sign-in';
import { hangAuth, refuseAuth } from '../../../.storybook/mock-api';
import { usePressOnMount } from '../../../.storybook/press';
import EmailForm from '../EmailForm';
import NameForm from '../NameForm';
import PageNav from '../PageNav';
import ReceivedInvitations from '../ReceivedInvitations';
import SignInMethods from '.';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import type { SignInMethodsProps } from './types';

// Render-only; behaviour is asserted in tests/components/SignInMethods. Adding or
// removing reaches /api/auth, which the workshop does not serve, so a click fails
// into a callout under the control pressed.
const meta = {
  title: 'Sign In / Sign-In Methods',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ALL_PROVIDERS: readonly ProviderId[] = ['discord', 'google', 'facebook', 'microsoft'];
const DISCORD: LinkedAccount = { id: 'a-discord', providerId: 'discord' };
const MICROSOFT: LinkedAccount = { id: 'a-microsoft', providerId: 'microsoft' };

// The account page's Sign-In Methods section as src/app/(shell)/account/page.tsx
// writes it, on its panel inside the real frame, so the workshop shows what
// the page shows.
const Section = ({ id, children }: { id?: string; children: ReactNode }) => (
  <section
    id={id}
    className="page-frame__section panel"
    aria-labelledby="sign-in-methods-story-heading"
  >
    <div className="header">
      <h2 id="sign-in-methods-story-heading">Sign-In Methods</h2>
      <p className="lede">You can sign in to this account with any of these.</p>
    </div>
    {children}
  </section>
);

const Page = (props: SignInMethodsProps) => (
  <main className="page-frame page-frame--narrow">
    <Section>
      <SignInMethods {...props} />
    </Section>
  </main>
);

// The common first visit: the one provider the account was made with, which
// cannot be removed while it is the only one, and says so.
const defaultNode = <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;

const twoLinkedNode = <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />;

// The same two from a session older than Better Auth's `freshAge`: no row
// offers Remove, and the list offers a fresh sign-in instead.
const staleSessionNode = (
  <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} fresh={false} />
);

// A failed link to Microsoft, its sentence in Microsoft's row. `error` reads
// the real mapping rather than a copied string.
const failedNode = (
  <Page
    linked={[DISCORD]}
    configured={ALL_PROVIDERS}
    error={{
      providerId: 'microsoft',
      message: linkErrorMessage('account_already_linked_to_different_user') ?? GENERIC_LINK_ERROR,
    }}
  />
);

// Local dev with one registered pair: the rest cannot be added.
const someUnavailableNode = <Page linked={[DISCORD]} configured={['discord']} />;

// The whole /account page (a server component with no story of its own), composed
// as page.tsx composes it: heading, jump links (PageNav), then four panels, with
// Invitations empty. The `page-with-nav` class lays the sections out in two columns
// on a wide screen. Sign Out is only in the account menu.
const WholeAccountPage = ({
  methods = { linked: [DISCORD], configured: ALL_PROVIDERS },
}: {
  methods?: SignInMethodsProps;
}) => (
  <main className="page-frame page-frame--narrow page-with-nav">
    <h1>Your Account</h1>
    <PageNav
      label="On This Page"
      entries={[
        { href: '#account-name', label: 'Name' },
        { href: '#account-email', label: 'Email' },
        { href: '#account-sign-in-methods', label: 'Sign-In Methods' },
        { href: '#account-invitations', label: 'Invitations' },
      ]}
    />
    <section
      id="account-name"
      className="page-frame__section panel"
      aria-labelledby="account-name-heading"
    >
      <div className="header">
        <h2 id="account-name-heading">Name</h2>
        <p className="lede">The name Sorrel &amp; Salt shows for you.</p>
      </div>
      <NameForm name="Ada Fixture" />
    </section>
    <section
      id="account-email"
      className="page-frame__section panel"
      aria-labelledby="account-email-heading"
    >
      <div className="header">
        <h2 id="account-email-heading">Email</h2>
      </div>
      <EmailForm embedded email="ada@example.test" verified landing="/coven" />
    </section>
    <Section id="account-sign-in-methods">
      <SignInMethods {...methods} />
    </Section>
    <section
      id="account-invitations"
      className="page-frame__section panel"
      aria-labelledby="account-invitations-heading"
    >
      <div className="header">
        <h2 id="account-invitations-heading">Invitations</h2>
        <p className="lede">Covens that have invited this email address to join them.</p>
      </div>
      <ReceivedInvitations invitations={[]} />
    </section>
  </main>
);

const wholePageNode = <WholeAccountPage />;

// The whole page with every row state (narrow it with the viewport menu):
// two linked, one addable, one unavailable, and a failure in a row.
const EveryRow = () => (
  <WholeAccountPage
    methods={{
      linked: [DISCORD, MICROSOFT],
      configured: ['discord', 'google', 'microsoft'],
      error: { providerId: 'google', message: GENERIC_LINK_ERROR },
    }}
  />
);

const everyRowStateNode = <EveryRow />;
// Add pressed on Google, as a person would, with the link request left
// unanswered: the row's button reads "Adding" and waits, as it does while the
// browser is on its way to the provider.
export const PendingAdd: Story = {
  beforeEach: ({ msw }) => msw.use(hangAuth()),
  render: () => {
    usePressOnMount('Add Google');
    return <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;
  },
};

// Remove pressed on Microsoft, as a person would: the fake API refuses
// /api/auth, so the removal fails into its callout under Remove Microsoft,
// with the badge on the button (claude-docs/components/click-feedback.md).
export const FailedRemove: Story = {
  tags: ['expects-failed-request'],
  beforeEach: ({ msw }) => msw.use(refuseAuth()),
  render: () => {
    usePressOnMount('Remove Microsoft');
    return <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />;
  },
};

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Two Linked': twoLinkedNode,
  'Stale Session': staleSessionNode,
  Failed: failedNode,
  'Some Unavailable': someUnavailableNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

const WHOLEPAGE_STATES: Record<string, ReactNode> = {
  'Whole Page': wholePageNode,
  'Every Row State': everyRowStateNode,
};

export const WholePage: Story = {
  args: { state: 'Whole Page' },
  argTypes: {
    state: { control: 'select', options: Object.keys(WHOLEPAGE_STATES), mapping: WHOLEPAGE_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
