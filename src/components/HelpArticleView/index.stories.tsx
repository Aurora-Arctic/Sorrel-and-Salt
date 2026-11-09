import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpArticleView from '.';

const meta: Meta<typeof HelpArticleView> = {
  title: 'Pages / Help / HelpArticleView',
  component: HelpArticleView,
  args: {
    title: 'Getting Started',
    body: 'Welcome to the grimoire.\n\n## First Steps\n\n- Sign in\n- Open your coven',
    subpages: [
      { title: 'Signing In', summary: 'How to sign in.', href: '/help/getting-started/signing-in' },
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof HelpArticleView> = {};
export const NoSubpages: StoryObj<typeof HelpArticleView> = { args: { subpages: [] } };
export const SubPage: StoryObj<typeof HelpArticleView> = {
  args: {
    title: 'Signing In',
    body: 'Choose Sign In and follow the panel.',
    subpages: [],
    parent: { title: 'Getting Started', href: '/help/getting-started' },
  },
};
export const WithMenu: StoryObj<typeof HelpArticleView> = {
  args: {
    title: 'A Long Guide',
    body: [
      '## Signing In',
      'How to sign in.',
      '## Your Coven',
      'What a coven is.',
      '## Ingredients',
      'What you have.',
      '## Grimoire',
      'What you make.',
    ].join('\n\n'),
    subpages: [],
  },
};
