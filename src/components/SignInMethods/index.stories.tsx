import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { GENERIC_LINK_ERROR, linkErrorMessage } from '../../lib/sign-in';
import { hangAuth, refuseAuth } from '../../../.storybook/mock-api';
import { press, pressLast, usePressOnMount, useSteps } from '../../../.storybook/press';
import EmailForm from '../EmailForm';
import NameForm from '../NameForm';
import PageNav from '../PageNav';
import ReceivedInvitations from '../ReceivedInvitations';
import SignInMethods from '.';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import type { SignInMethodsProps } from './types';

const meta = {
  title: 'Sign In / Sign-In Methods',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ALL_PROVIDERS: readonly ProviderId[] = ['discord', 'google', 'facebook', 'microsoft'];
const DISCORD: LinkedAccount = { id: 'a-discord', providerId: 'discord' };
const MICROSOFT: LinkedAccount = { id: 'a-microsoft', providerId: 'microsoft' };

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

type StoryProps = Omit<SignInMethodsProps, 'passwordHeld' | 'passkeyCount'> &
  Partial<SignInMethodsProps>;

const withDefaults = (props: StoryProps) => ({
  passwordHeld: true,
  passkeyCount: 1,
  ...props,
});

const Page = (props: StoryProps) => (
  <main className="page-frame page-frame--narrow">
    <Section>
      <SignInMethods {...withDefaults(props)} />
    </Section>
  </main>
);

const defaultNode = <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;

const twoLinkedNode = <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />;

const staleSessionNode = (
  <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} fresh={false} />
);

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

const someUnavailableNode = <Page linked={[DISCORD]} configured={['discord']} />;

const WholeAccountPage = ({
  methods = { linked: [DISCORD], configured: ALL_PROVIDERS },
}: {
  methods?: StoryProps;
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
      <SignInMethods {...withDefaults(methods)} />
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
export const PendingAdd: Story = {
  beforeEach: ({ msw }) => msw.use(hangAuth()),
  render: () => {
    usePressOnMount('Add Google');
    return <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;
  },
};

export const FailedRemove: Story = {
  tags: ['expects-failed-request'],
  beforeEach: ({ msw }) => msw.use(refuseAuth()),
  render: () => {
    useSteps([() => press('Remove Microsoft'), () => pressLast('Remove')]);
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
  render: ({ state }) => <div>{state}</div>,
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
  render: ({ state }) => <div>{state}</div>,
};
