import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Backdrop from '.';

// Render-only. The element is fixed to the viewport corner, so look at the
// corners of the preview, not the frame. Two fixed layers cannot sit side by
// side, so one control chooses the state. The theme is the toolbar's.
const meta = {
  title: 'Layout / Backdrop',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const BACKDROP_STATES: Record<string, ReactNode> = {
  // The size every page but the front door gets.
  'Every Page': <Backdrop />,
  // The front door's size: `.welcome-page` on an ancestor is the hook, as on the real page.
  'Front Door': (
    <div className="welcome-page">
      <Backdrop />
    </div>
  ),
};

export const States: Story = {
  args: { state: 'Every Page' },
  argTypes: {
    state: { control: 'select', options: Object.keys(BACKDROP_STATES), mapping: BACKDROP_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
