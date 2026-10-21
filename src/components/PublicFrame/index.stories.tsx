import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { Navigating } from '../../../.ladle/navigating';
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
      <main>
        <div className="page-column">
          <h1>Compendium</h1>
        </div>
      </main>
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

// Mid-wait: the nav's Compendium link already pressed, on an entry's page, so
// the page has gone and the Compendium's cards stand in the frame's body
// under the bar (M12.47). The wait never ends here; "Start Over" ends it.
export const LoadingTheCompendium: Story = () => (
  <Navigating press="Compendium">
    <Page open="/compendium/ingredients/testwort" />
  </Navigating>
);
