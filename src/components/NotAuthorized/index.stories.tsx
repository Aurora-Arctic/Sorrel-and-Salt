import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShellFrame } from '../../../.storybook/shell-frame';
import Backdrop from '../Backdrop';
import NotAuthorized from '.';

// Render-only; behaviour is asserted in tests/components/NotAuthorized. It takes no props.
const meta = {
  title: 'Pages / Not Authorized',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// The 403 page `forbidden.tsx` draws for a signed-in non-admin: its real `main.page-frame`, inside
// the shell of an account with no coven to write in, so no Add Ingredient, and the layout's corner
// Backdrop.
export const Default: Story = {
  render: () => (
    <>
      <ShellFrame area="none" open="/admin" workspaces={[]} viewer={{ canCreate: false }}>
        <main className="page-frame">
          <NotAuthorized />
        </main>
      </ShellFrame>
      <Backdrop />
    </>
  ),
};
