import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DocumentPage from '.';

const meta = { title: 'Pages / Document Page', component: DocumentPage } satisfies Meta<
  typeof DocumentPage
>;
export default meta;

const BODY = [
  '## What Is Kept',
  '### The Row',
  'A fixture row, and the day it was written.[^herbal]',
  '### The Details',
  '- The name the fixture gave.\n- The address it was reached at.',
  '## Who Reads It',
  "Only the fixture's owner.",
  '[^herbal]: Fixture, Author. _A Fixture Herbal_. Fixture Press, 1988.',
].join('\n\n');

export const Default: StoryObj<typeof DocumentPage> = {
  args: {
    title: 'Fixture Policy',
    lede: 'What the fixture keeps, and who may read it.',
    updatedOn: new Date('2026-03-04T00:00:00Z'),
    body: BODY,
  },
};

export const WithEarlierVersions: StoryObj<typeof DocumentPage> = {
  args: {
    ...Default.args,
    history: [
      { number: 2, publishedAt: new Date('2026-02-01T00:00:00Z'), href: '/fixture/versions/2' },
      { number: 1, publishedAt: new Date('2026-01-15T00:00:00Z'), href: '/fixture/versions/1' },
    ],
  },
};
