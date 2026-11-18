import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TableFrame from '.';

const meta = {
  title: 'Layout / Table Frame',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Wide: Story = {
  render: () => (
    <div style={{ maxWidth: '20rem' }}>
      <TableFrame label="Fixtures">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Nomenclature</th>
              <th scope="col">Forms</th>
              <th scope="col">Categories</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Testwort</td>
              <td>Formal</td>
              <td>Herb, Oil</td>
              <td>Calming</td>
            </tr>
          </tbody>
        </table>
      </TableFrame>
    </div>
  ),
};
