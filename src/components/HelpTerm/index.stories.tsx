import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpTerm from '.';

const meta: Meta<typeof HelpTerm> = {
  title: 'Pages / Help / HelpTerm',
  component: HelpTerm,
  args: {
    slug: 'steward',
    title: 'Steward',
    definition: 'The top coven role. A Steward invites and removes members.',
    shown: 'Stewards',
  },
  render: (args) => (
    <p style={{ margin: '4rem 2rem' }}>
      Only <HelpTerm {...args} /> can invite a new member.
    </p>
  ),
};
export default meta;

export const Default: StoryObj<typeof HelpTerm> = {};
