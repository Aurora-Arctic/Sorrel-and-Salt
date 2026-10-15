import type { Story } from '@ladle/react';
import { ShellFrame } from '../../../.ladle/shell-frame';
import ImpersonationBanner from '.';

// Render-only; behaviour is asserted in tests/components/ImpersonationBanner.
// In the workshop Stop reaches no server, so a click shows the failure. Where
// the browser can hover, the banner tucks itself above the page until a
// pointer nears the top; on a touch screen, which the review screenshots
// emulate, it sits in the page's flow at the top, shown in full.
export default {
  title: 'Layout / Impersonation Banner',
};

export const Default: Story = () => (
  <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />
);

// At phone width, above the shell, where the app puts it: the first thing in
// the body, over everything, the shell's bar included (src/app/layout.tsx). On
// a touch screen (`hover: none`), as the review screenshots emulate, the banner
// is in the flow and the bar starts below it; a desktop browser shows it tucked.
const OverTheShell = () => (
  <>
    <ImpersonationBanner name="Bo Fixturewort" email="bo-fixturewort@users.test" />
    <ShellFrame area="none">
      <main className="page-frame page-frame--narrow">
        <h1>Your Account</h1>
        <p>The page below the shell's bar.</p>
      </main>
    </ShellFrame>
  </>
);

export const PhoneDark: Story = () => <OverTheShell />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <OverTheShell />;
PhoneLight.meta = { theme: 'light', width: 375 };
