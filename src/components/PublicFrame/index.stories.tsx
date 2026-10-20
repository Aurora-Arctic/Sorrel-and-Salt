import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { WorkshopPathname } from '../../../.ladle/navigation';
import PublicFrame from '.';

// Render-only; behaviour is asserted in tests/components/PublicFrame. The frame
// takes only the page, so each story fills it with a heading
// (claude-docs/workshop.md).
export default {
  title: 'Shell / Public Frame',
};

// The workshop pretends to be on the admin area unless told otherwise, so each
// story says where the page is: the nav marks the Compendium link as current
// at or beneath /compendium.
const Page = ({ open = '/compendium' }: { open?: string }): ReactElement => (
  <WorkshopPathname.Provider value={open}>
    <PublicFrame>
      <h1>Compendium</h1>
    </PublicFrame>
  </WorkshopPathname.Provider>
);

export const Default: Story = () => <Page />;

// A phone's width, in each theme.
export const PhoneDark: Story = () => <Page />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Page />;
PhoneLight.meta = { theme: 'light', width: 375 };

// The bar on a page the nav does not name, so the Compendium link rests unmarked.
export const NotOnTheCompendium: Story = () => <Page open="/" />;

// MB.120 proposal, current-page mark. As built the public nav marked nothing, where the
// signed-in shell weights its current link and draws a heavy rule along its foot. The
// recommendation (built; the owner settles it at sign-off) gives both bars the same
// mark: `aria-current="page"`, weight 500 and a 3px accent rule drawn as a border, so
// it survives a high-contrast mode, which drops a box-shadow. The two stories are the
// same bar with and without it.
export const ProposalCurrentPageBare: Story = () => <Page open="/" />;

export const ProposalCurrentPage: Story = () => <Page />;

export const ProposalCurrentPagePhoneDark: Story = () => <Page />;
ProposalCurrentPagePhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalCurrentPagePhoneLight: Story = () => <Page />;
ProposalCurrentPagePhoneLight.meta = { theme: 'light', width: 375 };
