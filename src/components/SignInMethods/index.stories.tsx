import type { Story } from '@ladle/react';
import type { ReactNode } from 'react';
import { GENERIC_LINK_ERROR, linkErrorMessage } from '../../lib/sign-in';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';
import EmailForm from '../EmailForm';
import NameForm from '../NameForm';
import ProviderMark from '../ProviderMark';
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
// writes it, inside the real frame, so the workshop shows what the page shows.
const Section = ({
  id,
  panel = false,
  children,
}: {
  id?: string;
  panel?: boolean;
  children: ReactNode;
}) => (
  <section
    id={id}
    className={panel ? 'page-frame__section panel' : 'page-frame__section'}
    aria-labelledby="sign-in-methods-story-heading"
  >
    <div className="header">
      <h2 id="sign-in-methods-story-heading">Sign-In Methods</h2>
      <p className="lede">Any of these signs you in to this account.</p>
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
// fixture props in place of the session and the row.
const WholeAccountPage = ({
  panel = false,
  methods = { linked: [DISCORD], configured: ALL_PROVIDERS },
}: {
  panel?: boolean;
  methods?: SignInMethodsProps;
}) => {
  const sectionClass = panel ? 'page-frame__section panel' : 'page-frame__section';
  return (
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
        className={sectionClass}
        aria-labelledby="story-account-name-heading"
      >
        <div className="header">
          <h2 id="story-account-name-heading">Name</h2>
          <p className="lede">Change your name.</p>
        </div>
        <NameForm name="Ada Fixture" />
      </section>
      {/* On panels, the panels part the sections and a rule is one edge too many. */}
      {!panel && <hr className="page-frame__rule" />}
      <section
        id="story-account-email"
        className={sectionClass}
        aria-labelledby="story-account-email-heading"
      >
        <div className="header">
          <h2 id="story-account-email-heading">Email</h2>
        </div>
        <EmailForm embedded email="ada@example.test" verified landing="/coven" />
      </section>
      {!panel && <hr className="page-frame__rule" />}
      <Section id="story-account-sign-in-methods" panel={panel}>
        <SignInMethods {...methods} />
      </Section>
    </main>
  );
};

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

// ---------------------------------------------------------------------------
// Proposals for the owner's calls (MB.116, Phase 1), in pairs that sit side
// by side in the workshop's list: one of each pair is the component as built,
// the other a sketch of the alternative. `SketchList` mirrors ProviderRow's
// markup with the alternative switched on, so nothing here reaches the
// component; the sketch and every `Proposal…` story go once the owner has
// decided, with the losing side.

interface SketchOptions {
  /** A "Linked" word on each linked row. */
  statusWord?: boolean;
  /** Remove in the wax, `.btn--destructive`, rather than the outline. */
  destructive?: boolean;
  /** Each row's provider mark. */
  marks?: boolean;
}

// Discord and Microsoft linked, Google and Facebook addable, as TwoLinked.
const SketchList = ({ statusWord = false, destructive = false, marks = true }: SketchOptions) => (
  <main className="page-frame page-frame--narrow">
    <Section>
      <div className="sign-in-methods">
        <ul className="sign-in-methods__list">
          {SOCIAL_PROVIDERS.map((provider) => {
            const linked = provider.id === 'discord' || provider.id === 'microsoft';
            return (
              <li key={provider.id} className="sign-in-methods__item">
                {marks && <ProviderMark id={provider.id} />}
                <span className="sign-in-methods__label">
                  {provider.label}
                  {statusWord && linked && (
                    <>
                      {' '}
                      <span className="meta">Linked</span>
                    </>
                  )}
                </span>
                <button
                  type="button"
                  className={linked && destructive ? 'btn btn--destructive' : 'btn'}
                >
                  {linked ? 'Remove' : 'Add'} {provider.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  </main>
);

const Built = () => <Page linked={[DISCORD, MICROSOFT]} configured={ALL_PROVIDERS} />;

// 1d.6: no status word, as built (MB.71's call), or a "Linked" on each
// linked row.
export const ProposalNoStatus: Story = () => <Built />;
export const ProposalStatusWord: Story = () => <SketchList statusWord />;

// 1d.6: Remove as the outline, as built, since removing a way in destroys no
// data; or in the wax, as every other Remove.
export const ProposalRemoveOutline: Story = () => <Built />;
export const ProposalRemoveDestructive: Story = () => <SketchList destructive />;

// 1d.6: each row with its provider's mark, as built, or text alone (MB.71's
// call then).
export const ProposalMarks: Story = () => <Built />;
export const ProposalNoMarks: Story = () => <SketchList marks={false} />;

// 1d.1: the account page's sections bare, as built, or each on a `.panel`.
export const ProposalPanelOff: Story = () => <WholeAccountPage />;
export const ProposalPanelOn: Story = () => <WholeAccountPage panel />;
