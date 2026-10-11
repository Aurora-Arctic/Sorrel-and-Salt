import type { Story } from '@ladle/react';
import type { ReactNode } from 'react';
import { GENERIC_LINK_ERROR, linkErrorMessage } from '../../lib/sign-in';
import EmailForm from '../EmailForm';
import NameForm from '../NameForm';
import SignOutButton from '../SignOutButton';
import SignInMethods from '.';
import type { LinkedAccount, ProviderId } from '../../lib/types';
import type { SignInMethodsProps } from './types';

// Render-only; behaviour is asserted in tests/components/SignInMethods. Adding
// or removing here reaches for /api/auth, which the workshop does not serve,
// so a click fails into the alert region — a state worth seeing in itself.
export default {
  title: 'Sign In / Methods',
};

const ALL_PROVIDERS: readonly ProviderId[] = ['discord', 'google', 'facebook', 'microsoft'];
const DISCORD: LinkedAccount = { id: 'a-discord', providerId: 'discord' };
const MICROSOFT: LinkedAccount = { id: 'a-microsoft', providerId: 'microsoft' };

// The account page's Sign-In Methods section as src/app/account/page.tsx
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
export const OneLinked: Story = () => <Page linked={[DISCORD]} configured={ALL_PROVIDERS} />;

export const TwoLinked: Story = () => (
  <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />
);

// The same two from a session older than Better Auth's `freshAge`: no row
// offers Remove, and the list offers a fresh sign-in instead.
export const StaleSession: Story = () => (
  <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} fresh={false} />
);

// A failed link to Microsoft, its sentence in Microsoft's row. `error` reads
// the real mapping rather than a copied string.
export const WithError: Story = () => (
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
export const SomeUnavailable: Story = () => <Page linked={[DISCORD]} configured={['discord']} />;

// The whole /account page, which is a server component and has no story of
// its own: its three sections composed as page.tsx composes them, with
// fixture props in place of the session and the row. Each section is on its
// own panel, which parts it from the next, so no rule is drawn between them.
const WholeAccountPage = ({
  methods = { linked: [DISCORD], configured: ALL_PROVIDERS },
}: {
  methods?: SignInMethodsProps;
}) => (
  <main className="page-frame page-frame--narrow">
    <div className="page-header">
      <h1>Your Account</h1>
      <SignOutButton />
    </div>
    <nav aria-label="On this page">
      <ul className="link-row">
        <li>
          <a href="#story-account-name">Name</a>
        </li>
        <li>
          <a href="#story-account-email">Email</a>
        </li>
        <li>
          <a href="#story-account-sign-in-methods">Sign-In Methods</a>
        </li>
      </ul>
    </nav>
    <section
      id="story-account-name"
      className="page-frame__section panel"
      aria-labelledby="story-account-name-heading"
    >
      <div className="header">
        <h2 id="story-account-name-heading">Name</h2>
        <p className="lede">The name Sorrel &amp; Salt shows for you.</p>
      </div>
      <NameForm name="Ada Fixture" />
    </section>
    <section
      id="story-account-email"
      className="page-frame__section panel"
      aria-labelledby="story-account-email-heading"
    >
      <div className="header">
        <h2 id="story-account-email-heading">Email</h2>
      </div>
      <EmailForm embedded email="ada@example.test" verified landing="/coven" />
    </section>
    <Section id="story-account-sign-in-methods">
      <SignInMethods {...methods} />
    </Section>
  </main>
);

export const WholePage: Story = () => <WholeAccountPage />;

// The whole page at a phone's width, in each theme, with every row state:
// two linked, one addable, one unavailable, and a failure in a row.
const AtPhoneWidth = () => (
  <WholeAccountPage
    methods={{
      linked: [DISCORD, MICROSOFT],
      configured: ['discord', 'google', 'microsoft'],
      error: { providerId: 'google', message: GENERIC_LINK_ERROR },
    }}
  />
);

export const PhoneDark: Story = () => <AtPhoneWidth />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <AtPhoneWidth />;
PhoneLight.meta = { theme: 'light', width: 375 };
