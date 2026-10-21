import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WorkshopPathname } from '../../../.storybook/navigation';
import CovenNav from '.';

// Render-only; behaviour is asserted in tests/components/CovenNav. The
// workshop's `usePathname` stub answers whatever the wrapping provider says.
const meta = {
  title: 'Coven / Nav',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// On the coven index, as a member sees it: Overview is the current section,
// Members beside it. The shapes the nav takes by width are SectionNav's stories.
export const Default: Story = {
  render: () => (
    <WorkshopPathname.Provider value="/coven/fixture-coven">
      <CovenNav slug="fixture-coven" canReadMembers />
    </WorkshopPathname.Provider>
  ),
};

// As a viewer sees it: their role may not read the members, so no Members.
export const Viewer: Story = {
  render: () => (
    <WorkshopPathname.Provider value="/coven/fixture-coven">
      <CovenNav slug="fixture-coven" />
    </WorkshopPathname.Provider>
  ),
};
