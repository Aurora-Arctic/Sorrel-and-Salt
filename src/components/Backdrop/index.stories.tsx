import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Backdrop from '.';

// Render-only. The element is fixed to the viewport corner, so the story frame
// itself is not where it appears — look at the bottom right of the preview.
const meta = {
  title: 'Layout / Backdrop',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The size every page but the front door gets.
export const Default: Story = { render: () => <Backdrop /> };

// The front door's size: `.welcome-page` on an ancestor is the hook, as on the real page.
export const FrontDoor: Story = {
  render: () => (
    <div className="welcome-page">
      <Backdrop />
    </div>
  ),
};
