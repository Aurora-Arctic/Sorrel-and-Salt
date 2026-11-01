import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DisclaimerNotice from '.';

// Render-only; behaviour is asserted in tests/components/DisclaimerNotice.
const meta = { title: 'Compendium / Disclaimer Notice' } satisfies Meta;
export default meta;

export const Default: StoryObj = {
  render: () => <DisclaimerNotice />,
};
