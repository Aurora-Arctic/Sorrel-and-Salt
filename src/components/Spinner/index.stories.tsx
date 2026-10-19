import type { Story } from '@ladle/react';
import Spinner from '.';

// Render-only; the spinner is hidden from assistive technology, and the
// controls that hold it assert their busy state. It shows after 100ms, so a
// story reload shows it appear.
export default {
  title: 'Feedback / Spinner',
};

export const Default: Story = () => (
  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <Spinner /> Saving Name
  </p>
);

export const Larger: Story = () => (
  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem' }}>
    <Spinner /> Loading
  </p>
);
