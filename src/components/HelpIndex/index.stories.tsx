import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpIndex from '.';

const meta: Meta<typeof HelpIndex> = {
  title: 'Pages / Help / HelpIndex',
  component: HelpIndex,
  args: {
    faq: [
      {
        slug: 'who-can-see-my-spells',
        title: 'Who can see my spells?',
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
export const FrontPage: StoryObj<typeof HelpIndex> = {
  args: {
    lede: 'Guides to the Compendium, your coven, its ingredients and grimoire, and the words we use.',
    quickLinks: [
      { title: 'Signing In', summary: null, href: '/help/getting-started/signing-in' },
      { title: 'Track Stock', summary: null, href: '/help/ingredients/track-stock' },
    ],
  },
};
