import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BusyButton from '.';

// Render-only; the busy state is asserted by the forms that use it (NameForm,
// EmailForm, the account menu's Sign Out and the rest). Each variant idle and busy, side by
// side, since the spinner and the label swap are the whole of the component.
const meta = {
  title: 'Forms / Busy Button',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Pair = ({ className }: { className: string }) => (
  <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
    <BusyButton className={className} busy={false} busyLabel="Saving Name">
      Save Name
    </BusyButton>
    <BusyButton className={className} busy disabled busyLabel="Saving Name">
      Save Name
    </BusyButton>
  </p>
);

const SolidView = () => <Pair className="btn btn--solid" />;

export const Default: Story = { render: SolidView };

const OutlineView = () => <Pair className="btn" />;

export const Outline: Story = { render: OutlineView };

const DestructiveView = () => <Pair className="btn btn--destructive" />;

export const Destructive: Story = { render: DestructiveView };

const SmallView = () => <Pair className="btn btn--small" />;

export const Small: Story = { render: SmallView };

// Busy without `disabled`, as Impersonate is: `aria-disabled` keeps the focus.
export const BusyKeepingFocus: Story = {
  render: () => (
    <BusyButton
      className="btn btn--destructive btn--small"
      busy
      aria-disabled
      busyLabel="Impersonating"
    >
      Impersonate
    </BusyButton>
  ),
};
