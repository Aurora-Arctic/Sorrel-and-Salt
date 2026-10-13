import type { Story } from '@ladle/react';
import BusyButton from '.';

// Render-only; the busy state is asserted by the forms that use it (NameForm,
// EmailForm, the account menu's Sign Out and the rest). Each variant idle and busy, side by
// side, since the spinner and the label swap are the whole of the component.
export default {
  title: 'Forms / Busy Button',
};

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

export const Solid: Story = () => <Pair className="btn btn--solid" />;

export const Outline: Story = () => <Pair className="btn" />;

export const Destructive: Story = () => <Pair className="btn btn--destructive" />;

export const Small: Story = () => <Pair className="btn btn--small" />;

// Busy without `disabled`, as Impersonate is: `aria-disabled` keeps the focus.
export const BusyKeepingFocus: Story = () => (
  <BusyButton
    className="btn btn--destructive btn--small"
    busy
    aria-disabled
    busyLabel="Impersonating"
  >
    Impersonate
  </BusyButton>
);

const All = () => (
  <div>
    <Solid />
    <Outline />
    <Destructive />
    <Small />
  </div>
);

export const PhoneDark: Story = () => <All />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <All />;
PhoneLight.meta = { theme: 'light', width: 375 };
