import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import PublicFrame from '../src/components/PublicFrame';
import { WorkshopPathname } from './navigation';

// The compendium page's head as MB.120 proposes it (the MB.120 plan),
// inside the public frame as the (public) layout draws it, so a review sees the
// page and not only the piece. The page is a server component that reads the
// session, so this is its markup with fixture props. The recommendation is
// built into the running page; the owner settles it at sign-off, and the
// losing story is deleted then. The names are invented (M1.25).
export default {
  title: 'Pages / Compendium Head',
};

const Frame = ({ children }: { children: ReactElement }): ReactElement => (
  <WorkshopPathname.Provider value="/compendium">
    <PublicFrame>
      <div className="page-column">{children}</div>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

// What the page drew: the heading alone, over the cards.
const AsBuilt = (): ReactElement => (
  <Frame>
    <div className="page-header">
      <h1>Compendium</h1>
    </div>
  </Frame>
);

// The coven pages' head (MB.119): an eyebrow naming the section, the heading,
// and a lede saying what the section is for. Recommended.
const Proposed = (): ReactElement => (
  <Frame>
    <header className="header">
      <p className="eyebrow">Reference</p>
      <h1>Compendium</h1>
      <p className="lede">
        Ingredients for spellwork: their formal and folk names, categories, deities and forms, with
        the sources behind them.
      </p>
    </header>
  </Frame>
);

export const ProposalCompendiumHeadAsBuilt: Story = () => <AsBuilt />;

export const ProposalCompendiumHead: Story = () => <Proposed />;

export const ProposalCompendiumHeadPhoneDark: Story = () => <Proposed />;
ProposalCompendiumHeadPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalCompendiumHeadPhoneLight: Story = () => <Proposed />;
ProposalCompendiumHeadPhoneLight.meta = { theme: 'light', width: 375 };
