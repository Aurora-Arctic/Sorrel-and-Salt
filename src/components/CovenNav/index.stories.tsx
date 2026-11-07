import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { WorkshopPathname } from '../../../.storybook/navigation';
import CovenNav from '.';

const meta = {
  title: 'Coven / Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const at = (path: string, canReadMembers = false) => (
  <WorkshopPathname.Provider value={path}>
    <CovenNav slug="fixture-coven" canReadMembers={canReadMembers} />
  </WorkshopPathname.Provider>
);

export const States: Story = {
  render: () => (
    <StatesGrid
      states={{
        'Overview Current': at('/coven/fixture-coven', true),
        'Ingredients Current': at('/coven/fixture-coven/ingredients', true),
        'Members Current': at('/coven/fixture-coven/members', true),
        'Members Current On Its Invitations Tab': at('/coven/fixture-coven/invitations', true),
        Viewer: at('/coven/fixture-coven'),
      }}
    />
  ),
};
