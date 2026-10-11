import type { Story } from '@ladle/react';
import NameForm from '.';

// Render-only; behaviour is asserted in tests/components/NameForm. The
// component talks to the network only on submit, so nothing is mocked — a
// submit in the workshop fails into the alert region. The TanStack Query
// client comes from the workshop's global provider (.ladle/components.tsx).
export default {
  title: 'Forms / Name',
};

// Inside the account page's frame and section, as src/app/account/page.tsx
// writes them, so the workshop shows what the page shows.
const Section = ({ name }: { name: string }) => (
  <main className="page-frame page-frame--narrow">
    <section className="page-frame__section" aria-labelledby="name-story-heading">
      <div className="header">
        <h2 id="name-story-heading">Name</h2>
        <p className="lede">Change your name.</p>
      </div>
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

// At a phone's width, in each theme.
export const PhoneDark: Story = () => <Section name="Ada Fixture" />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Section name="Ada Fixture" />;
PhoneLight.meta = { theme: 'light', width: 375 };
