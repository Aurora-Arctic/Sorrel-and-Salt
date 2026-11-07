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
  CauldronIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CompleteIcon,
  CompendiumEditLink,
  CopyIcon,
  CrossIcon,
  DotsIcon,
  EditLink,
  LinkIcon,
  MoreMenu,
  MysticEyeIcon,
  PencilIcon,
  PlusIcon,
  PreviewIcon,
  PrintIcon,
  QuickLookButton,
  QuickLookLink,
  RedoIcon,
  UndoIcon,
} from '.';
// From its own file, not the index: the design sync's library carries StockBadge's StockIcon
// under this name.
import { StockIcon } from './icons';

const meta = {
  title: 'Forms / Icon Tip',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = ['Fixture Salt', 'Testwort', 'Fixture Ash'].map((name) => ({
  name,
  description: 'An invented entry, for the workshop.',
}));

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
    <ListBody skeleton={null}>
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
  Cauldron: CauldronIcon,
  Check: CheckIcon,
  Chevron: ChevronIcon,
  Close: CloseIcon,
  Complete: CompleteIcon,
  Copy: CopyIcon,
  Cross: CrossIcon,
  Dots: DotsIcon,
  Link: LinkIcon,
  'Mystic Eye': MysticEyeIcon,
  Pencil: PencilIcon,
  Plus: PlusIcon,
  Preview: PreviewIcon,
  Print: PrintIcon,
  Redo: RedoIcon,
  Stock: StockIcon,
  Undo: UndoIcon,
};

const NOOP = (): void => undefined;
const HEADING = { title: 'Testwort' };

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
