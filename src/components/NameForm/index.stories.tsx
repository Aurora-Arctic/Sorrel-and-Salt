import type { Story } from '@ladle/react';
import NameForm from '.';

// Render-only; behaviour is asserted in tests/components/NameForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.ladle/components.tsx).
export default {
  title: 'Forms / Name',
};

// Inside the account page's frame and section, as the page shows it.
const Section = ({ name }: { name: string }) => (
  <main className="account-page">
    <section className="account-page__section" aria-labelledby="name-story-heading">
      <h2 id="name-story-heading" className="account-page__section-heading">
        Name
      </h2>
      <NameForm name={name} />
    </section>
  </main>
);

// The usual visit: the name the provider gave, nothing to save until edited.
export const Prefilled: Story = () => <Section name="Ada Fixture" />;

// A long name, to see the field hold it.
export const LongName: Story = () => (
  <Section name="Adelheid Wilhelmina Fixture-Testwort of the Lower Fixture Coven" />
);
