import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShellFrame } from '../../../.storybook/shell-frame';
import ImpersonationBanner from '.';

// Render-only; behaviour is asserted in tests/components/ImpersonationBanner.
// In the workshop Stop reaches no server, so a click shows the failure. Where
// the browser can hover, the banner tucks itself above the page until a
// pointer nears the top; on a touch screen, which the review screenshots
// emulate, it sits in the page's flow at the top, shown in full.
const meta = {
  title: 'Layout / Impersonation Banner',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />,
};
// Above the shell, where the app puts it: the first thing in the body, over
// everything, the shell's bar included (src/app/layout.tsx). On a touch screen
// (`hover: none`) the banner is in the flow and the bar starts below it; a
// desktop browser shows it tucked.
const OverTheShellView = () => (
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

export const OverTheShell: Story = {
  render: () => <OverTheShellView />,
};
