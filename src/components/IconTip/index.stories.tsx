import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import ListFrame, { ListBody } from '../ListFrame';
import { StatesGrid } from '../../../.storybook/states-grid';
import {
  AnnotateButton,
  AnnotateIcon,
  AnnotateLink,
  BinButton,
  BinIcon,
  CheckIcon,
  CompendiumEditLink,
  CopyIcon,
  DotsIcon,
  EditLink,
  LinkIcon,
  MoreMenu,
  MysticEyeIcon,
  PencilIcon,
  PlusIcon,
  QuickLookButton,
  QuickLookLink,
  RedoIcon,
  StockIcon,
  UndoIcon,
} from '.';

// Render-only; behaviour is asserted in tests/components/IconTip. Hover or focus
// a pencil to open its tip; Escape closes it. The rows are a list's banded table,
// so the pencil shows on both grounds, the page and the card.
const meta = {
  title: 'Forms / Icon Tip',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = ['Fixture Salt', 'Testwort', 'Fixture Ash'].map((name) => ({
  name,
  description: 'An invented entry, for the workshop.',
}));

// An admin list's columns: the name with its Quick Look eye, the labels, then an
// unlabelled pencil at the row's end (a card's top right at phone width).
const COLUMNS: StackColumn<(typeof ROWS)[number]>[] = [
  {
    heading: 'Name',
    cell: (row) => (
      <>
        {row.name}{' '}
        <QuickLookLink href={`#look-${row.name}`} name={row.name} heading={{ title: row.name }} />
      </>
    ),
  },
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

const GLYPHS = {
  Annotate: AnnotateIcon,
  Bin: BinIcon,
  Check: CheckIcon,
  Copy: CopyIcon,
  Dots: DotsIcon,
  Link: LinkIcon,
  'Mystic Eye': MysticEyeIcon,
  Pencil: PencilIcon,
  Plus: PlusIcon,
  Redo: RedoIcon,
  Stock: StockIcon,
  Undo: UndoIcon,
};

const NOOP = (): void => undefined;
const HEADING = { title: 'Testwort' };

// Every glyph the wrapper's icons file draws at the icon button's glyph size,
// then every control that wears one with its tip: the links, the buttons, and
// the three dots' menu in its Compendium and Coven sections.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="12rem"
      states={{
        ...Object.fromEntries(
          Object.entries(GLYPHS).map(([name, Glyph]) => [
            `${name} Icon`,
            <p key={name} style={{ fontSize: '1rem' }}>
              <Glyph />
            </p>,
          ]),
        ),
        'Edit Link': <EditLink href="#edit" name="Testwort" heading={HEADING} />,
        'Compendium Edit Link': (
          <CompendiumEditLink href="#edit" name="Testwort" heading={HEADING} />
        ),
        'Annotate Link': <AnnotateLink href="#annotate" name="Testwort" heading={HEADING} />,
        'Quick Look Link': <QuickLookLink href="#look" name="Testwort" heading={HEADING} />,
        'Bin Button': <BinButton verb="Delete Ingredient" name="Testwort" onClick={NOOP} />,
        'Annotate Button': <AnnotateButton name="Testwort" onClick={NOOP} />,
        'Quick Look Button': <QuickLookButton name="Testwort" onClick={NOOP} />,
        'More Menu': (
          <MoreMenu
            name="Testwort"
            sections={[
              {
                key: 'compendium',
                label: 'Compendium',
                items: [
                  { key: 'edit', label: 'Edit in Compendium', onSelect: NOOP, primary: true },
                ],
              },
              {
                key: 'coven',
                label: 'Coven',
                items: [
                  { key: 'annotate', label: 'Annotate', onSelect: NOOP },
                  { key: 'remove', label: 'Remove', onSelect: NOOP, destructive: true },
                ],
              },
            ]}
          />
        ),
      }}
    />
  ),
};

export const InAListRow: Story = { render: () => <Rows /> };
