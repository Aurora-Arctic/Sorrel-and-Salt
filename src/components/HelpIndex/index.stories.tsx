import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpIndex from '.';

const meta: Meta<typeof HelpIndex> = {
  title: 'Pages / Help / HelpIndex',
  component: HelpIndex,
  args: {
    faq: [
      {
        slug: 'who-can-see-my-spells',
        title: 'Who Can See My Spells?',
        body: 'Your **coven**, unless private.',
      },
    ],
    articles: [
      { title: 'Getting Started', summary: 'Where to begin.', href: '/help/getting-started' },
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof HelpIndex> = {};
