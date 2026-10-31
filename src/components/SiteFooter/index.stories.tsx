import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SiteFooter from '.';

// Render-only; behaviour is asserted in tests/components/SiteFooter.
const meta = { title: 'Shell / Site Footer' } satisfies Meta;
export default meta;

export const Default: StoryObj = {
  render: () => <SiteFooter />,
};
export const InShell: StoryObj = {
  render: () => <SiteFooter inShell />,
};
