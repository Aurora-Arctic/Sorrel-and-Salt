import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { EditLink } from '.';

// Render-only; behaviour is asserted in tests/components/IconTip. Hover or
// focus a pencil to open its tip; Escape closes it. The rows are a list's
// banded table, so the pencil shows on both of its grounds, the page and the
// card. The ingredient form's smaller pencils are drawn in its own stories.
export default {
  title: 'Admin / Icon Tip',
};

const ROWS = ['Fixture Salt', 'Testwort', 'Fixture Ash'];

const Rows = (): ReactElement => (
  <div className="data-table-frame" style={{ marginTop: '2rem' }}>
    <table className="data-table data-table--stack" aria-label="Invented entries">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">
            <span className="visually-hidden">Edit</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((name) => (
          <tr key={name}>
            <td data-label="Name">{name}</td>
            <td className="data-table__card-action" data-label="">
              <EditLink href={`#edit-${name}`} name={name} heading={{ title: name }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const InAListRow: Story = () => <Rows />;

// A phone's width, in each theme: each row a card, the pencil at its top right.
export const PhoneDark: Story = () => <Rows />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Rows />;
PhoneLight.meta = { theme: 'light', width: 375 };
