import type { Story } from '@ladle/react';
import JarLines from '.';

// Render-only; the lines and their badges are asserted in tests/components/JarLines. On a card the
// card's own styles lay the list out (see Ingredient Card), so these are the bare markup.
export default {
  title: 'Ingredients / Jar Lines',
};

export const Default: Story = () => (
  <JarLines
    jars={[
      { id: 'a', form: 'dried leaf', icon: 'botanical', quantity: 6, unit: 'g', threshold: 10 },
      { id: 'b', form: 'oil', icon: 'fluid', quantity: 0, unit: 'ml', threshold: 10 },
      { id: 'c', form: 'powder', icon: null, quantity: 40, unit: 'g', threshold: 10 },
      { id: 'd', form: 'resin', icon: null, quantity: null, unit: null, threshold: null },
    ]}
  />
);

// A member's lines: each ends in Edit Stock.
export const Editable: Story = () => (
  <JarLines
    edit={{ workspaceId: 'workshop', ingredient: 'Testwort' }}
    jars={[
      { id: 'a', form: 'dried leaf', icon: 'botanical', quantity: 6, unit: 'g', threshold: 10 },
      { id: 'd', form: 'resin', icon: null, quantity: null, unit: null, threshold: null },
    ]}
  />
);
