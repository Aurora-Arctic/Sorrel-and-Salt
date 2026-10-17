import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import PublicFrame from '.';

// Render-only; behaviour is asserted in tests/components/PublicFrame. The frame
// takes only the page, so each story fills it with a heading
// (claude-docs/workshop.md).
export default {
  title: 'Shell / Public Frame',
};

const Page = (): ReactElement => (
  <PublicFrame>
    <h1>Compendium</h1>
  </PublicFrame>
);

export const Default: Story = () => <Page />;

// A phone's width, in each theme.
export const PhoneDark: Story = () => <Page />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Page />;
PhoneLight.meta = { theme: 'light', width: 375 };
