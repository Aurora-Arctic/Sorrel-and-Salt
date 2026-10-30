import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import SaveStatus, { RecoveryNotice } from '.';
import type { SaveStatusProps } from './types';

// Every state an autosaving form's status line takes, side by side.
// Render-only: the once-per-burst announcement is the component test's.
const meta = {
  title: 'Feedback / Save Status',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const at = new Date(2026, 9, 27, 14, 2);
const noop = () => {};
const base: SaveStatusProps = {
  status: 'idle',
  savedAt: null,
  conflictMessage: 'This spell was changed elsewhere.',
  onRetry: noop,
  onReload: noop,
  onKeepMine: noop,
};

export const States: Story = {
  render: () => (
    <StatesGrid
      states={{
        Idle: <SaveStatus {...base} />,
        Pending: <SaveStatus {...base} status="pending" />,
        Saving: <SaveStatus {...base} status="saving" />,
        Saved: <SaveStatus {...base} status="saved" savedAt={at} />,
        'Draft Saved': <SaveStatus {...base} status="saved" savedAt={at} draft />,
        Failed: <SaveStatus {...base} status="failed" savedAt={at} />,
        Conflict: <SaveStatus {...base} status="conflict" savedAt={at} />,
      }}
    />
  ),
};

// The banner a form opens with when this browser kept typing it never saved.
export const Recovery: Story = {
  render: () => <RecoveryNotice at={at} onKeep={noop} onDiscard={noop} />,
};
