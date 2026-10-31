import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SupportDialogStateDocument } from '@/gql/graphql';
import { answerQuery } from '../../../.storybook/mock-api';
import SupportDialog from '.';

// Render-only; behaviour is asserted in tests/components/SupportDialog. The address carries the
// parameters that open it, and the fake API (.storybook/mock-api.ts) answers the state query.
const answering = (kind: 'form' | 'unverified') => ({
  msw: {
    handlers: [
      answerQuery(SupportDialogStateDocument, () => ({
        supportDialogState: { kind, until: null },
      })),
    ],
  },
});

const meta = {
  title: 'Support / Support Dialog',
  component: SupportDialog,
  parameters: {
    nextjs: { navigation: { pathname: '/coven/fixture', query: { support: 'bug', error: '404' } } },
  },
} satisfies Meta<typeof SupportDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { parameters: answering('form') };
export const Unverified: Story = { parameters: answering('unverified') };
