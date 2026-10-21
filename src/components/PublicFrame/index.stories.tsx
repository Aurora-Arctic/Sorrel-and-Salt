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
