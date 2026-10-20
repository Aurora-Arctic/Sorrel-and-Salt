import type { Story } from '@ladle/react';
import type { Route } from 'next';
import MenuButton from '.';
import type { MenuButtonItem } from './types';

// Render-only; the keys and the closing are asserted in
// tests/components/MenuButton/index.test.tsx. The entry page's Edit menu, a
// link first and the destructive choice last; the button busy; and the
// Annotate dialog's More, opening above from a dialog's foot (M8.17).
export default {
  title: 'Forms / Menu Button',
};

const ITEMS: MenuButtonItem[] = [
  {
    key: 'edit',
    label: 'Edit Compendium Entry',
    href: '/?edit' as Route,
    onClick: (e) => e.preventDefault(),
  },
  { key: 'annotate', label: 'Annotate', onSelect: () => {} },
  { key: 'add', label: 'Add to Cupboard', constructive: true, onSelect: () => {} },
  { key: 'own', label: 'Make It Ours', onSelect: () => {} },
  { key: 'remove', label: 'Remove', destructive: true, onSelect: () => {} },
];

const Row = ({ busy = false }: { busy?: boolean }) => (
  <p style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>
    <MenuButton
      label="Edit"
      className="btn btn--quiet btn--medium"
      items={ITEMS}
      busy={busy}
      busyLabel="Adding"
    />
  </p>
);

export const EditMenu: Story = () => <Row />;

export const Busy: Story = () => <Row busy />;

export const PhoneDark: Story = () => <Row />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Row />;
PhoneLight.meta = { theme: 'light', width: 375 };

// At a dialog's foot, as the Annotate dialog's More is, its items in the
// button's type: set at the window's foot, where the room is above, so the
// menu flips over the button. No prop says so; the room decides.
const Foot = () => (
  <p
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      minHeight: '90vh',
    }}
  >
    <MenuButton label="More" className="btn btn--quiet" items={ITEMS.slice(3)} buttonType />
  </p>
);

export const OpensAbove: Story = () => <Foot />;
