import type { Story } from '@ladle/react';
import CardDensitySwitch from '.';

// Render-only; the attribute and the stored choice are asserted in tests/components/CardDensitySwitch.
export default {
  title: 'Ingredients / Card Density Switch',
};

// On by default. Toggling it sets `data-card-density` on the story frame's <html>
// and writes localStorage, so it persists across stories until cleared.
export const Default: Story = () => <CardDensitySwitch />;
