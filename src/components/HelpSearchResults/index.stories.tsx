import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpSearchResults from '.';

const meta: Meta<typeof HelpSearchResults> = {
  title: 'Pages / Help / HelpSearchResults',
  component: HelpSearchResults,
};
export default meta;

export const Results: StoryObj<typeof HelpSearchResults> = {
  args: {
    query: 'stock',
    results: [
      {
        kind: 'article',
        title: 'Stock Levels',
        summary: 'How stock is counted.',
        href: '/help/stock-levels',
      },
      { kind: 'term', title: 'Stock', summary: null, href: '/help/glossary#stock' },
    ],
  },
};
export const NoMatches: StoryObj<typeof HelpSearchResults> = {
  args: { query: 'zzz', results: [] },
};
export const Empty: StoryObj<typeof HelpSearchResults> = { args: { query: '', results: [] } };
