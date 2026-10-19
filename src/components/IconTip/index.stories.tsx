import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import ListFrame, { ListBody } from '../ListFrame';
import { CopyIcon, EditLink, LinkIcon, PencilIcon, PlusIcon, RedoIcon, UndoIcon } from '.';

// Render-only; behaviour is asserted in tests/components/IconTip. Hover or
// focus a pencil to open its tip; Escape closes it. The rows are a list's
// banded table, so the pencil shows on both of its grounds, the page and the
// card. The ingredient form's smaller pencils are drawn in its own stories.
export default {
  title: 'Layout / Icon Tip',
};

const ROWS = ['Fixture Salt', 'Testwort', 'Fixture Ash'].map((name) => ({
  name,
  description: 'An invented entry, for the workshop.',
}));

// The columns an admin list has: the labels, then the pencil in its own,
// unlabelled, at the row's end (a card's top right at a phone's width).
const COLUMNS: StackColumn<(typeof ROWS)[number]>[] = [
  { heading: 'Name', cell: (row) => row.name },
  { heading: 'Description', cell: (row) => row.description },
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    cell: (row) => (
      <EditLink href={`#edit-${row.name}`} name={row.name} heading={{ title: row.name }} />
    ),
  },
];

const Rows = (): ReactElement => (
  <ListFrame>
    <ListBody>
      <StackTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.name}
        empty=""
        aria-label="Invented entries"
      />
    </ListBody>
  </ListFrame>
);

// Every glyph the wrapper's icons file draws, at the icon button's glyph size:
// the history pair, Restore Original and Copy From Ingredient use undo, redo
// and copy.
export const Glyphs: Story = () => (
  <p style={{ display: 'flex', gap: '1rem', fontSize: '1rem' }}>
    {[CopyIcon, LinkIcon, PencilIcon, PlusIcon, RedoIcon, UndoIcon].map((Glyph, at) => (
      <Glyph key={at} />
    ))}
  </p>
);

export const InAListRow: Story = () => <Rows />;

// A phone's width, in each theme: each row a card, the pencil at its top right.
export const PhoneDark: Story = () => <Rows />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Rows />;
PhoneLight.meta = { theme: 'light', width: 375 };
