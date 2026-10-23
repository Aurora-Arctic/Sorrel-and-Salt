import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { hangAuth, refuseAuth, useMockHandlers } from '../../../.storybook/mock-api';
import { usePressOnMount } from '../../../.storybook/press';
import { ShellFrame, shellFrameParameters } from '../../../.storybook/shell-frame';
import ImpersonationBanner from '.';

// Render-only; behaviour is asserted in tests/components/ImpersonationBanner.
// Stop is answered by the workshop's fake sign-in service (.storybook/mock-api.ts):
// refused in Stop Failed, never answered in Stopping. A success would leave the
// page for the admin's own, so no story shows it. Where
// the browser can hover, the banner tucks itself above the page until a
// pointer nears the top; on a touch screen, which the review screenshots
// emulate, it sits in the page's flow at the top, shown in full.
const meta = {
  title: 'Layout / Impersonation Banner',
  parameters: shellFrameParameters,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Stop is never answered here, so a press shows Stopping, not the fake API's 501.
export const Default: Story = {
  beforeEach: ({ msw }) => msw.use(hangAuth()),
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
  beforeEach: ({ msw }) => msw.use(hangAuth()),
  render: () => <OverTheShellView />,
};

// Stop pressed and the sign-out refused: the banner stays open with the callout
// under the button. The refusal is a failed request on purpose.
const REFUSED = [refuseAuth()];
const StopFailedView = () => {
  useMockHandlers(REFUSED);
  usePressOnMount('Stop Impersonating');
  return <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />;
};

export const StopFailed: Story = {
  tags: ['expects-failed-request'],
  render: () => <StopFailedView />,
};

// Stop pressed and not yet answered: the button reads Stopping and is busy.
const UNANSWERED = [hangAuth()];
const StoppingView = () => {
  useMockHandlers(UNANSWERED);
  usePressOnMount('Stop Impersonating');
  return <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />;
};

export const Stopping: Story = {
  render: () => <StoppingView />,
};
