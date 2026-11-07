import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpGlossary from '.';

const meta: Meta<typeof HelpGlossary> = {
  title: 'Pages / Help / HelpGlossary',
  component: HelpGlossary,
  args: {
    terms: [
      { slug: 'observer', title: 'Observer', body: 'Reads a coven and writes nothing.' },
      { slug: 'steward', title: 'Steward', body: 'Runs a coven.' },
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof HelpGlossary> = {};
