import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import NotAuthorized from '.';

// Render-only; behaviour is asserted in tests/components/NotAuthorized. It
// takes no props: every signed-in non-admin sees the same page. Every story
// sits in the page's real frame, `forbidden.tsx`'s `main.page-frame`
// (claude-docs/workshop.md).
const meta = {
  title: 'Pages / Not Authorized',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Page = (): ReactElement => (
  <main className="page-frame">
    <NotAuthorized />
  </main>
);

export const Default: Story = { render: () => <Page /> };
