import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShellFrame } from '../../../.storybook/shell-frame';
import Backdrop from '../Backdrop';
import NotAuthorized from '.';

const meta = {
  title: 'Pages / Not Authorized',
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <>
      <ShellFrame area="none" open="/keepers" workspaces={[]} viewer={{ canCreate: false }}>
        <main className="page-frame">
          <NotAuthorized />
        </main>
      </ShellFrame>
      <Backdrop />
    </>
  ),
};
