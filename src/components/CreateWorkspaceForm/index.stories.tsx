import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import CreateWorkspaceForm from '.';

// Render-only; behaviour is asserted in tests/components/CreateWorkspaceForm.
// The component talks to the network only on submit, so nothing is mocked: a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Coven / Create Coven Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Inside the page's frame and head, as src/app/(shell)/coven/new/page.tsx writes
// them, so the workshop shows what the page shows.
const Page = () => (
  <main className="page-frame page-frame--narrow">
    <div className="page-frame__section panel">
      <div className="header">
        <h1>Create Coven</h1>
        <p className="lede">Start a coven of your own. You will be its owner.</p>
      </div>
      <CreateWorkspaceForm />
    </div>
  </main>
);

// The usual visit: an empty name, nothing to create until one is typed.
export const Default: Story = { render: () => <Page /> };
