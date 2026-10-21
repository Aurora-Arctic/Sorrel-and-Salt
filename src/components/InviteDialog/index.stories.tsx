import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useEffect, useRef } from 'react';
import InviteDialog from '.';

// Render-only; behaviour is asserted in tests/components/InviteDialog. In the
// workshop the call reaches no server, so sending shows the failure.
const meta = {
  title: 'Coven / Invite Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const WORKSPACE = '00000000-0000-0000-0000-000000000001';

export const Default: Story = { render: () => <InviteDialog workspaceId={WORKSPACE} /> };

// Pressed already, as after a click on Invite: the dialog over the page.
const Pressed = (): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.querySelector('button')?.click(), []);
  return (
    <div ref={root}>
      <InviteDialog workspaceId={WORKSPACE} />
    </div>
  );
};

export const Open: Story = { render: () => <Pressed /> };

// A modal draws in the page's own document, so its stories sit in a frame of
// their own (claude-docs/workshop.md).
