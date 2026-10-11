import type { Story } from '@ladle/react';
import Pager from '../Pager';
import ListFrame, { ListBody, ListNavigationContext } from '.';

// Render-only; behaviour is asserted where a list uses it, in the tests of
// CompendiumList (soft), UserList (full) and Pager. A list's
// frame and body around a small table and its pager; `Pending` holds a page
// on its way, through a navigation provided above the frame, since the
// workshop's router goes nowhere. A whole list on its way, filter row and
// all, is GroupedValueList's `CategoriesPending` and its phone pair.
export default {
  title: 'Layout / List Frame',
};

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

export const Default: Story = () => <List />;

export const Pending: Story = () => (
  <ListNavigationContext.Provider value={{ pending: true, go: () => undefined }}>
    <List />
  </ListNavigationContext.Provider>
);
