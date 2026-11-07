import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { hangAuth, refuseAuth, useMockHandlers } from '../../../.storybook/mock-api';
import { usePressOnMount } from '../../../.storybook/press';
import { ShellFrame } from '../../../.storybook/shell-frame';
import ImpersonationBanner from '.';

const meta = {
  title: 'Layout / Impersonation Banner',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: ({ msw }) => msw.use(hangAuth()),
  render: () => <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />,
};
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

const UNANSWERED = [hangAuth()];
const StoppingView = () => {
  useMockHandlers(UNANSWERED);
  usePressOnMount('Stop Impersonating');
  return <ImpersonationBanner name="Bo Fixturewort" email="bo@users.test" />;
};

export const Stopping: Story = {
  render: () => <StoppingView />,
};
