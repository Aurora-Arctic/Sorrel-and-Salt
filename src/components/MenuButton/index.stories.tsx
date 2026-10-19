import type { Story } from '@ladle/react';
import type { Route } from 'next';
import MenuButton from '.';
import type { MenuButtonItem } from './types';

// Render-only; the keys and the closing are asserted in
// tests/components/MenuButton/index.test.tsx. The entry page's Edit menu, a
// link first and the destructive choice last; and the button busy.
export default {
  title: 'Forms / Menu Button',
};

const ITEMS: MenuButtonItem[] = [
  { key: 'edit', label: 'Edit Entry', href: '/?edit' as Route, onClick: (e) => e.preventDefault() },
  { key: 'annotate', label: 'Annotate', onSelect: () => {} },
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
