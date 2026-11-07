import { ListBodySkeleton, ListSkeleton } from './skeleton';
import EmptyState from '../EmptyState';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Pager from '../Pager';
import ListFrame, { ListBody, ListNavigationContext } from '.';

const meta = {
  title: 'Layout / List Frame',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const ROWS = ['Testwort', 'Fixture Salt', 'Mockroot'];

const List = () => (
  <ListFrame>
    <ListBody skeleton={null}>
      <div className="data-table-frame">
        <table className="data-table" aria-label="Fixtures">
          <thead>
            <tr>
              <th scope="col">Name</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((name) => (
              <tr key={name}>
                <td>{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager nextHref="?after=cursor" position={{ page: 1, pages: 2 }} soft />
    </ListBody>
  </ListFrame>
);

const defaultNode = <List />;

const pendingNode = (
  <ListNavigationContext.Provider value={{ pending: true, searching: false, go: () => undefined }}>
    <List />
  </ListNavigationContext.Provider>
);

const pendingCardsNode = (
  <ListNavigationContext.Provider value={{ pending: true, searching: false, go: () => undefined }}>
    <ListFrame className="card-list">
      <ListBody skeleton={<ListBodySkeleton label="Cards" />}>
        <p>Cards</p>
      </ListBody>
    </ListFrame>
  </ListNavigationContext.Provider>
);

// A whole list on its way: the filter row disabled over the placeholder rows, and over cards.
const loadingTableNode = (
  <ListSkeleton
    filter="Filter Groups"
    label="Groups"
    headings={['Name', 'Description']}
    count={4}
  />
);
const loadingCardsNode = (
  <ListSkeleton filter="Filter Spells" label="Spells" card="spell" density="compact" count={4} />
);

const emptyNode = (
  <ListFrame>
    <EmptyState label="No Groups" detail="A keeper can add one.">
      There are no groups yet.
    </EmptyState>
  </ListFrame>
);

const noMatchesNode = (
  <ListFrame>
    <EmptyState
      label="No Matches"
      detail="Widen the filters to see more."
      action={
        <a className="btn btn--quiet" href="?">
          Clear Filters
        </a>
      }
    >
      No groups match your filters.
    </EmptyState>
  </ListFrame>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Pending: pendingNode,
  'Pending Cards': pendingCardsNode,
  'Loading Table': loadingTableNode,
  'Loading Cards': loadingCardsNode,
  Empty: emptyNode,
  'No Matches': noMatchesNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
