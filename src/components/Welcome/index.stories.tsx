import type { Story } from '@ladle/react';
import Welcome from '.';

// Render-only; behaviour is asserted in tests/components/Welcome. The page
// decides `signedIn` from the session; a story fixes it by hand.
export default {
  title: 'Welcome',
};

// What every signed-out visitor sees at `/`.
export const Default: Story = () => <Welcome signedIn={false} />;

// The same page for a visitor with a live session: the way in is the landing.
export const SignedIn: Story = () => <Welcome signedIn />;
