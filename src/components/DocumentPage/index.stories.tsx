import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DocumentPage from '.';

// Render-only; behaviour is asserted in tests/components/DocumentPage.
const meta = { title: 'Pages / Document Page', component: DocumentPage } satisfies Meta<
  typeof DocumentPage
>;
export default meta;

export const Default: StoryObj<typeof DocumentPage> = {
  args: {
    title: 'Fixture Policy',
    lede: 'What the fixture keeps, and who may read it.',
    updatedOn: new Date('2026-03-04T00:00:00Z'),
    children: (
      <>
        <h2>What Is Kept</h2>
        <p>A fixture row, and the day it was written.</p>
        <ul>
          <li>The name the fixture gave.</li>
          <li>The address it was reached at.</li>
        </ul>
      </>
    ),
  },
};
