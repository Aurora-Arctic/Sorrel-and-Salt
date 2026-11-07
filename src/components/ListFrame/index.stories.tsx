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
    <ListBody>
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
      <ListBody shape="cards">
        <p>Cards</p>
      </ListBody>
    </ListFrame>
  </ListNavigationContext.Provider>
);

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Pending: pendingNode,
  'Pending Cards': pendingCardsNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
