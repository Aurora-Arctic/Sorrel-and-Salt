import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import PrivilegeLedger from '.';
import { privilegeLedgerHref } from './href';
import type { PrivilegeLedgerEntry } from './types';

// Render-only; behaviour is asserted in tests/components/PrivilegeLedger.
// Invented people, on invented dates.
const meta = {
  title: 'Admin / Privilege Ledger',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ADA = { name: 'Ada Fixturewort', href: '/admin/users?query=ada%40users.test' };
const BRAM = { name: 'Bram Testwort', href: '/admin/users?query=bram%40users.test' };

const CHANGES: PrivilegeLedgerEntry[] = [
  {
    id: 'c1',
    at: new Date('2026-03-04T05:06:07Z'),
    subject: ADA,
    privilege: 'admin',
    change: 'grant',
    via: 'admin',
    actor: BRAM,
    note: 'Covering the spring audit while Bram is away.',
  },
  {
    id: 'c2',
    at: new Date('2026-03-04T05:06:07Z'),
    subject: ADA,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'admin',
    actor: BRAM,
    note: 'Covering the spring audit while Bram is away.',
  },
  {
    id: 'c3',
    at: new Date('2026-02-11T18:30:00Z'),
    subject: BRAM,
    privilege: 'create_workspace',
    change: 'grant',
    via: 'invitation',
    actor: BRAM,
    note: null,
  },
  {
    id: 'c4',
    at: new Date('2026-01-02T09:00:00Z'),
    subject: null,
    privilege: 'create_workspace',
    change: 'revoke',
    via: 'manual',
    actor: { name: 'Seed System User' },
    note: null,
  },
  {
    id: 'c6',
    at: new Date('2026-01-01T00:00:00Z'),
    subject: ADA,
    privilege: 'curator',
    change: 'grant',
    via: 'admin',
    actor: BRAM,
    note: null,
  },
  {
    id: 'c7',
    at: new Date('2025-12-20T00:00:00Z'),
    subject: ADA,
    privilege: 'admin',
    change: 'revoke',
    via: 'admin',
    actor: BRAM,
    note: 'Stepped down.',
  },
  {
    id: 'c8',
    at: new Date('2025-12-19T00:00:00Z'),
    subject: BRAM,
    privilege: 'curator',
    change: 'revoke',
    via: 'admin',
    actor: null,
    note: null,
  },
  {
    id: 'c5',
    at: new Date('2026-01-01T00:00:00Z'),
    subject: BRAM,
    privilege: 'admin',
    change: 'grant',
    via: 'bootstrap',
    actor: BRAM,
    note: null,
  },
];

const MIDDLE = { page: 2, pages: 3 };
const LAST = { page: 3, pages: 3 };

const firstPageNode = (
  <PrivilegeLedger
    changes={CHANGES}
    filter={{}}
    nextHref={privilegeLedgerHref({}, { after: 'cursor' })}
    position={{ page: 1, pages: 3 }}
  />
);

const middlePageNode = (
  <PrivilegeLedger
    changes={CHANGES}
    filter={{}}
    previousHref={privilegeLedgerHref({}, { before: 'cursor' })}
    nextHref={privilegeLedgerHref({}, { after: 'cursor' })}
    position={MIDDLE}
  />
);

const lastPageNode = (
  <PrivilegeLedger
    changes={CHANGES.slice(-2)}
    filter={{}}
    previousHref={privilegeLedgerHref({}, { before: 'cursor' })}
    position={LAST}
  />
);

const oneUserNode = (
  <PrivilegeLedger
    changes={CHANGES.filter((change) => change.subject === ADA)}
    filter={{ query: 'ada@users.test' }}
  />
);

const OneUserAdminOnlyView = () => (
  <PrivilegeLedger
    changes={CHANGES.filter((change) => change.subject === ADA && change.privilege === 'admin')}
    filter={{ query: 'ada@users.test', privilege: 'admin' }}
  />
);

const oneUserAdminOnlyNode = <OneUserAdminOnlyView />;

const emptyNode = <PrivilegeLedger changes={[]} filter={{}} />;

// A search no row in this file matches, so the empty state is true of the
// other stories' rows as well.
const noMatchesNode = (
  <PrivilegeLedger
    changes={[]}
    filter={{ query: 'cora@users.test', privilege: 'create_workspace' }}
  />
);

const LEDGER_STATES: Record<string, ReactNode> = {
  'First Page': firstPageNode,
  'Middle Page': middlePageNode,
  'Last Page': lastPageNode,
  'One User': oneUserNode,
  'One User Admin Only': oneUserAdminOnlyNode,
  Empty: emptyNode,
  'No Matches': noMatchesNode,
};

export const States: Story = {
  args: { state: 'First Page' },
  argTypes: {
    state: { control: 'select', options: Object.keys(LEDGER_STATES), mapping: LEDGER_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
