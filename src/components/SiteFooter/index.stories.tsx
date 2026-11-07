import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SiteFooter from '.';

const meta = { title: 'Shell / Site Footer' } satisfies Meta;
export default meta;

export const Default: StoryObj = {
  render: () => <SiteFooter />,
};
