import type { Story } from '@ladle/react';
import SectionBody from '.';

// Render-only; behaviour is asserted in tests/components/SectionBody. At rest it
// shows its page; the skeleton stands in only while a navigation aimed at the
// section is on its way, and the Skeleton's own stories draw that.
export default {
  title: 'Shell / Section Body',
};

export const AtRest: Story = () => (
  <SectionBody region="coven" className="coven-layout">
    <main>
      <h1>Ingredients</h1>
      <p>Testwort</p>
    </main>
  </SectionBody>
);
