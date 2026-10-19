import type { Story } from '@ladle/react';
import CovenBody from '.';

// Render-only; behaviour is asserted in tests/components/CovenBody. At rest it
// shows its page; the skeleton stands in only while a navigation aimed at the
// coven is on its way, and the Skeleton's own stories draw that.
export default {
  title: 'Shell / Coven Body',
};

export const AtRest: Story = () => (
  <CovenBody>
    <main>
      <h1>Ingredients</h1>
      <p>Testwort</p>
    </main>
  </CovenBody>
);
