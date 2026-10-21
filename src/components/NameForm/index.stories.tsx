import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NameForm from '.';

// Render-only; behaviour is asserted in tests/components/NameForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.storybook/components.tsx).
const meta = {
  title: 'Account / Name Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// Inside the account page's frame and section, on its panel, as
// src/app/(shell)/account/page.tsx writes them, so the workshop shows what the page
// shows.
const Section = ({ name }: { name: string }) => (
  <main className="page-frame page-frame--narrow">
    <section className="page-frame__section panel" aria-labelledby="name-story-heading">
      <div className="header">
        <h2 id="name-story-heading">Name</h2>
        <p className="lede">The name Sorrel &amp; Salt shows for you.</p>
      </div>
      <NameForm name={name} />
    </section>
  </main>
);

// The usual visit: the name the provider gave, nothing to save until edited.
export const Default: Story = { render: () => <Section name="Ada Fixture" /> };

// A long name, to see the field hold it.
export const LongName: Story = {
  render: () => <Section name="Adelheid Wilhelmina Fixture-Testwort of the Lower Fixture Coven" />,
};
