import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportList from '.';

// Render-only; behaviour is asserted in tests/components/SupportList.
const meta = { title: 'Support / Support List', component: SupportList } satisfies Meta<
  typeof SupportList
>;
export default meta;
type Story = StoryObj<typeof meta>;

const AT = new Date('2030-01-02T03:04:00Z');

export const Empty: Story = { args: { requests: [] } };
export const WithRepliesAndAnIssue: Story = {
  args: {
    requests: [
      {
        id: 'r1',
        about: 'bug',
        subject: 'The grimoire list will not load',
        message: 'It shows a blank page.',
        status: 'open',
        createdAt: AT,
        replies: [{ id: 'p1', body: 'Thank you, we have filed it.', createdAt: AT }],
      },
      {
        id: 'r2',
        about: 'question',
        subject: 'How do I join a coven?',
        message: 'I was sent a card.',
        status: 'resolved',
        createdAt: AT,
        replies: [],
      },
    ],
  },
};
