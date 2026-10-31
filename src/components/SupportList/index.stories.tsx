import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportList from '.';

// Render-only; behaviour is asserted in tests/components/SupportList.
const meta = { title: 'Support / Support List', component: SupportList } satisfies Meta<
  typeof SupportList
>;
export default meta;
type Story = StoryObj<typeof meta>;

const AT = new Date('2030-01-02T03:04:00Z');

export const Empty: Story = { args: { requests: [], counts: { open: 0, closed: 0 } } };
export const Rows: Story = {
  args: {
    counts: { open: 2, closed: 0 },
    requests: [
      {
        id: 'r1',
        about: 'bug',
        subject: 'The grimoire list will not load',
        status: 'open',
        createdAt: AT,
        replyCount: 0,
      },
      {
        id: 'r2',
        about: 'question',
        subject: 'How do I join a coven?',
        status: 'waiting_on_sender',
        createdAt: AT,
        replyCount: 2,
      },
    ],
  },
};
