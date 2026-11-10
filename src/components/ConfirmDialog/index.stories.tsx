import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactNode } from 'react';
import ConfirmDialog from '.';

// Render-only; behaviour is asserted in tests/components/ConfirmDialog. A dialog is modal, so the
// state dropdown shows one at a time.
const meta = {
  title: 'Surfaces / Confirm Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const question = (
  <>
    Delete <strong>Hearth Warding Jar</strong>?
  </>
);

const nothing = () => undefined;

const STATES: Record<string, ReactNode> = {
  Question: (
    <ConfirmDialog
      title="Delete Spell"
      question={question}
      confirmLabel="Delete"
      busyLabel="Deleting"
      onConfirm={nothing}
      onClose={nothing}
    />
  ),
  'With Warning': (
    <ConfirmDialog
      title="Delete Spell"
      question={question}
      confirmLabel="Delete"
      busyLabel="Deleting"
      onConfirm={nothing}
      onClose={nothing}
    >
      <p>Its workings are deleted with it.</p>
    </ConfirmDialog>
  ),
  Pending: (
    <ConfirmDialog
      title="Delete Spell"
      question={question}
      confirmLabel="Delete"
      busyLabel="Deleting"
      busy
      onConfirm={nothing}
      onClose={nothing}
    />
  ),
  'Answer That Can Be Taken Back': (
    <ConfirmDialog
      title="Make It Ours"
      question={
        <>
          Make <strong>Testwort</strong> our own?
        </>
      }
      confirmLabel="Make It Ours"
      busyLabel="Making"
      tone="solid"
      onConfirm={nothing}
      onClose={nothing}
    />
  ),
};

export const States: Story = {
  args: { state: 'Question' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
