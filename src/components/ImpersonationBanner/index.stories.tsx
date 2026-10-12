import type { Story } from '@ladle/react';
import ImpersonationBanner from '.';

// Render-only; behaviour is asserted in tests/components/ImpersonationBanner.
// In the workshop Stop reaches no server, so a click shows the failure. Where
// the browser can hover, the banner tucks itself above the page until a
// pointer nears the top; on a touch screen, which the review screenshots
// emulate, it sits in the page's flow at the top, shown in full.
export default {
  title: 'Impersonation Banner',
};

export const Default: Story = () => (
  <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />
);

// At phone width, above a page as the app draws it, so the touch layout shows
// the page starting below it. On a touch screen (`hover: none`), as the review
// screenshots emulate, the banner is in the flow; a desktop browser shows it
// tucked.
const OverAPage = () => (
  <>
    <ImpersonationBanner name="Bo Fixturewort" email="bo-fixturewort@users.test" />
    <main className="page-frame">
      <h1>Sorrel &amp; Salt</h1>
      <p>The page below the banner.</p>
    </main>
  </>
);

export const PhoneDark: Story = () => <OverAPage />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <OverAPage />;
PhoneLight.meta = { theme: 'light', width: 375 };
