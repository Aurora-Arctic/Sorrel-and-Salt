import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DisclaimerNotice from '.';

const meta = { title: 'Compendium / Disclaimer Notice' } satisfies Meta;
export default meta;

export const Default: StoryObj = {
  render: () => <DisclaimerNotice />,
};
