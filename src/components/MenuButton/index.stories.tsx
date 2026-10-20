import type { Story } from '@ladle/react';
import type { Route } from 'next';
import MenuButton from '.';
import { sectionsFor } from './sections';
import type { MenuButtonItem } from './types';

// Render-only; the keys and the closing are asserted in
// tests/components/MenuButton/index.test.tsx. The entry page's More menu, a
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
    <MenuButton label="More" className="btn btn--quiet" items={ITEMS.slice(2)} buttonType />
  </p>
);

export const OpensAbove: Story = () => <Foot />;

// The plus's menu of covens (M9.12): a coven that holds the entry is disabled, its name followed
// by the green check (`mark`) and named "Fixture Coven Two, already added".
export const MarkedItem: Story = () => (
  <p style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '10rem' }}>
    <MenuButton
      label="Add to My Ingredients"
      className="btn btn--quiet btn--medium"
      items={[
        { key: 'one', label: 'Fixture Coven One', onSelect: () => {} },
        {
          key: 'two',
          label: 'Fixture Coven Two',
          onSelect: () => {},
          disabled: true,
          mark: 'already added',
        },
      ]}
    />
  </p>
);

// Sections (the owner's call, 2026-10-20): a menu holding both the compendium's choices and the
// coven's draws them under discreet headings, the viewer's own side first. Set on a coven's page
// (Coven first) and on a compendium page (Compendium first).
const SECTIONED = {
  compendium: [{ key: 'edit', label: 'Edit in Compendium', onSelect: () => {} }],
  coven: [
    { key: 'own', label: 'Make It Ours', onSelect: () => {} },
    { key: 'remove', label: 'Remove', destructive: true, onSelect: () => {} },
  ],
};

const SectionedRow = ({ viewing }: { viewing: 'compendium' | 'coven' }) => (
  <p style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>
    <MenuButton
      label="More"
      className="btn btn--quiet btn--medium"
      sections={sectionsFor(SECTIONED, viewing)}
    />
  </p>
);

export const SectionedOnACovenPage: Story = () => <SectionedRow viewing="coven" />;

export const SectionedOnACompendiumPage: Story = () => <SectionedRow viewing="compendium" />;
