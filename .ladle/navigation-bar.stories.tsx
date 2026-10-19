import type { Story } from '@ladle/react';
import '../src/lib/navigation/navigation-bar.scss';

// The page bar's look, as static markup: the component's own timers and the
// navigation store are not needed to see how it is drawn. It sits along the
// bottom edge of the global bar, as it does in the app.
export default {
  title: 'Feedback / Navigation Bar',
};

export const Shown: Story = () => <div className="navigation-bar" aria-hidden="true" />;

// `hidden` and `data-leaving` together, the 150ms fade-out; reload to see it.
export const Leaving: Story = () => (
  <div className="navigation-bar" aria-hidden="true" hidden data-leaving="" />
);
