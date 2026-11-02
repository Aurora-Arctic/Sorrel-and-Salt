import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AccessCards from '.';
import type { AccessRole, AccessRow } from './types';

// Render-only; the cards' reading and contents are asserted in tests/components/AccessCards.
const meta = { title: 'Pages / Access Cards', component: AccessCards } satisfies Meta<
  typeof AccessCards
>;
export default meta;

const ROLES: AccessRole[] = [
  { name: 'Fixture Owner', short: 'Own' },
  { name: 'Fixture Member', short: 'Mem' },
  { name: 'Fixture Viewer', short: 'View' },
  { name: 'Fixture Curator', short: 'Cur' },
  { name: 'Fixture Admin', short: 'Adm' },
  { name: 'A Fixture with Database Access', short: 'Dev' },
];

const ROWS: AccessRow[] = [
  {
    data: 'Your fixture name',
    cells: [
      { mark: 'yes', text: 'Yes, for everyone in the fixture' },
      { mark: 'yes', text: 'Yes, for everyone in the fixture' },
      { mark: 'no', text: 'No: a viewer does not see the fixture roll' },
      { mark: 'yes', text: 'Yes, as the name beside a fixture edit' },
      { mark: 'yes', text: 'Yes, for every account' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
  {
    data: 'Your fixture secret',
    cells: [
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      { mark: 'no', text: 'No' },
      {
        mark: 'part',
        text: 'Only in a locked form: the fixture keeps a scrambled copy and never the secret itself',
      },
    ],
  },
  {
    data: 'A private fixture',
    cells: [
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'part', text: 'Only your own' },
      { mark: 'no', text: 'No' },
      { mark: 'part', text: 'Only their own, in the demo fixture' },
      { mark: 'yes', text: 'Yes' },
    ],
  },
];

export const Default: StoryObj<typeof AccessCards> = {
  args: { roles: ROLES, rows: ROWS },
};
